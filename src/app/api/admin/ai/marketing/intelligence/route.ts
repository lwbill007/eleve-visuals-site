import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getCMOIntelligence } from "@/lib/ai/marketing";

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const refresh = url.searchParams.get("refresh") === "1";

  const intelligence = await getCMOIntelligence(refresh);
  return NextResponse.json(intelligence);
}
