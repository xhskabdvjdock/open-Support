"use client";

import { X } from "lucide-react";
import type { Strings } from "@/lib/i18n";

export default function DocsModal({ open, onClose, t }: { open: boolean; onClose: () => void; t: Strings }) {
  if (!open) return null;
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-labelledby="docs-title">
      <div className="modal modal-wide">
        <div className="modal-head">
          <h2 id="docs-title" className="modal-title">{t.docsModal.title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t.docsModal.closeDocs}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-body docs">
          <h3>{t.docsModal.howTitle}</h3>
          <p>
            {t.docsModal.howBody}
          </p>
          <h3>{t.docsModal.privacyTitle}</h3>
          <p>
            {t.docsModal.privacyBody}
          </p>
          <h3>{t.docsModal.visionTitle}</h3>
          <p>
            {t.docsModal.visionBody}
          </p>
          <h3>{t.docsModal.frameTitle}</h3>
          <p>
            {t.docsModal.frameBody}
          </p>
          <h3>{t.docsModal.contextTitle}</h3>
          <p>
            {t.docsModal.contextBody}
          </p>
          <h3>{t.docsModal.browsersTitle}</h3>
          <p>
            {t.docsModal.browsersBody}
          </p>
          <h3>{t.docsModal.limitsTitle}</h3>
          <ul className="modal-list">
            <li>{t.docsModal.limit1}</li>
            <li>{t.docsModal.limit2}</li>
            <li>{t.docsModal.limit3}</li>
            <li>{t.docsModal.limit4}</li>
          </ul>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn-primary btn-sm" onClick={onClose}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}
