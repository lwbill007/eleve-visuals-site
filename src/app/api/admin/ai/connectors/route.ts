import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getConnectorHealth, getDisconnectedBlockers, intelligenceDegraded } from "@/lib/ai/platform/connectors";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connectors = getConnectorHealth();
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    connectors,
    degraded: intelligenceDegraded(),
    blockedDecisions: getDisconnectedBlockers(),
  });
}
