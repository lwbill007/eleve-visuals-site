import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateAIContent } from "@/lib/ai/service";
import type { AIGenerateTask } from "@/lib/ai/types";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const task = (body.task || "general") as AIGenerateTask;
  const prompt = String(body.prompt || "");
  const context = body.context && typeof body.context === "object" ? body.context : undefined;

  if (!prompt.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  const result = await generateAIContent({ task, prompt, context });
  return NextResponse.json(result);
}
