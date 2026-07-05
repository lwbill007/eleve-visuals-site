import { NextResponse } from "next/server";
import { runDigest } from "@/lib/notifications";

/**
 * Periodic digest endpoint. Triggered by Vercel Cron daily.
 * Requires CRON_SECRET in production (Vercel Cron sends Bearer token).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && !secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runDigest();
  return NextResponse.json(result);
}
