import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getExecutiveContext } from "@/lib/ai/platform/executive-context";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const force = new URL(req.url).searchParams.get("refresh") === "1";

  try {
    const context = await getExecutiveContext(force);
    return NextResponse.json(context);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resolve executive context" },
      { status: 500 }
    );
  }
}
