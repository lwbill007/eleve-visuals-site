import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getConnectorHealth, getDisconnectedBlockers, intelligenceDegraded } from "@/lib/ai/platform/connectors";
import { listKnowledgeConnectors } from "@/lib/ai/connectors/knowledge";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connectors = getConnectorHealth();
  const knowledge = await listKnowledgeConnectors();
  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    connectors,
    knowledge,
    degraded: intelligenceDegraded(),
    blockedDecisions: getDisconnectedBlockers(),
  });
}
