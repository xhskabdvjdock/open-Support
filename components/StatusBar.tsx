"use client";

import { Menu } from "lucide-react";
import type { AiStatus, SessionState } from "@/lib/types";
import type { Strings } from "@/lib/i18n";
import LanguageToggle from "./LanguageToggle";
import type { Locale } from "@/lib/i18n";

interface Props {
  sessionState: SessionState;
  aiStatus: AiStatus;
  sessionStartedAt: string | null;
  frameCount: number;
  messageCount: number;
  groqReady: boolean | null;
  t: Strings;
  locale: Locale;
  onMenu: () => void;
  onToggleLocale: () => void;
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
  const { t } = props;
  return (
    <footer className="statusbar" aria-label={t.statusbar.label}>
      <button type="button" className="icon-btn menu-btn" onClick={props.onMenu} aria-label={t.statusbar.openSidebar}>
        <Menu size={16} />
      </button>
      <span className="status-item">
        <span className="status-label">{t.statusbar.session}</span>
        <span className="status-value">{t.sessionState[props.sessionState] ?? props.sessionState}</span>
      </span>
      <span className="status-item">
        <span className="status-label">{t.statusbar.ai}</span>
        <span className="status-value">{t.aiStatus[props.aiStatus] ?? props.aiStatus}</span>
      </span>
      <span className="status-item hide-sm">
        <span className="status-label">{t.statusbar.duration}</span>
        <span className="status-value">{elapsed(props.sessionStartedAt)}</span>
      </span>
      <span className="status-item hide-sm">
        <span className="status-label">{t.statusbar.frames}</span>
        <span className="status-value">{props.frameCount}</span>
      </span>
      <span className="status-item hide-sm">
        <span className="status-label">{t.statusbar.messages}</span>
        <span className="status-value">{props.messageCount}</span>
      </span>
      <span className="status-spacer" />
      <span className="statusbar-actions">
        <LanguageToggle locale={props.locale} t={t} onToggle={props.onToggleLocale} compact />
        <span className="status-item">
          <span className="status-label">{t.statusbar.groq}</span>
          <span className={`status-value ${props.groqReady === false ? "bad" : props.groqReady ? "ok" : ""}`}>
            {props.groqReady === null ? t.statusbar.checking : props.groqReady ? t.statusbar.connected : t.statusbar.notConfigured}
          </span>
        </span>
      </span>
    </footer>
  );
}
