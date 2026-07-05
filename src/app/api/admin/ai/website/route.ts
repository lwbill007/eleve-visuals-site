import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { analyzeWebsiteOptimization } from "@/lib/ai/intelligence/website";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(req.url).searchParams.get("refresh") === "1";
  if (force) {
    const { invalidateCache } = await import("@/lib/ai/cache");
    await invalidateCache("website").catch(() => {});
  }

  const result = await analyzeWebsiteOptimization();
  return NextResponse.json(result);
}
