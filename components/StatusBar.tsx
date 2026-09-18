"use client";

import { Menu } from "lucide-react";
import type { AiStatus, SessionState } from "@/lib/types";

interface Props {
  sessionState: SessionState;
  aiStatus: AiStatus;
  sessionStartedAt: string | null;
  frameCount: number;
  messageCount: number;
  groqReady: boolean | null;
  onMenu: () => void;
}

function elapsed(since: string | null): string {
  if (!since) return "—";
  const ms = Date.now() - new Date(since).getTime();
  if (ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function StatusBar(props: Props) {
  return (
    <footer className="statusbar" aria-label="Session status">
      <button type="button" className="icon-btn menu-btn" onClick={props.onMenu} aria-label="Open sidebar">
        <Menu size={16} />
      </button>
      <span className="status-item">
        <span className="status-label">Session</span>
        <span className="status-value">{props.sessionState}</span>
      </span>
      <span className="status-item">
        <span className="status-label">AI</span>
        <span className="status-value">{props.aiStatus}</span>
      </span>
      <span className="status-item hide-sm">
        <span className="status-label">Duration</span>
        <span className="status-value">{elapsed(props.sessionStartedAt)}</span>
      </span>
      <span className="status-item hide-sm">
        <span className="status-label">Frames</span>
        <span className="status-value">{props.frameCount}</span>
      </span>
      <span className="status-item hide-sm">
        <span className="status-label">Messages</span>
        <span className="status-value">{props.messageCount}</span>
      </span>
      <span className="status-spacer" />
      <span className="status-item">
        <span className="status-label">Groq</span>
        <span className={`status-value ${props.groqReady === false ? "bad" : props.groqReady ? "ok" : ""}`}>
          {props.groqReady === null ? "checking" : props.groqReady ? "connected" : "not configured"}
        </span>
      </span>
    </footer>
  );
}
