import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { generateBusinessReport } from "@/lib/ai/intelligence/reports";
import type { AIReportType } from "@/lib/ai/types";

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type } = (await req.json()) as { type?: AIReportType };
  const reportType = type || "monthly";
  const report = await generateBusinessReport(reportType);
  return NextResponse.json(report);
}
