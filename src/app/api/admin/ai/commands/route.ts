import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { executeAICommand } from "@/lib/ai/intelligence/commands";

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { command } = (await req.json()) as { command?: string };
  if (!command?.trim()) {
    return NextResponse.json({ error: "Command required" }, { status: 400 });
  }

  const result = await executeAICommand(command.trim());
  return NextResponse.json(result);
}
