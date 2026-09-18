/**
 * Server-side Groq client. This module must only be imported from
 * Route Handlers / server code so GROQ_API_KEY never reaches the browser.
 */

export const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export function getModelConfig() {
  return {
    vision:
      process.env.GROQ_VISION_MODEL?.trim() || "qwen/qwen3.8-27b",
    text: process.env.GROQ_TEXT_MODEL?.trim() || "openai/gpt-oss-120b",
  };
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export type GroqContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string | GroqContentPart[];
}

interface GroqCallOptions {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export class GroqError extends Error {
  status: number;
  code: string;
  retryAfterSec: number | null;
  constructor(status: number, code: string, message: string, retryAfterSec: number | null = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfterSec = retryAfterSec;
  }
}

function mapGroqHttpError(status: number, bodyText: string, retryAfter: string | null): GroqError {
  let detail = "";
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: { message?: string; code?: string; type?: string };
    };
    detail = parsed?.error?.message ?? "";
  } catch {
    detail = bodyText.slice(0, 300);
  }
  if (status === 401 || status === 403) {
    return new GroqError(status, "invalid_api_key", "Groq API key is missing or invalid. Check GROQ_API_KEY on the server.");
  }
  if (status === 429) {
    const retry = retryAfter ? Number.parseInt(retryAfter, 10) : null;
    return new GroqError(
      429,
      "rate_limited",
      `Groq rate limit reached. ${detail || "Please wait a moment and try again."}`.trim(),
      Number.isFinite(retry) ? retry : 30,
    );
  }
  if (status === 400) {
    return new GroqError(status, "bad_request", detail || "Groq rejected the request (possibly an invalid or oversized image).");
  }
  return new GroqError(status || 502, "groq_error", detail || `Groq request failed with status ${status}.`);
}

/** Non-streaming completion. Returns the assistant text. */
export async function groqComplete(options: GroqCallOptions): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new GroqError(500, "missing_api_key", "GROQ_API_KEY is not configured on the server.");
  }
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1200,
      stream: false,
    }),
  });
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw mapGroqHttpError(res.status, bodyText, res.headers.get("retry-after"));
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new GroqError(502, "empty_response", "Groq returned an empty response. Try again.");
  return { text, model: options.model };
}

/**
 * Streaming completion. Reads Groq SSE, extracts delta text, and forwards
 * each token chunk to onToken. Resolves with the full text.
 */
export async function groqStream(
  options: GroqCallOptions,
  onToken: (token: string) => void | Promise<void>,
  signal?: AbortSignal,
): Promise<{ text: string; model: string }> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new GroqError(500, "missing_api_key", "GROQ_API_KEY is not configured on the server.");
  }
  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1500,
      stream: true,
    }),
    signal,
  });
  if (!res.ok || !res.body) {
    const bodyText = await res.text().catch(() => "");
    throw mapGroqHttpError(res.status, bodyText, res.headers.get("retry-after"));
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string | null } }>;
        };
        const token = evt.choices?.[0]?.delta?.content ?? "";
        if (token) {
          full += token;
          await onToken(token);
        }
      } catch {
        // Ignore malformed SSE lines.
      }
    }
  }
  if (!full.trim()) throw new GroqError(502, "empty_response", "Groq returned an empty response. Try again.");
  return { text: full, model: options.model };
}
