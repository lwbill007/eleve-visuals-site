import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateWeeklyExecutiveReport } from "@/lib/ai/intelligence/weekly-executive-report";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const persist = url.searchParams.get("persist") === "1";

  const report = await generateWeeklyExecutiveReport({ persist });
  return NextResponse.json(report);
}
