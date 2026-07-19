import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import {
  buildRevenueFunnel,
  detectRevenueLeaks,
  totalLeakExposure,
} from "@/lib/ai/executive/revenue-leaks";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const funnel = await buildRevenueFunnel();
  const leaks = await detectRevenueLeaks(funnel);
  const exposure = totalLeakExposure(leaks);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    exposure,
    recoverable: leaks.reduce((s, l) => s + l.recoveryPotential, 0),
    funnel,
    leaks,
  });
}
