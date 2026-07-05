import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateContentCalendar } from "@/lib/ai/intelligence/content-calendar";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const forceAI = new URL(request.url).searchParams.get("ai") === "1";
  const calendar = await generateContentCalendar(forceAI);
  return NextResponse.json(calendar);
}
