import { NextResponse } from "next/server";
import { requireAdmin, requireMinimumRole } from "@/lib/auth";
import { guardMutatingAdminAi } from "@/lib/admin-request-guard";
import { generateBusinessReport } from "@/lib/ai/intelligence/reports";
import type { AIReportType } from "@/lib/ai/types";

export async function POST(req: Request) {
  try {
    await requireMinimumRole("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const blocked = await guardMutatingAdminAi(req, "admin-ai:reports");
  if (blocked) return blocked;

  const { type } = (await req.json()) as { type?: AIReportType };
  const reportType = type || "monthly";
  const report = await generateBusinessReport(reportType);
  return NextResponse.json(report);
}
