import { NextResponse } from "next/server";
import { getModelConfig, isGroqConfigured } from "@/lib/groq";

export const runtime = "nodejs";

export async function GET() {
  const models = getModelConfig();
  return NextResponse.json({
    ok: true,
    groqConfigured: isGroqConfigured(),
    visionModel: models.vision,
    textModel: models.text,
    screenSharingSupported: true, // evaluated in the browser; see Workspace capability check
    timestamp: new Date().toISOString(),
  });
}
