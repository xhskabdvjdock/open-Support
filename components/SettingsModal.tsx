"use client";

import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  technicalMode: boolean;
  onTechnicalMode: (v: boolean) => void;
  visionModel: string | null;
  textModel: string | null;
  groqReady: boolean | null;
}

export default function SettingsModal(props: Props) {
  if (!props.open) return null;
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="modal">
        <div className="modal-head">
          <h2 id="settings-title" className="modal-title">Settings</h2>
          <button type="button" className="icon-btn" onClick={props.onClose} aria-label="Close settings">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <label className="setting-row" htmlFor="tech-mode">
            <span className="setting-main">
              <span className="setting-name">Technical Mode</span>
              <span className="setting-desc">
                Structured answers: Error, Root Cause, Evidence, Recommended Action, Verification.
              </span>
            </span>
            <input
              id="tech-mode"
              type="checkbox"
              className="switch"
              checked={props.technicalMode}
              onChange={(e) => props.onTechnicalMode(e.target.checked)}
            />
          </label>
          <dl className="setting-meta">
            <div>
              <dt>Groq status</dt>
              <dd>{props.groqReady === null ? "Checking..." : props.groqReady ? "Connected" : "API key not configured on the server"}</dd>
            </div>
            <div>
              <dt>Vision model</dt>
              <dd className="mono">{props.visionModel ?? "—"}</dd>
            </div>
            <div>
              <dt>Text model</dt>
              <dd className="mono">{props.textModel ?? "—"}</dd>
            </div>
          </dl>
          <p className="setting-note">
            Models are configured server-side via GROQ_VISION_MODEL and GROQ_TEXT_MODEL. The API key never leaves the
            server.
          </p>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn-primary btn-sm" onClick={props.onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
