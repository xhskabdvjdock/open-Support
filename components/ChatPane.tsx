"use client";

import { useEffect, useRef } from "react";
import {
  Copy,
  FileSearch,
  ListOrdered,
  Mic,
  MicOff,
  RefreshCw,
  ScanSearch,
  Send,
  Sparkles,
  Volume2,
} from "lucide-react";
import type { AiStatus, AnalyzeAction, ChatMessage } from "@/lib/types";
import type { Strings } from "@/lib/i18n";
import Markdown from "./Markdown";

interface Props {
  messages: ChatMessage[];
  aiStatus: AiStatus;
  input: string;
  t: Strings;
  onInput: (v: string) => void;
  onSend: () => void;
  onQuickAction: (a: AnalyzeAction) => void;
  onCopyMessage: (id: string) => void;
  onRegenerate: () => void;
  onSpeak: (text: string) => void;
  speaking: boolean;
  canRegenerate: boolean;
  canAsk: boolean;
  listening: boolean;
  voiceSupported: boolean;
  onToggleVoice: () => void;
  voiceError: string | null;
  copiedId: string | null;
  technicalMode: boolean;
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ChatPane(props: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { t } = props;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [props.messages.length]);

  const sendOnEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      props.onSend();
    }
  };

  const QUICK_ACTIONS: { action: AnalyzeAction; label: string; icon: typeof ScanSearch }[] = [
    { action: "analyze", label: t.chat.analyzeScreen, icon: ScanSearch },
    { action: "explain-error", label: t.chat.explainError, icon: FileSearch },
    { action: "what-changed", label: t.chat.whatChanged, icon: ListOrdered },
    { action: "next-step", label: t.chat.nextStep, icon: Sparkles },
    { action: "summarize", label: t.chat.summarize, icon: RefreshCw },
  ];

  const aiStatusLabel = t.aiStatus[props.aiStatus] ?? props.aiStatus;

  return (
    <section className="chat-pane" aria-label={t.chat.title}>
      <div className="chat-head">
        <div className="chat-head-left">
          <h2 className="chat-title">{t.chat.title}</h2>
          <span className={`ai-badge status-${props.aiStatus}`} role="status">
            <span className="ai-dot" aria-hidden="true" />
            {aiStatusLabel}
          </span>
        </div>
        {props.technicalMode && <span className="tech-badge">{t.chat.technical}</span>}
      </div>

      <div className="quick-actions" role="toolbar" aria-label={t.chat.quickActions}>
        {QUICK_ACTIONS.map(({ action, label, icon: Icon }) => (
          <button
            key={action}
            type="button"
            className="chip"
            onClick={() => props.onQuickAction(action)}
            disabled={!props.canAsk}
            title={label}
          >
            <Icon size={13} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="messages" role="log" aria-live="polite" aria-label={t.chat.conversation}>
        {props.messages.length === 0 && (
          <div className="chat-empty">
            <p className="chat-empty-title">{t.chat.emptyTitle}</p>
            <p className="chat-empty-sub">
              {t.chat.emptySub}
            </p>
          </div>
        )}
        {props.messages.map((m) => (
          <article key={m.id} className={`msg msg-${m.role}`}>
            <div className="msg-meta">
              <span className="msg-role">{m.role === "user" ? t.chat.you : m.role === "assistant" ? t.chat.ai : t.chat.system}</span>
              <span className="msg-time">{fmtTime(m.at)}</span>
              {m.groundedInScreen && m.role === "assistant" && <span className="msg-grounded">{t.chat.fromScreen}</span>}
              {m.streaming && <span className="msg-streaming">{t.chat.streaming}</span>}
            </div>
            <div className="msg-body" dir="auto">
              {m.role === "assistant" ? <Markdown text={m.content} t={t} /> : <p className="msg-text" dir="auto">{m.content}</p>}
            </div>
            {m.role === "assistant" && !m.streaming && (
              <div className="msg-actions">
                <button
                  type="button"
                  className="mini-btn"
                  onClick={() => props.onCopyMessage(m.id)}
                  aria-label={t.chat.copyMessage}
                >
                  <Copy size={12} />
                  <span>{props.copiedId === m.id ? t.copied : t.copy}</span>
                </button>
                <button type="button" className="mini-btn" onClick={() => props.onSpeak(m.content)} aria-label={t.chat.readAloud}>
                  <Volume2 size={12} />
                  <span>{props.speaking ? t.chat.stop : t.chat.read}</span>
                </button>
              </div>
            )}
          </article>
        ))}
        <div ref={bottomRef} />
      </div>

      {props.voiceError && (
        <div className="alert alert-error chat-voice-error" role="alert">
          {props.voiceError}
        </div>
      )}

      <div className="composer">
        {props.voiceSupported && (
          <button
            type="button"
            className={`icon-btn mic-btn ${props.listening ? "recording" : ""}`}
            onClick={props.onToggleVoice}
            aria-label={props.listening ? t.chat.micStop : t.chat.micStart}
            aria-pressed={props.listening}
            title={props.listening ? t.chat.micListening : t.chat.micSpeak}
          >
            {props.listening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}
        <textarea
          ref={taRef}
          className="composer-input"
          dir="auto"
          rows={2}
          value={props.input}
          onChange={(e) => props.onInput(e.target.value)}
          onKeyDown={sendOnEnter}
          placeholder={props.canAsk ? t.chat.placeholderCanAsk : t.chat.placeholderGeneric}
          aria-label={t.chat.askLabel}
        />
        <button
          type="button"
          className="btn-primary btn-sm composer-send"
          onClick={props.onSend}
          disabled={!props.input.trim() || props.aiStatus === "thinking" || props.aiStatus === "analyzing"}
          aria-label={t.chat.send}
        >
          <Send size={14} />
          <span>{t.chat.sendShort}</span>
        </button>
      </div>
      <div className="composer-foot">
        <button
          type="button"
          className="link-btn"
          onClick={props.onRegenerate}
          disabled={!props.canRegenerate || props.aiStatus === "thinking" || props.aiStatus === "analyzing"}
        >
          <RefreshCw size={12} />
          <span>{t.chat.regenerate}</span>
        </button>
        <span className="composer-hint">{t.chat.hint}</span>
      </div>
    </section>
  );
}
