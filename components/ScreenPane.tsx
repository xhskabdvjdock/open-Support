"use client";

import type { Ref } from "react";
import {
  Camera,
  GitCompareArrows,
  MonitorUp,
  ScanSearch,
  Square,
} from "lucide-react";
import type { SessionState, TimelineEvent } from "@/lib/types";

interface Props {
  ref?: Ref<HTMLVideoElement | null>;
  sessionState: SessionState;
  sharing: boolean;
  hasCurrentFrame: boolean;
  hasPreviousFrame: boolean;
  busy: boolean;
  error: string | null;
  captureInfo: string | null;
  timeline: TimelineEvent[];
  onStart: () => void;
  onStop: () => void;
  onCapture: () => void;
  onAnalyze: () => void;
  onCompare: () => void;
}

function stateLabel(s: SessionState): string {
  switch (s) {
    case "idle":
      return "Idle";
    case "starting":
      return "Starting";
    case "waiting-permission":
      return "Waiting for permission";
    case "sharing":
      return "Screen sharing active";
    case "analyzing":
      return "Analyzing screen";
    case "thinking":
      return "AI thinking";
    case "ready":
      return "Ready";
    case "error":
      return "Error";
    case "stopped":
      return "Stopped";
  }
}

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ScreenPane({ ref: videoElementRef, ...props }: Props) {
  const { sessionState, sharing, busy } = props;
  const showStop = sharing || sessionState === "analyzing" || sessionState === "thinking";

  return (
    <section className="screen-pane" aria-label="Shared screen">
      <div className="screen-toolbar" role="toolbar" aria-label="Screen controls">
        <div className="screen-state">
          <span className={`dot ${sharing ? "live" : sessionState === "error" ? "bad" : "idle"}`} aria-hidden="true" />
          <span className="screen-state-text">{stateLabel(sessionState)}</span>
        </div>
        <div className="toolbar-actions">
          {!showStop ? (
            <button type="button" className="btn-primary btn-sm" onClick={props.onStart} disabled={busy}>
              <MonitorUp size={14} />
              <span>Start Sharing</span>
            </button>
          ) : (
            <button type="button" className="btn-danger btn-sm" onClick={props.onStop}>
              <Square size={14} />
              <span>Stop Sharing</span>
            </button>
          )}
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={props.onCapture}
            disabled={!sharing || busy}
            title={sharing ? "Capture a frame from the live screen" : "Start sharing first"}
          >
            <Camera size={14} />
            <span>Capture</span>
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={props.onAnalyze}
            disabled={!sharing || !props.hasCurrentFrame || busy}
            title={props.hasCurrentFrame ? "Send the current frame to AI vision" : "Capture a frame first"}
          >
            <ScanSearch size={14} />
            <span>Analyze</span>
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={props.onCompare}
            disabled={!sharing || !props.hasPreviousFrame || busy}
            title={props.hasPreviousFrame ? "Compare previous and current frames" : "Needs at least two captured frames"}
          >
            <GitCompareArrows size={14} />
            <span>Compare</span>
          </button>
        </div>
      </div>

      <div className="screen-stage">
        <video
          ref={videoElementRef}
          className="screen-video"
          autoPlay
          playsInline
          muted
          aria-label={sharing ? "Live shared screen preview" : "Screen preview (not sharing)"}
        />
        {!sharing && (
          <div className="screen-empty">
            <MonitorUp size={28} aria-hidden="true" />
            <p className="screen-empty-title">No screen shared</p>
            <p className="screen-empty-sub">
              Choose Start Sharing, then pick a screen, window, or tab in the browser dialog.
            </p>
          </div>
        )}
      </div>

      {props.error && (
        <div className="alert alert-error" role="alert">
          {props.error}
        </div>
      )}
      {props.captureInfo && !props.error && (
        <div className="capture-info" role="status">
          {props.captureInfo}
        </div>
      )}

      <div className="timeline">
        <h3 className="timeline-title">Screen history</h3>
        {props.timeline.length === 0 ? (
          <p className="timeline-empty">Events from this session will appear here.</p>
        ) : (
          <ol className="timeline-list">
            {props.timeline.slice(-8).reverse().map((ev) => (
              <li key={ev.id} className="timeline-item">
                <span className="timeline-time">{fmtTime(ev.at)}</span>
                <span className="timeline-label">{ev.label}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
