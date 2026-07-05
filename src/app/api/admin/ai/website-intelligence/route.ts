import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getWebsiteIntelligence } from "@/lib/ai/intelligence/website-intelligence";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const intel = await getWebsiteIntelligence();
  return NextResponse.json(intel);
}
