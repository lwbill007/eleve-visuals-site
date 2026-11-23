import { NextResponse } from "next/server";
import { requireMinimumRole } from "@/lib/auth";
import { rejectIfNotSameSite } from "@/lib/seasonal/request-guard";
import { logActivity } from "@/lib/activity-log";
import { describeIssues, seasonalConfigSchema } from "@/lib/seasonal/schema";
import { resolveSeasonal, SEASONAL_REASON_LABELS } from "@/lib/seasonal/resolve";
import { publishConfig, readPublishedConfig } from "@/lib/seasonal/server";

export const dynamic = "force-dynamic";

/**
 * Publish a seasonal configuration to the live site. Admin/owner only.
 * `expectedUpdatedAt` guards against overwriting a newer publish made in
 * another browser since this editor loaded.
 */
export async function POST(request: Request) {
  const cross = rejectIfNotSameSite(request);
  if (cross) return cross;
  let session;
  try {
    session = await requireMinimumRole("admin");
  } catch {
    return NextResponse.json({ error: "Only an owner or admin can publish." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as
    | { config?: unknown; expectedUpdatedAt?: string | null }
    | null;
  const parsed = seasonalConfigSchema.safeParse(body?.config);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Some campaign settings are invalid.", issues: describeIssues(parsed.error) },
      { status: 400 }
    );
  }

  const current = await readPublishedConfig();
  if (
    body?.expectedUpdatedAt !== undefined &&
    (current.config.updatedAt ?? null) !== (body.expectedUpdatedAt ?? null)
  ) {
    return NextResponse.json(
      { error: "Someone published a newer version since you opened this page. Reload to see it before publishing." },
      { status: 409 }
    );
  }

  const actor = session.email ?? session.name ?? session.role;
  const published = await publishConfig(parsed.data, actor);
  const live = resolveSeasonal(published);
  void logActivity({
    actor,
    action: "seasonal.publish",
    target: "Seasonal Campaigns",
    details: `Published mode "${published.mode}" for ${published.activeCampaignId}. Live now: ${SEASONAL_REASON_LABELS[live.reason]}`,
    request,
  });

  return NextResponse.json({
    ok: true,
    published,
    live: { campaignId: live.campaign?.id ?? null, reason: live.reason, label: SEASONAL_REASON_LABELS[live.reason] },
  });
}
