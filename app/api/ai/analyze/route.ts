import { NextResponse } from "next/server";
import {
  ValidationError,
  actionPrompt,
  languageInstruction,
  normalizeLanguage,
  trimHistory,
  validateDataUrlImage,
} from "@/lib/context";
import { GroqError, getModelConfig, groqComplete } from "@/lib/groq";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";
import type { AnalyzeAction, ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const ACTIONS: AnalyzeAction[] = ["analyze", "explain-error", "what-changed", "next-step", "summarize"];

interface AnalyzeBody {
  action?: AnalyzeAction;
  image?: string | null;
  previousImage?: string | null;
  conversation?: ChatMessage[];
  technicalMode?: boolean;
  summary?: string | null;
  language?: unknown;
}

function errorResponse(status: number, code: string, message: string, retryAfterSec?: number) {
  const res = NextResponse.json({ error: { code, message } }, { status });
  if (retryAfterSec) res.headers.set("Retry-After", String(retryAfterSec));
  return res;
}

export async function POST(req: Request) {
  try {
    const rl = checkRateLimit(`analyze:${clientIp(req)}`, 10, 60_000);
    if (!rl.allowed) {
      return errorResponse(429, "rate_limited", "Too many analysis requests. Please wait a moment and try again.", rl.retryAfterSec);
    }

    const body = (await req.json().catch(() => null)) as AnalyzeBody | null;
    const action = body?.action;
    if (!action || !ACTIONS.includes(action)) {
      throw new ValidationError(`action must be one of: ${ACTIONS.join(", ")}.`);
    }

    const technicalMode = body?.technicalMode === true;
    const language = normalizeLanguage(body?.language);
    const langRule = languageInstruction(language);
    const summary = typeof body?.summary === "string" ? body.summary.slice(0, 3000) : null;
    const history = Array.isArray(body?.conversation)
      ? trimHistory(
          (body.conversation as ChatMessage[]).filter(
            (m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
          ),
        ).slice(-6)
      : [];

    // "summarize" of the conversation is text-only (no screenshot needed).
    if (action === "summarize" && !body?.image) {
      if (history.length === 0) throw new ValidationError("conversation is required for summarize without an image.");
      const { text: modelText } = getModelConfig();
      const { text } = await groqComplete({
        model: modelText,
        maxTokens: 500,
        messages: [
          {
            role: "system",
            content:
              language === "ar"
                ? `لخّص جلسة الدعم التقني في 5 أسطر قصيرة بالعربية تماماً: المشكلة / البيئة / المرصود / الإجراءات / الحالة الحالية. استخدم فقط حقائق من المحادثة. بدون نصائح.\n\n${langRule}`
                : `Summarize the technical support session into exactly 5 short lines: Problem / Environment / Observed / Actions / Current State. Only use facts from the conversation. No advice.\n\n${langRule}`,
          },
          ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user", content: language === "ar" ? "اكتب ملخص الجلسة من 5 أسطر الآن." : "Write the 5-line session summary now." },
        ],
      });
      return NextResponse.json({ result: text, model: modelText, action });
    }

    const image = validateDataUrlImage(body?.image ?? null, "image", true);
    const previousImage =
      action === "what-changed"
        ? validateDataUrlImage(body?.previousImage ?? null, "previousImage", true)
        : validateDataUrlImage(body?.previousImage ?? null, "previousImage", false);

    const { vision } = getModelConfig();
    const system = technicalMode
      ? `You are open Support, a visual technical support assistant in Technical Mode. Structure answers as: Error / Root Cause / Evidence / Recommended Action / Verification. Never invent details not visible or stated.\n\n${langRule}`
      : `You are open Support, a visual technical support assistant. Describe only what you can observe. Never invent file names, error text, or UI elements. If unsure, say so clearly.\n\n${langRule}`;

    const userContent: Array<
      { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
    > = [];
    if (previousImage) {
      userContent.push({ type: "text", text: "Previous screen frame:" });
      userContent.push({ type: "image_url", image_url: { url: previousImage } });
    }
    userContent.push({ type: "text", text: "Current screen frame:" });
    userContent.push({ type: "image_url", image_url: { url: image as string } });
    if (summary) {
      userContent.push({ type: "text", text: `Session summary so far:\n${summary.slice(0, 1500)}` });
    }
    if (history.length > 0) {
      userContent.push({
        type: "text",
        text: `Recent conversation:\n${history.map((m) => `${m.role}: ${m.content}`).join("\n").slice(0, 3000)}`,
      });
    }
    userContent.push({ type: "text", text: actionPrompt(action, language) });

    const { text } = await groqComplete({
      model: vision,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    });
    return NextResponse.json({ result: text, model: vision, action });
  } catch (err) {
    if (err instanceof ValidationError) {
      return errorResponse(err.status, err.code, err.message);
    }
    if (err instanceof GroqError) {
      return errorResponse(err.status, err.code, err.message, err.retryAfterSec ?? undefined);
    }
    console.error("analyze route error", err);
    return errorResponse(500, "internal_error", "Unexpected server error. Try again.");
  }
}
