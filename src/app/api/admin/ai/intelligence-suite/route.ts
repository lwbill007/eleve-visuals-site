import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getIntelligenceSuite } from "@/lib/ai/intelligence/intelligence-suite";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const suite = await getIntelligenceSuite();
  return NextResponse.json(suite);
}
