import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runStrategySimulation, listSimulationScenarios } from "@/lib/ai/cognitive/strategy-simulator";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ scenarios: listSimulationScenarios() });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { guardMutatingAdminAi } = await import("@/lib/admin-request-guard");
  const blocked = await guardMutatingAdminAi(req, "admin-ai:cognitive");
  if (blocked) return blocked;

  const body = (await req.json()) as { scenarioId?: string };
  if (!body.scenarioId) {
    return NextResponse.json({ error: "scenarioId required" }, { status: 400 });
  }

  const result = await runStrategySimulation(body.scenarioId);
  return NextResponse.json(result);
}
