import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { rankSessionApplications, generateApplicationRankingSummary } from "@/lib/ai/intelligence/sessions";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const volumeId = new URL(req.url).searchParams.get("volumeId") || undefined;
  const summary = new URL(req.url).searchParams.get("summary") === "1";

  const ranked = await rankSessionApplications(volumeId);
  if (summary) {
    const text = await generateApplicationRankingSummary(volumeId);
    return NextResponse.json({ ranked, summary: text });
  }
  return NextResponse.json({ ranked });
}
