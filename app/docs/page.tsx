import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation — open Support",
  description: "How screen sharing, AI vision, frame processing, and privacy work in open Support.",
};

export default function DocsPage() {
  return (
    <main className="docs-page">
      <Link href="/" className="docs-back">
        Back to open Support
      </Link>
      <h1>Documentation</h1>
      <p>open Support is a visual technical support assistant. Share your screen, and the AI answers from what is actually visible.</p>

      <h2>How screen sharing works</h2>
      <p>
        Start Sharing calls the browser Screen Capture API (navigator.mediaDevices.getDisplayMedia). The browser shows
        its own picker for a screen, window, or tab. The granted MediaStream is rendered in a local video element. No
        stream leaves your device except individual frames you capture and send for analysis.
      </p>

      <h2>Privacy</h2>
      <p>
        Captured frames are JPEG-compressed in your browser (max 1280px wide) and sent to /api/ai/analyze or
        /api/ai/chat, which forward them to the Groq API. Frames are not stored server-side. Sessions saved in your
        browser contain messages and event labels only — never screenshots. Do not share passwords, keys, or personal
        messages.
      </p>

      <h2>AI vision</h2>
      <p>
        Frames go to a Groq vision model (default qwen/qwen3.8-27b). Each request sends at most the current frame plus
        the previous frame, the recent conversation, and an optional session summary. The assistant reports only what it
        can observe and says so when it cannot tell.
      </p>

      <h2>Frame processing</h2>
      <p>
        Capture resizes to 1280px JPEG at 0.82 quality. Change detection samples a 32x32 signature every 2 seconds and
        logs a “Screen changed” event past the threshold — this never triggers API calls by itself. Frames refresh
        automatically when you ask a question after the screen changed or after 30 seconds.
      </p>

      <h2>AI context</h2>
      <p>
        Context per request: current frame, previous frame for Compare, the last 12 messages, and a summary generated
        from the real conversation once it grows past 16 messages. Image payloads are capped to protect rate limits
        (20 chat and 10 analysis requests per minute per client).
      </p>

      <h2>Supported browsers</h2>
      <p>
        Screen capture needs a Chromium-based desktop browser (Chrome, Edge) or Firefox. Safari and most mobile browsers
        restrict getDisplayMedia — the app shows a clear message instead of a fake preview.
      </p>

      <h2>Limitations</h2>
      <ul>
        <li>The AI reads captured pixels, not a live stream — it knows only the frames you capture.</li>
        <li>Small or blurred text may be misread; zoom the relevant panel and capture again.</li>
        <li>Voice input/output use built-in browser speech APIs where available.</li>
      </ul>
    </main>
  );
}
