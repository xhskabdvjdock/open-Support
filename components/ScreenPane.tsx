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
import type { Strings } from "@/lib/i18n";

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
  t: Strings;
  onStart: () => void;
  onStop: () => void;
  onCapture: () => void;
  onAnalyze: () => void;
  onCompare: () => void;
}

function fmtTime(iso: string, locale?: string): string {
  try {
    return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ScreenPane({ ref: videoElementRef, t, ...props }: Props) {
  const { sessionState, sharing, busy } = props;
  const showStop = sharing || sessionState === "analyzing" || sessionState === "thinking";
  const stateLabel = t.sessionState[sessionState] ?? sessionState;

  return (
    <section className="screen-pane" aria-label={t.screen.sharedScreen}>
      <div className="screen-toolbar" role="toolbar" aria-label={t.screen.screenControls}>
        <div className="screen-state">
          <span className={`dot ${sharing ? "live" : sessionState === "error" ? "bad" : "idle"}`} aria-hidden="true" />
          <span className="screen-state-text">{stateLabel}</span>
        </div>
        <div className="toolbar-actions">
          {!showStop ? (
            <button type="button" className="btn-primary btn-sm" onClick={props.onStart} disabled={busy}>
              <MonitorUp size={14} />
              <span>{t.screen.startSharing}</span>
            </button>
          ) : (
            <button type="button" className="btn-danger btn-sm" onClick={props.onStop}>
              <Square size={14} />
              <span>{t.screen.stopSharing}</span>
            </button>
          )}
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={props.onCapture}
            disabled={!sharing || busy}
            title={sharing ? t.screen.captureTitle : t.screen.captureTitleDisabled}
          >
            <Camera size={14} />
            <span>{t.screen.capture}</span>
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={props.onAnalyze}
            disabled={!sharing || !props.hasCurrentFrame || busy}
            title={props.hasCurrentFrame ? t.screen.analyzeTitleHas : t.screen.analyzeTitleNeeds}
          >
            <ScanSearch size={14} />
            <span>{t.screen.analyze}</span>
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={props.onCompare}
            disabled={!sharing || !props.hasPreviousFrame || busy}
            title={props.hasPreviousFrame ? t.screen.compareTitleHas : t.screen.compareTitleNeeds}
          >
            <GitCompareArrows size={14} />
            <span>{t.screen.compare}</span>
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
          aria-label={sharing ? t.screen.sharedPreview : t.screen.notSharingPreview}
        />
        {!sharing && (
          <div className="screen-empty">
            <MonitorUp size={28} aria-hidden="true" />
            <p className="screen-empty-title">{t.screen.noScreen}</p>
            <p className="screen-empty-sub">
              {t.screen.noScreenSub}
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
        <h3 className="timeline-title">{t.screen.history}</h3>
        {props.timeline.length === 0 ? (
          <p className="timeline-empty">{t.screen.historyEmpty}</p>
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
