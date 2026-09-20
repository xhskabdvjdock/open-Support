"use client";

import {
  FileText,
  MonitorUp,
  Plus,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import type { PersistedSession } from "@/lib/types";
import type { Strings } from "@/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  sessions: PersistedSession[];
  activeSessionId: string | null;
  t: Strings;
  onNew: () => void;
  onOpenSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onOpenSettings: () => void;
  onOpenDocs: () => void;
  hasActiveSession: boolean;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function Sidebar(props: Props) {
  const { t } = props;
  return (
    <>
      <div
        className={`sidebar-scrim ${props.open ? "visible" : ""}`}
        onClick={props.onClose}
        aria-hidden={!props.open}
      />
      <aside className={`sidebar ${props.open ? "open" : ""}`} aria-label={t.sidebar.label}>
        <div className="sidebar-head">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <MonitorUp size={16} />
            </span>
            <span className="brand-name">{t.brand}</span>
          </div>
          <button type="button" className="icon-btn sidebar-close" onClick={props.onClose} aria-label={t.sidebar.closeSidebar}>
            <X size={16} />
          </button>
        </div>

        <button
          type="button"
          className="btn-primary sidebar-new"
          onClick={() => {
            props.onNew();
            props.onClose();
          }}
        >
          <Plus size={15} />
          <span>{t.sidebar.newSession}</span>
        </button>

        <div className="sidebar-section">
          <h2 className="sidebar-title">{t.sidebar.sessions}</h2>
          {props.sessions.length === 0 ? (
            <p className="sidebar-empty">{t.sidebar.empty}</p>
          ) : (
            <ul className="session-list">
              {props.sessions.map((s) => (
                <li key={s.id}>
                  <div
                    className={`session-item ${s.id === props.activeSessionId ? "active" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      props.onOpenSession(s.id);
                      props.onClose();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        props.onOpenSession(s.id);
                        props.onClose();
                      }
                    }}
                    aria-label={`${t.sidebar.openSession} ${fmtDate(s.createdAt)}`}
                  >
                    <div className="session-item-main">
                      <span className="session-item-date">{fmtDate(s.createdAt)}</span>
                      <span className="session-item-meta">
                        {s.messageCount} {t.misc.messagesUnit} · {t.sessionState[s.status] ?? s.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label={t.sidebar.deleteSession}
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onDeleteSession(s.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav className="sidebar-nav" aria-label={t.sidebar.secondary}>
          <button
            type="button"
            className="sidebar-link"
            onClick={() => {
              props.onOpenSettings();
              props.onClose();
            }}
          >
            <Settings size={15} />
            <span>{t.sidebar.settings}</span>
          </button>
          <button
            type="button"
            className="sidebar-link"
            onClick={() => {
              props.onOpenDocs();
              props.onClose();
            }}
          >
            <FileText size={15} />
            <span>{t.sidebar.documentation}</span>
          </button>
        </nav>

        <p className="sidebar-foot">
          {props.hasActiveSession ? t.sidebar.footActive : t.sidebar.footIdle}
        </p>
      </aside>
    </>
  );
}
