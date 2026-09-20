"use client";

import { ShieldAlert, X } from "lucide-react";
import type { Strings } from "@/lib/i18n";

interface Props {
  open: boolean;
  t: Strings;
  onAccept: () => void;
  onCancel: () => void;
}

export default function PrivacyModal({ open, t, onAccept, onCancel }: Props) {
  if (!open) return null;
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <div className="modal">
        <div className="modal-head">
          <h2 id="privacy-title" className="modal-title">
            <ShieldAlert size={16} aria-hidden="true" />
            <span>{t.privacy.title}</span>
          </h2>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label={t.privacy.cancelSharing}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <p>
            {t.privacy.body}
          </p>
          <ul className="modal-list">
            <li>{t.privacy.li1}</li>
            <li>{t.privacy.li2}</li>
            <li>{t.privacy.li3}</li>
            <li>{t.privacy.li4}</li>
          </ul>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>
            {t.cancel}
          </button>
          <button type="button" className="btn-primary btn-sm" onClick={onAccept} autoFocus>
            {t.privacy.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
