import { NextResponse } from "next/server";
import { runDigest } from "@/lib/notifications";

/**
 * Periodic digest endpoint. Triggered by Vercel Cron daily; the digest module
 * decides whether to actually send based on the admin's frequency setting.
 *
 * Protected by CRON_SECRET when set. Vercel Cron sends it as a Bearer token.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runDigest();
  return NextResponse.json(result);
}
