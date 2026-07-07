import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCognitiveArchitecture } from "@/lib/ai/cognitive";
import { invalidateIntelligenceCaches } from "@/lib/ai/cognitive/cache";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(request.url).searchParams.get("refresh") === "1";
  if (force) await invalidateIntelligenceCaches();

  const architecture = await getCognitiveArchitecture(force);
  return NextResponse.json(architecture);
}
