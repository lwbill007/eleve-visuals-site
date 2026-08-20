import { NextResponse } from "next/server";
import { requireAdmin, requireMinimumRole } from "@/lib/auth";
import { executeAICommand } from "@/lib/ai/intelligence/commands";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";

export async function POST(req: Request) {
  try {
    await requireMinimumRole("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(req, "admin-ai:commands");
  if (blocked) return blocked;

  const { command } = (await req.json()) as { command?: string };
  if (!command?.trim()) {
    return NextResponse.json({ error: "Command required" }, { status: 400 });
  }

  const result = await executeAICommand(command.trim());
  return NextResponse.json(result);
}
