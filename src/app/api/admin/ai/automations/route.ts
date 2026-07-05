import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  createAutomationFromPrompt,
  deleteAutomation,
  listAutomations,
  toggleAutomation,
} from "@/lib/ai/intelligence/automations";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const automations = await listAutomations();
  return NextResponse.json({ automations });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { prompt?: string; action?: string; id?: string; enabled?: boolean };

  if (body.action === "toggle" && body.id) {
    await toggleAutomation(body.id, !!body.enabled);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "delete" && body.id) {
    await deleteAutomation(body.id);
    return NextResponse.json({ ok: true });
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: "Prompt required" }, { status: 400 });
  }

  const result = await createAutomationFromPrompt(body.prompt.trim());
  return NextResponse.json(result);
}
