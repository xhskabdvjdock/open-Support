"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MonitorUp, ShieldCheck } from "lucide-react";
import { captureFrameFromVideo, frameSignature, isScreenCaptureSupported, signatureDiff } from "@/lib/capture";
import { deleteSession, listSessions, saveSession, uid } from "@/lib/store";
import type {
  AiStatus,
  AnalyzeAction,
  CapturedFrame,
  ChatMessage,
  PersistedSession,
  SessionState,
  TimelineEvent,
} from "@/lib/types";
import { useLocale } from "@/lib/useLocale";
import type { Strings } from "@/lib/i18n";
import Sidebar from "./Sidebar";
import ScreenPane from "./ScreenPane";
import ChatPane from "./ChatPane";
import StatusBar from "./StatusBar";
import PrivacyModal from "./PrivacyModal";
import SettingsModal from "./SettingsModal";
import DocsModal from "./DocsModal";
import LanguageToggle from "./LanguageToggle";

const MAX_FRAMES_IN_MEMORY = 4;
const CHANGE_THRESHOLD = 0.08;
const CHANGE_COOLDOWN_MS = 10_000;
const AUTO_CAPTURE_MAX_AGE_MS = 30_000;

interface Health {
  groqReady: boolean | null;
  visionModel: string | null;
  textModel: string | null;
}

async function readApiError(res: Response, t: Strings): Promise<string> {
  try {
    const data = (await res.json()) as { error?: { code?: string; message?: string } };
    const code = data?.error?.code ?? "";
    const message = data?.error?.message ?? "";
    if (code === "invalid_api_key" || code === "missing_api_key") {
      return t.errors.aiNotConfigured;
    }
    if (code === "rate_limited") return message || t.errors.rateLimited;
    return message || `Request failed (${res.status}). Try again.`;
  } catch {
    return `Request failed (${res.status}). Try again.`;
  }
}

export default function Workspace() {
  const { locale, toggleLocale, t } = useLocale();
  const [hasSession, setHasSession] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [aiStatus, setAiStatus] = useState<AiStatus>("waiting-input");
  const [sharing, setSharing] = useState(false);
  const [frames, setFrames] = useState<CapturedFrame[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [input, setInput] = useState("");
  const [technicalMode, setTechnicalMode] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captureInfo, setCaptureInfo] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [health, setHealth] = useState<Health>({ groqReady: null, visionModel: null, textModel: null });
  const [supported, setSupported] = useState<boolean | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [sessions, setSessions] = useState<PersistedSession[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sigRef = useRef<number[] | null>(null);
  const lastChangeEventRef = useRef(0);
  const changedSinceCaptureRef = useRef(false);
  const lastCaptureAtRef = useRef(0);
  const changeTimerRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const summaryForRef = useRef(0);
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const tRef = useRef(t);
  tRef.current = t;
  const stateRef = useRef({ sharing: false, messages: [] as ChatMessage[], summary: null as string | null, technicalMode: false, frames: [] as CapturedFrame[] });
  stateRef.current = { sharing, messages, summary, technicalMode, frames };

  const busy = aiStatus === "analyzing" || aiStatus === "thinking";

  const pushTimeline = useCallback((kind: TimelineEvent["kind"], label: string) => {
    setTimeline((prev) => [...prev.slice(-99), { id: uid("ev"), at: new Date().toISOString(), kind, label }]);
  }, []);

  // Runs once on mount: browser capability detection, persisted sessions,
  // and server health must read client-only APIs (navigator, localStorage),
  // so they cannot run during render or prerender.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(isScreenCaptureSupported());
    setSessions(listSessions());
    const SR = (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    setVoiceSupported(Boolean(SR) || "speechSynthesis" in window);
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: { groqReady?: boolean; groqConfigured?: boolean; visionModel?: string; textModel?: string }) =>
        setHealth({
          groqReady: d.groqReady ?? d.groqConfigured ?? null,
          visionModel: d.visionModel ?? null,
          textModel: d.textModel ?? null,
        }),
      )
      .catch(() => setHealth((h) => ({ ...h, groqReady: false })));
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  // ---- persist active session (messages + timeline only, never frames) ----
  useEffect(() => {
    if (!hasSession || !sessionId || !sessionStartedAt) return;
    const timer = setTimeout(() => {
      saveSession({
        id: sessionId,
        createdAt: sessionStartedAt,
        updatedAt: new Date().toISOString(),
        durationMs: Date.now() - new Date(sessionStartedAt).getTime(),
        status: sessionState,
        messageCount: messages.length,
        messages,
        timeline,
        summary,
        technicalMode,
      });
      setSessions(listSessions());
    }, 800);
    return () => clearTimeout(timer);
  }, [hasSession, sessionId, sessionStartedAt, sessionState, messages, timeline, summary, technicalMode]);

  // ---- change detection loop (event logging only, never triggers API calls) ----
  useEffect(() => {
    if (!sharing) return;
    sigRef.current = null;
    const id = window.setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      const sig = frameSignature(video);
      if (!sig) return;
      const prev = sigRef.current;
      sigRef.current = sig;
      if (!prev) return;
      const diff = signatureDiff(prev, sig);
      const now = Date.now();
      if (diff > CHANGE_THRESHOLD && now - lastChangeEventRef.current > CHANGE_COOLDOWN_MS) {
        lastChangeEventRef.current = now;
        changedSinceCaptureRef.current = true;
        pushTimeline("screen-changed", tRef.current.timeline.screenChanged);
      }
    }, 2000);
    changeTimerRef.current = id;
    return () => {
      window.clearInterval(id);
      changeTimerRef.current = null;
    };
  }, [sharing, pushTimeline]);

  const startSession = useCallback(() => {
    const id = uid("sess");
    const now = new Date().toISOString();
    setSessionId(id);
    setSessionStartedAt(now);
    setHasSession(true);
    setMessages([]);
    setTimeline([]);
    setFrames([]);
    setSummary(null);
    setError(null);
    setCaptureInfo(null);
    setInput("");
    setSessionState("idle");
    setAiStatus("waiting-input");
    summaryForRef.current = 0;
    changedSinceCaptureRef.current = false;
    pushTimeline("session-start", tRef.current.timeline.sessionStart);
  }, [pushTimeline]);

  const newSession = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setSharing(false);
    startSession();
  }, [startSession]);

  const stopSharing = useCallback(
    (reason: "user" | "browser-ended") => {
      const tt = tRef.current;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setSharing(false);
      setSessionState("stopped");
      setAiStatus((s) => (s === "analyzing" || s === "thinking" ? s : "waiting-input"));
      pushTimeline("stopped", reason === "user" ? tt.timeline.stoppedUser : tt.timeline.stoppedBrowser);
      setCaptureInfo(null);
    },
    [pushTimeline],
  );

  const confirmStartSharing = useCallback(async () => {
    const tt = tRef.current;
    setPrivacyOpen(false);
    setError(null);
    if (!isScreenCaptureSupported()) {
      setError(tt.errors.sharingUnsupported);
      setSessionState("error");
      setAiStatus("error");
      pushTimeline("error", tt.timeline.error);
      return;
    }
    setSessionState("starting");
    // Let the UI paint "Starting" before the browser permission dialog appears.
    await new Promise((r) => setTimeout(r, 50));
    setSessionState("waiting-permission");
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 10, max: 15 } },
        audio: false,
      });
      if (!stream.getVideoTracks().length) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error(tt.errors.noVideoTrack);
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => stopSharing("browser-ended");
      });
      setSharing(true);
      setSessionState("sharing");
      setAiStatus("ready");
      pushTimeline("sharing", tt.timeline.sharing);
    } catch (e) {
      const err = e as Error & { name?: string };
      const ttt = tRef.current;
      if (err?.name === "NotAllowedError") {
        setError(ttt.errors.permissionDenied);
        pushTimeline("error", ttt.timeline.error);
      } else if (err?.name === "NotFoundError" || err?.name === "AbortError") {
        setError(ttt.errors.selectionCancelled);
        pushTimeline("error", ttt.timeline.error);
      } else {
        setError(err?.message || ttt.errors.sharingFailed);
        pushTimeline("error", ttt.timeline.error);
      }
      setSessionState("error");
      setAiStatus("error");
    }
  }, [pushTimeline, stopSharing]);

  const doCapture = useCallback(
    (kind: "manual" | "auto"): CapturedFrame | null => {
      const tt = tRef.current;
      const video = videoRef.current;
      if (!video || !streamRef.current) {
        setError(tt.errors.noLiveScreen);
        return null;
      }
      try {
        const shot = captureFrameFromVideo(video);
        const frame: CapturedFrame = { id: uid("fr"), at: new Date().toISOString(), label: kind === "manual" ? "Manual capture" : "Auto capture", ...shot };
        setFrames((f) => [...f.slice(-(MAX_FRAMES_IN_MEMORY - 1)), frame]);
        lastCaptureAtRef.current = Date.now();
        changedSinceCaptureRef.current = false;
        setCaptureInfo(
          `${tt.misc.capturedAt} ${shot.width}x${shot.height} JPEG (${(shot.bytes / 1024).toFixed(0)} KB) ${tt.misc.jpegAt} ${new Date().toLocaleTimeString()}.`,
        );
        pushTimeline("capture", kind === "manual" ? tt.timeline.captureManual : tt.timeline.captureAuto);
        return frame;
      } catch {
        setError(tt.errors.captureFailed);
        pushTimeline("error", tt.timeline.error);
        return null;
      }
    },
    [pushTimeline],
  );

  const maybeAutoSummarize = useCallback(
    async (msgs: ChatMessage[]) => {
      if (msgs.length < 16 || msgs.length - summaryForRef.current < 8 || busyRef.current) return;
      summaryForRef.current = msgs.length;
      try {
        const res = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "summarize",
            conversation: msgs.filter((m) => m.role !== "system"),
            technicalMode: stateRef.current.technicalMode,
            language: localeRef.current,
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { result?: string };
        if (data.result) {
          setSummary(data.result);
          pushTimeline("summary", tRef.current.timeline.summary);
        }
      } catch {
        // Summarization is best-effort; the session works without it.
      }
    },
    [pushTimeline],
  );

  const runAnalyze = useCallback(
    async (action: AnalyzeAction) => {
      if (busyRef.current) return;
      const tt = tRef.current;
      let current: CapturedFrame | null = stateRef.current.frames[stateRef.current.frames.length - 1] ?? null;
      const previous: CapturedFrame | null = stateRef.current.frames[stateRef.current.frames.length - 2] ?? null;
      const textOnlySummarize = action === "summarize" && stateRef.current.messages.length > 0 && !current;

      if (action === "what-changed" && !previous) {
        setError(tt.errors.compareNeedsTwo);
        return;
      }
      if (!current && !textOnlySummarize) {
        if (!stateRef.current.sharing) {
          setError(
            action === "summarize"
              ? tt.errors.nothingToSummarize
              : tt.errors.noFrameShareFirst,
          );
          return;
        }
        current = doCapture("auto");
        if (!current) return;
      }

      busyRef.current = true;
      setError(null);
      setSessionState("analyzing");
      setAiStatus("analyzing");
      try {
        const res = await fetch("/api/ai/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            image: textOnlySummarize ? undefined : current?.dataUrl,
            previousImage: action === "what-changed" ? previous?.dataUrl : undefined,
            conversation: stateRef.current.messages.filter((m) => m.role !== "system").slice(-6),
            technicalMode: stateRef.current.technicalMode,
            summary: stateRef.current.summary,
            language: localeRef.current,
          }),
        });
        if (!res.ok) throw new Error(await readApiError(res, tRef.current));
        const data = (await res.json()) as { result?: string };
        const text = data.result?.trim();
        if (!text) throw new Error(tRef.current.errors.analysisEmpty);
        const assistant: ChatMessage = {
          id: uid("m"),
          role: "assistant",
          content: text,
          at: new Date().toISOString(),
          groundedInScreen: Boolean(current),
        };
        setMessages((m) => {
          const next = [...m, assistant];
          void maybeAutoSummarize(next);
          return next;
        });
        pushTimeline(action === "what-changed" ? "compare" : "analysis", action === "what-changed" ? tt.timeline.compare : tt.timeline.analysis);
        setSessionState(stateRef.current.sharing ? "sharing" : "ready");
        setAiStatus("ready");
      } catch (e) {
        setError((e as Error).message || tRef.current.errors.analysisFailed);
        setAiStatus("error");
        setSessionState(stateRef.current.sharing ? "sharing" : "error");
        pushTimeline("error", tRef.current.timeline.error);
      } finally {
        busyRef.current = false;
      }
    },
    [doCapture, maybeAutoSummarize, pushTimeline],
  );

  const sendChat = useCallback(
    async (overrideText?: string, regenerate = false) => {
      if (busyRef.current) return;
      const s = stateRef.current;
      let history = s.messages;
      if (regenerate) {
        const lastUserIdx = [...history].reverse().findIndex((m) => m.role === "user");
        if (lastUserIdx === -1) return;
        const lastAssistantIdx = [...history].reverse().findIndex((m) => m.role === "assistant");
        if (lastAssistantIdx !== -1) {
          const removeId = [...history].reverse()[lastAssistantIdx]?.id;
          history = history.filter((m) => m.id !== removeId);
          setMessages(history);
        }
      }
      const question = (overrideText ?? input).trim();
      if (!question) return;

      // Intelligent frame capture: refresh the frame when asking with a live
      // screen that has no frame, changed since capture, or is older than 30s.
      let currentFrame = s.frames[s.frames.length - 1]?.dataUrl ?? null;
      if (s.sharing) {
        const stale = Date.now() - lastCaptureAtRef.current > AUTO_CAPTURE_MAX_AGE_MS;
        if (!currentFrame || changedSinceCaptureRef.current || stale) {
          const fresh = doCapture("auto");
          if (fresh) currentFrame = fresh.dataUrl;
        }
      }

      const userMsg: ChatMessage = { id: uid("m"), role: "user", content: question, at: new Date().toISOString() };
      const base = regenerate ? history : [...history, userMsg];
      if (!regenerate) {
        setMessages(base);
        setInput("");
        pushTimeline("chat", tRef.current.timeline.chat);
      }
      setError(null);
      busyRef.current = true;
      setSessionState("thinking");
      setAiStatus("thinking");

      const assistantId = uid("m");
      setMessages((m) => [
        ...m,
        { id: assistantId, role: "assistant", content: "", at: new Date().toISOString(), streaming: true, groundedInScreen: Boolean(currentFrame) },
      ]);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: base.filter((m) => m.role !== "system"),
            currentImage: currentFrame,
            technicalMode: s.technicalMode,
            summary: s.summary,
            language: localeRef.current,
            stream: true,
          }),
        });
        if (!res.ok || !res.body) throw new Error(await readApiError(res, tRef.current));
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          full += decoder.decode(value, { stream: true });
          const snapshot = full;
          setMessages((m) => m.map((msg) => (msg.id === assistantId ? { ...msg, content: snapshot } : msg)));
        }
        full = full.trim();
        if (!full) throw new Error(tRef.current.errors.aiEmpty);
        setMessages((m) => {
          const next = m.map((msg) => (msg.id === assistantId ? { ...msg, content: full, streaming: false } : msg));
          void maybeAutoSummarize(next);
          return next;
        });
        setSessionState(s.sharing || stateRef.current.sharing ? "sharing" : "ready");
        setAiStatus("ready");
      } catch (e) {
        setMessages((m) => m.filter((msg) => msg.id !== assistantId));
        setError((e as Error).message || tRef.current.errors.chatFailed);
        setAiStatus("error");
        setSessionState(stateRef.current.sharing ? "sharing" : "error");
        pushTimeline("error", tRef.current.timeline.error);
      } finally {
        busyRef.current = false;
      }
    },
    [doCapture, input, maybeAutoSummarize, pushTimeline],
  );

  const regenerate = useCallback(() => {
    const lastUser = [...stateRef.current.messages].reverse().find((m) => m.role === "user");
    if (lastUser) void sendChat(lastUser.content, true);
  }, [sendChat]);

  const copyMessage = useCallback(async (id: string) => {
    const msg = stateRef.current.messages.find((m) => m.id === id);
    if (!msg) return;
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      setError(tRef.current.errors.clipboard);
    }
  }, []);

  const speak = useCallback((text: string) => {
    const tt = tRef.current;
    if (!("speechSynthesis" in window)) {
      setVoiceError(tt.errors.voiceTtsUnsupported);
      return;
    }
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const omit = localeRef.current === "ar" ? "مثال برمجي محذوف." : "Code example omitted.";
    const plain = text.replace(/```[\s\S]*?```/g, omit).slice(0, 2000);
    const utter = new SpeechSynthesisUtterance(plain);
    utter.lang = localeRef.current === "ar" ? "ar-SA" : "en-US";
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utter);
  }, []);

  const toggleVoice = useCallback(() => {
    const tt = tRef.current;
    const SR = (window as unknown as { SpeechRecognition?: new () => VoiceRec; webkitSpeechRecognition?: new () => VoiceRec }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => VoiceRec }).webkitSpeechRecognition;
    if (!SR) {
      setVoiceError(tt.errors.voiceSttUnsupported);
      return;
    }
    interface VoiceRec {
      lang: string;
      interimResults: boolean;
      onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
      onerror: ((e: { error?: string }) => void) | null;
      onend: (() => void) | null;
      start: () => void;
      stop: () => void;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setListening(false);
      return;
    }
    try {
      const rec: VoiceRec = new SR();
      rec.lang = localeRef.current === "ar" ? "ar-SA" : "en-US";
      rec.interimResults = false;
      rec.onresult = (e) => {
        const transcript = e.results?.[0]?.[0]?.transcript ?? "";
        if (transcript) setInput((v) => (v ? `${v} ${transcript}` : transcript));
      };
      rec.onerror = () => {
        setVoiceError(tt.errors.voiceStartFailed);
        setListening(false);
        recognitionRef.current = null;
      };
      rec.onend = () => {
        setListening(false);
        recognitionRef.current = null;
      };
      recognitionRef.current = rec;
      setVoiceError(null);
      rec.start();
      setListening(true);
    } catch {
      setVoiceError(tt.errors.voiceStartFailed);
    }
  }, []);

  const openSession = useCallback((id: string) => {
    const found = listSessions().find((s) => s.id === id);
    if (!found) return;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setSharing(false);
    setSessionId(found.id);
    setSessionStartedAt(found.createdAt);
    setHasSession(true);
    setMessages(found.messages);
    setTimeline(found.timeline);
    setSummary(found.summary);
    setTechnicalMode(found.technicalMode);
    setFrames([]);
    setError(null);
    setCaptureInfo(tRef.current.errors.savedNoScreenshots);
    setSessionState("ready");
    setAiStatus("ready");
    summaryForRef.current = found.messages.length;
  }, []);

  // ---- landing ----
  if (!hasSession) {
    return (
      <div className="landing">
        <header className="landing-top">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <MonitorUp size={16} />
            </span>
            <span className="brand-name">{t.brand}</span>
          </div>
          <div className="landing-top-actions">
            <LanguageToggle locale={locale} t={t} onToggle={toggleLocale} />
            <span className={`health-pill ${health.groqReady ? "ok" : health.groqReady === false ? "bad" : ""}`}>
              {health.groqReady === null ? t.health.checking : health.groqReady ? t.health.connected : t.health.notConfigured}
            </span>
          </div>
        </header>
        <main className="landing-main">
          <p className="landing-kicker">{t.landing.kicker}</p>
          <h1 className="landing-title">{t.landing.title}</h1>
          <p className="landing-sub">{t.landing.sub}</p>
          <div className="landing-actions">
            <button type="button" className="btn-primary" onClick={startSession}>
              <MonitorUp size={16} />
              <span>{t.landing.startSession}</span>
            </button>
            <button type="button" className="btn-ghost" onClick={() => setDocsOpen(true)}>
              <span>{t.landing.howItWorks}</span>
            </button>
          </div>
          <div className="landing-preview" aria-label={t.landing.previewLabel}>
            <div className="preview-bar">
              <span className="preview-dot" />
              <span className="preview-dot" />
              <span className="preview-dot" />
              <span className="preview-title">{t.landing.previewTitle}</span>
            </div>
            <div className="preview-body">
              <div className="preview-screen">
                <MonitorUp size={22} aria-hidden="true" />
                <span>{t.landing.previewScreen}</span>
              </div>
              <div className="preview-chat">
                <span className="preview-msg">{t.landing.previewUser}</span>
                <span className="preview-msg ai">{t.landing.previewAi}</span>
              </div>
            </div>
          </div>
          <p className="landing-privacy">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>{t.landing.privacy}</span>
          </p>
          {supported === false && (
            <div className="alert alert-error" role="alert">
              {t.landing.unsupported}
            </div>
          )}
        </main>
        <DocsModal open={docsOpen} onClose={() => setDocsOpen(false)} t={t} />
      </div>
    );
  }

  const currentFrame = frames[frames.length - 1] ?? null;
  const previousFrame = frames[frames.length - 2] ?? null;

  return (
    <div className="app">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={sessionId}
        t={t}
        onNew={newSession}
        onOpenSession={openSession}
        onDeleteSession={(id) => {
          deleteSession(id);
          setSessions(listSessions());
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenDocs={() => setDocsOpen(true)}
        hasActiveSession={hasSession}
      />
      <div className="main">
        <StatusBar
          sessionState={sessionState}
          aiStatus={aiStatus}
          sessionStartedAt={sessionStartedAt}
          frameCount={frames.length}
          messageCount={messages.length}
          groqReady={health.groqReady}
          t={t}
          locale={locale}
          onMenu={() => setSidebarOpen(true)}
          onToggleLocale={toggleLocale}
        />
        <div className="workspace">
          <ScreenPane
            ref={videoRef}
            sessionState={sessionState}
            sharing={sharing}
            hasCurrentFrame={Boolean(currentFrame)}
            hasPreviousFrame={Boolean(previousFrame)}
            busy={busy}
            error={error}
            captureInfo={captureInfo}
            timeline={timeline}
            t={t}
            onStart={() => setPrivacyOpen(true)}
            onStop={() => stopSharing("user")}
            onCapture={() => doCapture("manual")}
            onAnalyze={() => void runAnalyze("analyze")}
            onCompare={() => void runAnalyze("what-changed")}
          />
          <ChatPane
            messages={messages}
            aiStatus={aiStatus}
            input={input}
            t={t}
            onInput={setInput}
            onSend={() => void sendChat()}
            onQuickAction={(a) => {
              if (a === "summarize" && stateRef.current.frames.length === 0 && stateRef.current.messages.length > 0) {
                void runAnalyze("summarize");
              } else if (a === "what-changed") {
                void runAnalyze("what-changed");
              } else if (a === "analyze") {
                if (!stateRef.current.frames.length && stateRef.current.sharing) doCapture("auto");
                void runAnalyze("analyze");
              } else if (a === "explain-error" || a === "next-step") {
                if (!stateRef.current.frames.length && !stateRef.current.sharing) {
                  setError(tRef.current.errors.shareCaptureFirst);
                  return;
                }
                if (!stateRef.current.frames.length && stateRef.current.sharing) doCapture("auto");
                void runAnalyze(a);
              } else {
                void runAnalyze(a);
              }
            }}
            onCopyMessage={(id) => void copyMessage(id)}
            onRegenerate={regenerate}
            onSpeak={speak}
            speaking={speaking}
            canRegenerate={messages.some((m) => m.role === "user")}
            canAsk={!busy}
            listening={listening}
            voiceSupported={voiceSupported}
            onToggleVoice={toggleVoice}
            voiceError={voiceError}
            copiedId={copiedId}
            technicalMode={technicalMode}
          />
        </div>
      </div>
      <PrivacyModal open={privacyOpen} onAccept={() => void confirmStartSharing()} onCancel={() => setPrivacyOpen(false)} t={t} />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        technicalMode={technicalMode}
        onTechnicalMode={setTechnicalMode}
        visionModel={health.visionModel}
        textModel={health.textModel}
        groqReady={health.groqReady}
        t={t}
      />
      <DocsModal open={docsOpen} onClose={() => setDocsOpen(false)} t={t} />
    </div>
  );
}
