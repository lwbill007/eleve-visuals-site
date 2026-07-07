import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCognitiveArchitecture } from "@/lib/ai/cognitive";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const architecture = await getCognitiveArchitecture();
  return NextResponse.json(architecture);
}
