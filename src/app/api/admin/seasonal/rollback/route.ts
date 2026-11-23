import { NextResponse } from "next/server";
import { requireMinimumRole } from "@/lib/auth";
import { rejectIfNotSameSite } from "@/lib/seasonal/request-guard";
import { logActivity } from "@/lib/activity-log";
import { resolveSeasonal, SEASONAL_REASON_LABELS } from "@/lib/seasonal/resolve";
import { rollbackConfig } from "@/lib/seasonal/server";

export const dynamic = "force-dynamic";

/** Restore the previously published seasonal configuration. Admin/owner only. */
export async function POST(request: Request) {
  const cross = rejectIfNotSameSite(request);
  if (cross) return cross;
  let session;
  try {
    session = await requireMinimumRole("admin");
  } catch {
    return NextResponse.json({ error: "Only an owner or admin can roll back." }, { status: 403 });
  }

  const actor = session.email ?? session.name ?? session.role;
  const restored = await rollbackConfig(actor);
  if (!restored) {
    return NextResponse.json({ error: "There is no earlier published version to restore." }, { status: 404 });
  }
  const live = resolveSeasonal(restored);
  void logActivity({
    actor,
    action: "seasonal.rollback",
    target: "Seasonal Campaigns",
    details: `Rolled back to mode "${restored.mode}". Live now: ${SEASONAL_REASON_LABELS[live.reason]}`,
    request,
  });
  return NextResponse.json({
    ok: true,
    published: restored,
    live: { campaignId: live.campaign?.id ?? null, reason: live.reason, label: SEASONAL_REASON_LABELS[live.reason] },
  });
}
