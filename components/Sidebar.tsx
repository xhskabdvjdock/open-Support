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

interface Props {
  open: boolean;
  onClose: () => void;
  sessions: PersistedSession[];
  activeSessionId: string | null;
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
  return (
    <>
      <div
        className={`sidebar-scrim ${props.open ? "visible" : ""}`}
        onClick={props.onClose}
        aria-hidden={!props.open}
      />
      <aside className={`sidebar ${props.open ? "open" : ""}`} aria-label="Application sidebar">
        <div className="sidebar-head">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <MonitorUp size={16} />
            </span>
            <span className="brand-name">open Support</span>
          </div>
          <button type="button" className="icon-btn sidebar-close" onClick={props.onClose} aria-label="Close sidebar">
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
          <span>New Session</span>
        </button>

        <div className="sidebar-section">
          <h2 className="sidebar-title">Sessions</h2>
          {props.sessions.length === 0 ? (
            <p className="sidebar-empty">No saved sessions yet. Sessions are stored on this device only.</p>
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
                    aria-label={`Open session from ${fmtDate(s.createdAt)}`}
                  >
                    <div className="session-item-main">
                      <span className="session-item-date">{fmtDate(s.createdAt)}</span>
                      <span className="session-item-meta">
                        {s.messageCount} messages · {s.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="icon-btn danger"
                      aria-label="Delete session"
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

        <nav className="sidebar-nav" aria-label="Secondary">
          <button
            type="button"
            className="sidebar-link"
            onClick={() => {
              props.onOpenSettings();
              props.onClose();
            }}
          >
            <Settings size={15} />
            <span>Settings</span>
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
            <span>Documentation</span>
          </button>
        </nav>

        <p className="sidebar-foot">
          {props.hasActiveSession ? "Session active on this device." : "No personal data leaves this device except frames you send to Groq for analysis."}
        </p>
      </aside>
    </>
  );
}
