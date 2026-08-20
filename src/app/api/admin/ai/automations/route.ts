import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, requireMinimumRole } from "@/lib/auth";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";
import {
  createAutomationFromPrompt,
  deleteAutomation,
  listAutomations,
  toggleAutomation,
} from "@/lib/ai/intelligence/automations";

const bodySchema = z.object({
  prompt: z.string().trim().max(2000).optional(),
  action: z.enum(["toggle", "delete"]).optional(),
  id: z.string().max(100).optional(),
  enabled: z.boolean().optional(),
});

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
    await requireMinimumRole("admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(req, "admin-ai:automations");
  if (blocked) return blocked;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const body = parsed.data;

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
