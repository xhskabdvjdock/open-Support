"use client";

import { X } from "lucide-react";
import type { Strings } from "@/lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  technicalMode: boolean;
  onTechnicalMode: (v: boolean) => void;
  visionModel: string | null;
  textModel: string | null;
  groqReady: boolean | null;
  t: Strings;
}

export default function SettingsModal(props: Props) {
  if (!props.open) return null;
  const { t } = props;
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="modal">
        <div className="modal-head">
          <h2 id="settings-title" className="modal-title">{t.settings.title}</h2>
          <button type="button" className="icon-btn" onClick={props.onClose} aria-label={t.settings.closeSettings}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <label className="setting-row" htmlFor="tech-mode">
            <span className="setting-main">
              <span className="setting-name">{t.settings.techName}</span>
              <span className="setting-desc">
                {t.settings.techDesc}
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
              <dt>{t.settings.groqStatus}</dt>
              <dd>{props.groqReady === null ? t.settings.checking : props.groqReady ? t.settings.connected : t.settings.notConfigured}</dd>
            </div>
            <div>
              <dt>{t.settings.visionModel}</dt>
              <dd className="mono">{props.visionModel ?? "—"}</dd>
            </div>
            <div>
              <dt>{t.settings.textModel}</dt>
              <dd className="mono">{props.textModel ?? "—"}</dd>
            </div>
          </dl>
          <p className="setting-note">
            {t.settings.note}
          </p>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn-primary btn-sm" onClick={props.onClose}>
            {t.done}
          </button>
        </div>
      </div>
    </div>
  );
}
