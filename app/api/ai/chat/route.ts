import { NextResponse } from "next/server";
import {
  ValidationError,
  buildVisionMessages,
  trimHistory,
  validateDataUrlImage,
} from "@/lib/context";
import { GroqError, getModelConfig, groqComplete, groqStream } from "@/lib/groq";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatBody {
  messages?: ChatMessage[];
  currentImage?: string | null;
  previousImage?: string | null;
  technicalMode?: boolean;
  summary?: string | null;
  stream?: boolean;
}

function errorResponse(status: number, code: string, message: string, retryAfterSec?: number) {
  const res = NextResponse.json({ error: { code, message } }, { status });
  if (retryAfterSec) res.headers.set("Retry-After", String(retryAfterSec));
  return res;
}

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit(`chat:${clientIp(req)}`, 20, 60_000);
    if (!rl.allowed) {
      return errorResponse(429, "rate_limited", "Too many chat requests. Please wait a moment and try again.", rl.retryAfterSec);
    }

    const body = (await req.json().catch(() => null)) as ChatBody | null;
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      throw new ValidationError("messages must be a non-empty array.");
    }
    if (body.messages.length > 50) throw new ValidationError("messages exceeds the maximum of 50 entries.");

    const currentImage = validateDataUrlImage(body.currentImage ?? null, "currentImage", false);
    const previousImage = validateDataUrlImage(body.previousImage ?? null, "previousImage", false);
    const technicalMode = body.technicalMode === true;
    const summary = typeof body.summary === "string" ? body.summary.slice(0, 3000) : null;
    const history = trimHistory(
      body.messages.filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") as ChatMessage[],
    );
    const lastUser = [...history].reverse().find((m) => m.role === "user");
    if (!lastUser) throw new ValidationError("messages must contain at least one user message.");

    const { vision, text } = getModelConfig();
    const useVision = Boolean(currentImage || previousImage);
    const groqMessages = useVision
      ? buildVisionMessages({
          question: lastUser.content,
          currentImage,
          previousImage: previousImage ?? null,
          history: history.slice(0, -1),
          summary,
          technicalMode,
        })
      : [
          {
            role: "system" as const,
            content: technicalMode
              ? "You are open Support, a technical support assistant. Use the structured format: Error / Root Cause / Evidence / Recommended Action / Verification. Never invent details the user did not provide."
              : "You are open Support, a technical support assistant. Answer from the conversation context. Never invent screen content you cannot see; if you need the screen, ask the user to share it and run Analyze Screen.",
          },
          ...(summary
            ? [{ role: "system" as const, content: `Session summary so far:\n${summary.slice(0, 2000)}` }]
            : []),
          ...history.slice(0, -1).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content: lastUser.content },
        ];

    const model = useVision ? vision : text;

    if (body.stream) {
      const encoder = new TextEncoder();
      const tokenStream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            await groqStream({ model, messages: groqMessages }, async (token) => {
              controller.enqueue(encoder.encode(token));
            });
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });
      return new Response(tokenStream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          "X-Model": model,
        },
      });
    }

    const { text: reply } = await groqComplete({ model, messages: groqMessages });
    return NextResponse.json({ reply, model, groundedInScreen: useVision });
  } catch (err) {
    if (err instanceof ValidationError) {
      return errorResponse(err.status, err.code, err.message);
    }
    if (err instanceof GroqError) {
      return errorResponse(err.status, err.code, err.message, err.retryAfterSec ?? undefined);
    }
    console.error("chat route error", err);
    return errorResponse(500, "internal_error", "Unexpected server error. Try again.");
  }
}
