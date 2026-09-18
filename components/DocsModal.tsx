"use client";

import { X } from "lucide-react";

export default function DocsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-labelledby="docs-title">
      <div className="modal modal-wide">
        <div className="modal-head">
          <h2 id="docs-title" className="modal-title">Documentation</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close documentation">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body docs">
          <h3>How screen sharing works</h3>
          <p>
            Start Sharing calls the browser Screen Capture API (navigator.mediaDevices.getDisplayMedia). The browser
            shows its own picker for a screen, window, or tab. The granted MediaStream is rendered in a local{" "}
            &lt;video&gt; element. No stream ever leaves your device except individual frames you explicitly capture and
            send for analysis.
          </p>
          <h3>Privacy</h3>
          <p>
            Captured frames are JPEG-compressed in your browser (max 1280px wide) and POSTed to /api/ai/analyze or
            /api/ai/chat, which forward them to the Groq API. Frames are not stored server-side. Sessions persisted in
            your browser contain messages and event labels only — never screenshots.
          </p>
          <h3>AI vision</h3>
          <p>
            Frames go to a Groq vision model (default qwen/qwen3.8-27b). Each analysis request sends at most the current
            frame plus the previous frame, the recent conversation (last 12 messages), and an optional session summary.
            The assistant only reports what it can observe and says so when it cannot tell.
          </p>
          <h3>Frame processing</h3>
          <p>
            Capture resizes to 1280px JPEG at 0.82 quality. Change detection samples a 32x32 signature every 2 seconds
            and logs a “Screen changed” event when the mean difference exceeds the threshold — this never triggers API
            calls by itself.
          </p>
          <h3>AI context</h3>
          <p>
            Context per request: current frame, previous frame (for Compare), recent messages, and a summary that is
            generated from the real conversation once it grows past 16 messages. Image payloads are capped to protect
            rate limits.
          </p>
          <h3>Supported browsers</h3>
          <p>
            Screen capture requires a Chromium-based desktop browser (Chrome, Edge) or Firefox with screen-sharing
            permission. Safari and most mobile browsers either restrict or block getDisplayMedia — the app shows a clear
            message instead of a fake preview.
          </p>
          <h3>Limitations</h3>
          <ul className="modal-list">
            <li>AI reads pixels, not a live stream — it knows only the frames you capture.</li>
            <li>Small or blurred text may be misread; zoom the relevant panel and capture again.</li>
            <li>Voice input/output use built-in browser speech APIs where available.</li>
            <li>Rate limits apply: 20 chat and 10 analysis requests per minute per client.</li>
          </ul>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn-primary btn-sm" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
