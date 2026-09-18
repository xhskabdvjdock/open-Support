"use client";

/** Real frame capture + image processing in the browser. No screenshots are faked. */

export interface FrameCapture {
  dataUrl: string;
  width: number;
  height: number;
  bytes: number;
}

export function isScreenCaptureSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getDisplayMedia)
  );
}

export function approxDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor(b64.length * 0.75);
}

/**
 * Capture the current video frame, downscaled to keep Groq payloads small
 * while preserving readable text. Default 1280px wide, JPEG 0.82.
 */
export function captureFrameFromVideo(
  video: HTMLVideoElement,
  opts: { maxWidth?: number; quality?: number } = {},
): FrameCapture {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) {
    throw new Error("Video has no frames yet. Wait for the preview to appear, then capture again.");
  }
  const maxWidth = opts.maxWidth ?? 1280;
  const quality = opts.quality ?? 0.82;
  const scale = Math.min(1, maxWidth / vw);
  const width = Math.max(2, Math.round(vw * scale));
  const height = Math.max(2, Math.round(vh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) throw new Error("Canvas 2D is unavailable in this browser.");
  ctx.drawImage(video, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { dataUrl, width, height, bytes: approxDataUrlBytes(dataUrl) };
}

/** Low-resolution grayscale signature used for real change detection. */
export function frameSignature(video: HTMLVideoElement, size = 32): number[] | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh || video.readyState < 2) return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const sig: number[] = new Array(size * size);
  for (let i = 0; i < size * size; i++) {
    const r = data[i * 4] ?? 0;
    const g = data[i * 4 + 1] ?? 0;
    const b = data[i * 4 + 2] ?? 0;
    sig[i] = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  return sig;
}

/** Mean absolute difference between two signatures, 0 (identical) to 1. */
export function signatureDiff(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 1;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs((a[i] ?? 0) - (b[i] ?? 0));
  return sum / a.length;
}
