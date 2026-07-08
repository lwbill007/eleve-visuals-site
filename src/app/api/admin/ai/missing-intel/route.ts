import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getMissingBusinessIntelligence } from "@/lib/ai/platform/missing-intelligence";
import { getConnectorHealth } from "@/lib/ai/platform/connectors";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [missing, connectors] = await Promise.all([
    getMissingBusinessIntelligence(),
    Promise.resolve(getConnectorHealth()),
  ]);

  return NextResponse.json({
    ...missing,
    connectors,
    generatedAt: new Date().toISOString(),
  });
}
