import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runExecutiveQA } from "@/lib/ai/truth/executive-qa";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await runExecutiveQA();
  return NextResponse.json(report);
}
