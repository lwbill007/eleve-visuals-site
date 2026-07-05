import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getLearningTimeline, getRefreshReport } from "@/lib/ai/memory/knowledge";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const refreshId = url.searchParams.get("refreshId");
  const limit = Number(url.searchParams.get("limit") ?? 50);

  if (refreshId) {
    const report = await getRefreshReport(refreshId);
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ report });
  }

  const events = await getLearningTimeline(limit);
  return NextResponse.json({ events });
}
