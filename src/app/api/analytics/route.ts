import { NextResponse } from "next/server";
import { z } from "zod";
import { recordPageView, recordEngagement } from "@/lib/analytics-server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const pageViewSchema = z.object({
  path: z.string().trim().min(1).max(500),
  referrer: z.string().max(500).nullable().optional(),
  utmSource: z.string().max(200).nullable().optional(),
  utmMedium: z.string().max(200).nullable().optional(),
  utmCampaign: z.string().max(200).nullable().optional(),
  sessionId: z.string().max(64).nullable().optional(),
});

const engagementSchema = z.object({
  event: z.enum(["form_step", "cta_click", "scroll_depth", "section_view", "funnel"]),
  path: z.string().trim().min(1).max(500),
  sessionId: z.string().max(64).nullable().optional(),
  label: z.string().max(200).optional(),
  step: z.number().int().min(1).max(20).optional(),
  depth: z.number().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(ip, "analytics:pageview");
  if (!rateLimit.ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const parsed = pageViewSchema.safeParse(body);
  if (parsed.success) {
    if (parsed.data.path.startsWith("/admin") || parsed.data.path.startsWith("/api")) {
      return NextResponse.json({ ok: true });
    }
    try {
      await recordPageView(parsed.data);
    } catch {
      return NextResponse.json({ error: "Failed to record" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const engagement = engagementSchema.safeParse(body);
  if (!engagement.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (engagement.data.path.startsWith("/admin")) {
    return NextResponse.json({ ok: true });
  }

  try {
    await recordEngagement(engagement.data);
  } catch {
    return NextResponse.json({ error: "Failed to record" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
