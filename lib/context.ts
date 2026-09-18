import type { GroqMessage } from "./groq";
import type { AnalyzeAction, ChatMessage } from "./types";

const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 6000;

export const BASE_SYSTEM_PROMPT = `You are "open Support", a visual technical support assistant. You help users understand what is visible on their shared screen: code editors, terminals, browsers, error pages, consoles, settings, and logs.

Rules:
- Only describe what you can actually observe from the provided screenshot(s) and conversation. Never invent file names, error text, URLs, versions, or UI elements that are not visible or stated.
- If you cannot confidently identify the cause from the current screen, say so clearly (for example: "I can't confidently identify the cause from the current screen. Please open the error details.") and ask for the specific view you need.
- Be direct and useful. Short answers first, then details.
- When giving steps, number them and keep each step actionable.
- If the user shares credentials, keys, or personal data, warn them once to remove it and do not repeat it.

Language & bilingual formatting (critical):
- Always reply in the SAME language the user used. If the user writes in Arabic, reply in Arabic. If in English, reply in English.
- When the response contains BOTH Arabic and English, keep it perfectly organized and never garbled: do NOT mix Arabic and English words inline without separation. Write Arabic sentences fully in Arabic, and put every English technical term, file name, path, command, code, error message, URL, or variable inside inline code with backticks (e.g. \`next.config.js\`, \`npm install\`, \`Cannot find module\`) or in a fenced code block. Backticks create an isolated LTR fragment so the text does not get scrambled.
- Use clear visual structure: headings, numbered steps, and bullet lists. Separate Arabic explanations from English technical content — either on different lines or inside code blocks. Never write a long line that alternates Arabic and English multiple times.
- All code blocks, commands, and quoted errors must stay strictly LTR.`;

export const TECHNICAL_SYSTEM_PROMPT = `${BASE_SYSTEM_PROMPT}

When Technical Mode is ON, structure every diagnostic answer exactly as:
1. Error — one-line description of the observed problem.
2. Root Cause — most likely cause with uncertainty stated.
3. Evidence — what in the screen supports this (quote visible text).
4. Recommended Action — numbered fix steps.
5. Verification — how the user confirms the fix worked.`;

export function trimHistory(messages: ChatMessage[]): { role: "user" | "assistant"; content: string }[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .filter((m) => m.content.trim().length > 0)
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content.slice(0, MAX_MESSAGE_CHARS),
    }));
}

function imagePart(label: string, dataUrl: string) {
  return [
    { type: "text" as const, text: label },
    { type: "image_url" as const, image_url: { url: dataUrl } },
  ];
}

interface VisionRequest {
  question: string;
  currentImage: string | null;
  previousImage?: string | null;
  history: { role: "user" | "assistant"; content: string }[];
  summary: string | null;
  technicalMode: boolean;
}

export function buildVisionMessages(req: VisionRequest): GroqMessage[] {
  const system = req.technicalMode ? TECHNICAL_SYSTEM_PROMPT : BASE_SYSTEM_PROMPT;
  const messages: GroqMessage[] = [{ role: "system", content: system }];
  if (req.summary) {
    messages.push({
      role: "system",
      content: `Session summary so far (from earlier conversation, no screenshots stored):\n${req.summary.slice(0, 2000)}`,
    });
  }
  for (const h of req.history) {
    messages.push({ role: h.role, content: h.content });
  }
  const userContent: GroqMessage["content"] = [];
  if (req.previousImage) {
    userContent.push(...imagePart("Previous screen frame (for comparison):", req.previousImage));
  }
  if (req.currentImage) {
    userContent.push(
      ...imagePart(
        req.previousImage
          ? "Current screen frame (compare with the previous frame):"
          : "Current screen frame shared by the user:",
        req.currentImage,
      ),
    );
  }
  (userContent as { type: string; text?: string }[]).push({
    type: "text",
    text: req.question,
  });
  messages.push({ role: "user", content: userContent });
  return messages;
}

const ACTION_PROMPTS: Record<AnalyzeAction, string> = {
  analyze: `Analyze this screen. Report: (1) Visible Application — what app/window is shown. (2) Potential Issue — any visible error or problem, quoting exact visible text. (3) Important Information — file names, routes, versions, codes you can read. (4) Suggested Next Step — one concrete action. If nothing looks wrong, say what the screen shows and that no issue is visible.`,
  "explain-error": `Read every visible error message, log line, or stack trace on this screen. Quote the exact error text you can read, explain in plain words what it means, list the most likely cause(s), and give numbered fix steps. If no error text is legible, say exactly that and tell the user which panel to open or zoom.`,
  "what-changed": `Two frames are provided: previous, then current. Describe precisely What Changed between them (navigation, new errors, edited code, opened/closed panels, different values). If they look identical, say so. Do not invent differences.`,
  "next-step": `Based on the visible screen state, give the single most useful next step plus two short follow-ups. Be concrete (exact button, command, or file to open). If the goal is unclear, state your assumption and ask one clarifying question.`,
  summarize: `Summarize the technical situation visible on this screen in 5 short lines: Problem / Environment / Observed / Likely cause / Current state. Only use information visible in the screenshot or already stated in the conversation.`,
};

export function actionPrompt(action: AnalyzeAction): string {
  return ACTION_PROMPTS[action];
}

export function validateDataUrlImage(value: unknown, field: string, required: boolean): string | null {
  if (value === undefined || value === null || value === "") {
    if (required) throw new ValidationError(`${field} is required.`);
    return null;
  }
  if (typeof value !== "string") throw new ValidationError(`${field} must be a base64 data URL string.`);
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(value)) {
    throw new ValidationError(`${field} must be a JPEG, PNG, or WebP data URL.`);
  }
  // ~5.5 MB binary equivalent cap keeps Groq payloads (20 MB limit) safe.
  if (value.length > 7_500_000) {
    throw new ValidationError(`${field} is too large. Capture at a lower resolution.`);
  }
  return value;
}

export class ValidationError extends Error {
  status = 400;
  code = "validation_error";
  constructor(message: string) {
    super(message);
  }
}
