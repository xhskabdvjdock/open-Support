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
import Sidebar from "./Sidebar";
import ScreenPane from "./ScreenPane";
import ChatPane from "./ChatPane";
import StatusBar from "./StatusBar";
import PrivacyModal from "./PrivacyModal";
import SettingsModal from "./SettingsModal";
import DocsModal from "./DocsModal";

const MAX_FRAMES_IN_MEMORY = 4;
const CHANGE_THRESHOLD = 0.08;
const CHANGE_COOLDOWN_MS = 10_000;
const AUTO_CAPTURE_MAX_AGE_MS = 30_000;

interface Health {
  groqReady: boolean | null;
  visionModel: string | null;
  textModel: string | null;
}

async function readApiError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: { code?: string; message?: string } };
    const code = data?.error?.code ?? "";
    const message = data?.error?.message ?? "";
    if (code === "invalid_api_key" || code === "missing_api_key") {
      return "AI is not configured: the Groq API key is missing or invalid on the server. Set GROQ_API_KEY and try again.";
    }
    if (code === "rate_limited") return message || "Rate limit reached. Wait a moment and try again.";
    return message || `Request failed (${res.status}). Try again.`;
  } catch {
    return `Request failed (${res.status}). Try again.`;
  }
}

export default function Workspace() {
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
  const stateRef = useRef({ sharing: false, messages: [] as ChatMessage[], summary: null as string | null, technicalMode: false, frames: [] as CapturedFrame[] });
  stateRef.current = { sharing, messages, summary, technicalMode, frames };

  const busy = aiStatus === "analyzing" || aiStatus === "thinking";

  const pushTimeline = useCallback((kind: TimelineEvent["kind"], label: string) => {
    setTimeline((t) => [...t.slice(-99), { id: uid("ev"), at: new Date().toISOString(), kind, label }]);
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
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  // ---- persist active session (messages + timeline only, never frames) ----
  useEffect(() => {
    if (!hasSession || !sessionId || !sessionStartedAt) return;
    const t = setTimeout(() => {
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
    return () => clearTimeout(t);
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
        pushTimeline("screen-changed", "Screen changed");
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
    pushTimeline("session-start", "Session started");
  }, [pushTimeline]);

  const newSession = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setSharing(false);
    startSession();
  }, [startSession]);

  const stopSharing = useCallback(
    (reason: "user" | "browser-ended") => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setSharing(false);
      setSessionState("stopped");
      setAiStatus((s) => (s === "analyzing" || s === "thinking" ? s : "waiting-input"));
      pushTimeline("stopped", reason === "user" ? "Screen sharing stopped" : "Screen sharing ended in browser");
      setCaptureInfo(null);
    },
    [pushTimeline],
  );

  const confirmStartSharing = useCallback(async () => {
    setPrivacyOpen(false);
    setError(null);
    if (!isScreenCaptureSupported()) {
      setError("Screen sharing is not supported in this browser. Use a Chromium-based desktop browser (Chrome or Edge) or Firefox.");
      setSessionState("error");
      setAiStatus("error");
      pushTimeline("error", "Screen sharing unsupported in this browser");
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
        stream.getTracks().forEach((t) => t.stop());
        throw new Error("No video track was granted. Try again and select a screen, window, or tab.");
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
      pushTimeline("sharing", "Screen sharing active");
    } catch (e) {
      const err = e as Error & { name?: string };
      if (err?.name === "NotAllowedError") {
        setError("Permission denied. Screen sharing starts only when you allow it in the browser dialog — nothing was shared.");
        pushTimeline("error", "Screen permission denied");
      } else if (err?.name === "NotFoundError" || err?.name === "AbortError") {
        setError("Screen selection was cancelled. Press Start Sharing to try again.");
        pushTimeline("error", "Screen selection cancelled");
      } else {
        setError(err?.message || "Could not start screen sharing. Try again.");
        pushTimeline("error", "Screen sharing failed");
      }
      setSessionState("error");
      setAiStatus("error");
    }
  }, [pushTimeline, stopSharing]);

  const doCapture = useCallback(
    (label: string): CapturedFrame | null => {
      const video = videoRef.current;
      if (!video || !streamRef.current) {
        setError("No live screen to capture. Start sharing first.");
        return null;
      }
      try {
        const shot = captureFrameFromVideo(video);
        const frame: CapturedFrame = { id: uid("fr"), at: new Date().toISOString(), label, ...shot };
        setFrames((f) => [...f.slice(-(MAX_FRAMES_IN_MEMORY - 1)), frame]);
        lastCaptureAtRef.current = Date.now();
        changedSinceCaptureRef.current = false;
        setCaptureInfo(
          `Captured ${shot.width}x${shot.height} JPEG (${(shot.bytes / 1024).toFixed(0)} KB) at ${new Date().toLocaleTimeString()}.`,
        );
        pushTimeline("capture", `Screen captured (${label})`);
        return frame;
      } catch (e) {
        setError((e as Error).message || "Frame capture failed.");
        pushTimeline("error", "Frame capture failed");
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
          }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { result?: string };
        if (data.result) {
          setSummary(data.result);
          pushTimeline("summary", "Session summary updated");
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
      let current: CapturedFrame | null = stateRef.current.frames[stateRef.current.frames.length - 1] ?? null;
      let previous: CapturedFrame | null = stateRef.current.frames[stateRef.current.frames.length - 2] ?? null;
      const textOnlySummarize = action === "summarize" && stateRef.current.messages.length > 0 && !current;

      if (action === "what-changed" && !previous) {
        setError("Compare needs at least two captured frames. Capture again after the screen changes, then compare.");
        return;
      }
      if (!current && !textOnlySummarize) {
        if (!stateRef.current.sharing) {
          setError(
            action === "summarize"
              ? "Nothing to summarize yet — send a message first."
              : "No frame captured yet. Start sharing and capture a frame first.",
          );
          return;
        }
        current = doCapture("Auto capture");
        if (!current) return;
        previous = null;
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
          }),
        });
        if (!res.ok) throw new Error(await readApiError(res));
        const data = (await res.json()) as { result?: string };
        const text = data.result?.trim();
        if (!text) throw new Error("Analysis returned an empty response. Try again.");
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
        pushTimeline(action === "what-changed" ? "compare" : "analysis", action === "what-changed" ? "Frames compared" : "Screen analyzed");
        setSessionState(stateRef.current.sharing ? "sharing" : "ready");
        setAiStatus("ready");
      } catch (e) {
        setError((e as Error).message || "Analysis failed.");
        setAiStatus("error");
        setSessionState(stateRef.current.sharing ? "sharing" : "error");
        pushTimeline("error", "Analysis failed");
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
          const fresh = doCapture("Auto capture");
          if (fresh) currentFrame = fresh.dataUrl;
        }
      }

      const userMsg: ChatMessage = { id: uid("m"), role: "user", content: question, at: new Date().toISOString() };
      const base = regenerate ? history : [...history, userMsg];
      if (!regenerate) {
        setMessages(base);
        setInput("");
        pushTimeline("chat", "Question sent");
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
            stream: true,
          }),
        });
        if (!res.ok || !res.body) throw new Error(await readApiError(res));
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
        if (!full) throw new Error("AI returned an empty response. Try again.");
        setMessages((m) => {
          const next = m.map((msg) => (msg.id === assistantId ? { ...msg, content: full, streaming: false } : msg));
          void maybeAutoSummarize(next);
          return next;
        });
        setSessionState(s.sharing || stateRef.current.sharing ? "sharing" : "ready");
        setAiStatus("ready");
      } catch (e) {
        setMessages((m) => m.filter((msg) => msg.id !== assistantId));
        setError((e as Error).message || "Chat request failed.");
        setAiStatus("error");
        setSessionState(stateRef.current.sharing ? "sharing" : "error");
        pushTimeline("error", "Chat request failed");
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
      setError("Clipboard is unavailable in this browser context.");
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) {
      setVoiceError("Text-to-speech is not supported in this browser.");
      return;
    }
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const plain = text.replace(/```[\s\S]*?```/g, "Code example omitted.").slice(0, 2000);
    const utter = new SpeechSynthesisUtterance(plain);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utter);
  }, []);

  const toggleVoice = useCallback(() => {
    const SR = (window as unknown as { SpeechRecognition?: new () => VoiceRec; webkitSpeechRecognition?: new () => VoiceRec }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => VoiceRec }).webkitSpeechRecognition;
    if (!SR) {
      setVoiceError("Voice input is not supported in this browser. Use Chrome on desktop for speech recognition.");
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
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.onresult = (e) => {
        const transcript = e.results?.[0]?.[0]?.transcript ?? "";
        if (transcript) setInput((v) => (v ? `${v} ${transcript}` : transcript));
      };
      rec.onerror = (e) => {
        setVoiceError(`Voice input failed (${e.error || "unknown error"}). Check microphone permission.`);
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
      setVoiceError("Could not start voice input. Check microphone permission.");
    }
  }, []);

  const openSession = useCallback((id: string) => {
    const found = listSessions().find((s) => s.id === id);
    if (!found) return;
    streamRef.current?.getTracks().forEach((t) => t.stop());
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
    setCaptureInfo("Opened a saved session. Screenshots are never stored — share your screen again to give AI fresh context.");
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
            <span className="brand-name">open Support</span>
          </div>
          <span className={`health-pill ${health.groqReady ? "ok" : health.groqReady === false ? "bad" : ""}`}>
            {health.groqReady === null ? "Checking AI status" : health.groqReady ? "AI connected" : "AI not configured"}
          </span>
        </header>
        <main className="landing-main">
          <p className="landing-kicker">AI Screen Support</p>
          <h1 className="landing-title">AI That Can See Your Screen</h1>
          <p className="landing-sub">Share your screen, ask questions, and get technical help based on what is actually visible.</p>
          <div className="landing-actions">
            <button type="button" className="btn-primary" onClick={startSession}>
              <MonitorUp size={16} />
              <span>Start Session</span>
            </button>
            <button type="button" className="btn-ghost" onClick={() => setDocsOpen(true)}>
              <span>How it works</span>
            </button>
          </div>
          <div className="landing-preview" aria-label="Product preview">
            <div className="preview-bar">
              <span className="preview-dot" />
              <span className="preview-dot" />
              <span className="preview-dot" />
              <span className="preview-title">Support Workspace — shared screen + AI chat</span>
            </div>
            <div className="preview-body">
              <div className="preview-screen">
                <MonitorUp size={22} aria-hidden="true" />
                <span>Live screen preview appears here after you share</span>
              </div>
              <div className="preview-chat">
                <span className="preview-msg">You: Where is the problem?</span>
                <span className="preview-msg ai">AI: I can see a terminal error on your screen…</span>
              </div>
            </div>
          </div>
          <p className="landing-privacy">
            <ShieldCheck size={14} aria-hidden="true" />
            <span>Screen sharing is opt-in. Captured frames are sent to Groq for analysis only — never stored.</span>
          </p>
          {supported === false && (
            <div className="alert alert-error" role="alert">
              This browser does not support screen capture. Use Chrome, Edge, or Firefox on desktop.
            </div>
          )}
        </main>
        <DocsModal open={docsOpen} onClose={() => setDocsOpen(false)} />
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
          onMenu={() => setSidebarOpen(true)}
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
            onStart={() => setPrivacyOpen(true)}
            onStop={() => stopSharing("user")}
            onCapture={() => doCapture("Manual capture")}
            onAnalyze={() => void runAnalyze("analyze")}
            onCompare={() => void runAnalyze("what-changed")}
          />
          <ChatPane
            messages={messages}
            aiStatus={aiStatus}
            input={input}
            onInput={setInput}
            onSend={() => void sendChat()}
            onQuickAction={(a) => {
              if (a === "summarize" && stateRef.current.frames.length === 0 && stateRef.current.messages.length > 0) {
                void runAnalyze("summarize");
              } else if (a === "what-changed") {
                void runAnalyze("what-changed");
              } else if (a === "analyze") {
                if (!stateRef.current.frames.length && stateRef.current.sharing) doCapture("Auto capture");
                void runAnalyze("analyze");
              } else if (a === "explain-error" || a === "next-step") {
                if (!stateRef.current.frames.length && !stateRef.current.sharing) {
                  setError("Share your screen and capture a frame first, or just ask your question in chat.");
                  return;
                }
                if (!stateRef.current.frames.length && stateRef.current.sharing) doCapture("Auto capture");
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
      <PrivacyModal open={privacyOpen} onAccept={() => void confirmStartSharing()} onCancel={() => setPrivacyOpen(false)} />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        technicalMode={technicalMode}
        onTechnicalMode={setTechnicalMode}
        visionModel={health.visionModel}
        textModel={health.textModel}
        groqReady={health.groqReady}
      />
      <DocsModal open={docsOpen} onClose={() => setDocsOpen(false)} />
    </div>
  );
}
