"use client";

import { ShieldAlert, X } from "lucide-react";

interface Props {
  open: boolean;
  onAccept: () => void;
  onCancel: () => void;
}

export default function PrivacyModal({ open, onAccept, onCancel }: Props) {
  if (!open) return null;
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
      <div className="modal">
        <div className="modal-head">
          <h2 id="privacy-title" className="modal-title">
            <ShieldAlert size={16} aria-hidden="true" />
            <span>Before you share your screen</span>
          </h2>
          <button type="button" className="icon-btn" onClick={onCancel} aria-label="Cancel screen sharing">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">
          <p>
            Only share information you are comfortable showing. Avoid passwords, private keys, personal messages, or
            sensitive information.
          </p>
          <ul className="modal-list">
            <li>Your browser will ask which screen, window, or tab to share. Nothing is shared until you confirm.</li>
            <li>Frames you capture are sent to the Groq API for vision analysis. They are not stored on our servers.</li>
            <li>Chat sessions are saved in this browser only (localStorage), without screenshots.</li>
            <li>Stop sharing at any time. Tracks are closed and analysis stops immediately.</li>
          </ul>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn-primary btn-sm" onClick={onAccept} autoFocus>
            Start Screen Sharing
          </button>
        </div>
      </div>
    </div>
  );
}
