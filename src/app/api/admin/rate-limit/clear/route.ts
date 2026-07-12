import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { clearRateLimit } from "@/lib/rate-limit";

/** Clear rate-limit rows so legitimate testing isn't locked out for an hour. */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let route = "submit:booking";
  try {
    const body = (await request.json()) as { route?: string };
    if (typeof body.route === "string" && body.route.trim()) {
      route = body.route.trim();
    }
  } catch {
    /* default route */
  }

  const cleared = await clearRateLimit(route);
  return NextResponse.json({ ok: true, route, cleared });
}
