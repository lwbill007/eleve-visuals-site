import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateAIContent } from "@/lib/ai/service";
import type { AIGenerateTask } from "@/lib/ai/types";

// Model-chain fallback + retries can take time; give the function room before Vercel times out.
export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { task?: string; prompt?: string; context?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const task = (body.task || "general") as AIGenerateTask;
  const prompt = String(body.prompt || "");
  const context = body.context && typeof body.context === "object" ? (body.context as Record<string, unknown>) : undefined;

  if (!prompt.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  try {
    const result = await generateAIContent({ task, prompt, context });

    // Best-effort: only record a campaign case study when generation actually produced content.
    if (result.ok && result.content) {
      try {
        const { registerCampaignFromGeneration } = await import("@/lib/ai/marketing/campaign-memory");
        await registerCampaignFromGeneration(task, prompt, result.content);
      } catch {
        /* campaign memory is best-effort */
      }
    }

    // Always 200 with a structured, explainable payload — the client shows the reason on failure.
    return NextResponse.json(result);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Unexpected server error during generation.";
    return NextResponse.json(
      { content: "", provider: "none", ok: false, reason },
      { status: 200 }
    );
  }
}
