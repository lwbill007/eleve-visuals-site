import { NextResponse } from "next/server";
import { requireAdmin, requireMinimumRole, roleAtLeast } from "@/lib/auth";
import { rejectIfNotSameSite } from "@/lib/seasonal/request-guard";
import { logActivity } from "@/lib/activity-log";
import { describeIssues, seasonalConfigSchema } from "@/lib/seasonal/schema";
import { resolveSeasonal, SEASONAL_REASON_LABELS } from "@/lib/seasonal/resolve";
import {
  readDraftConfig,
  readHistory,
  readPublishedConfig,
  saveDraft,
} from "@/lib/seasonal/server";

export const dynamic = "force-dynamic";

/** Admin state: published, draft, live resolution and publish history. */
export async function GET() {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [published, draft, history] = await Promise.all([
    readPublishedConfig(),
    readDraftConfig(),
    readHistory(),
  ]);
  const live = resolveSeasonal(published.config);

  return NextResponse.json({
    published: published.config,
    publishedStored: published.stored,
    publishedValid: published.valid,
    draft: draft.config,
    hasDraft: draft.hasDraft,
    live: {
      campaignId: live.campaign?.id ?? null,
      reason: live.reason,
      label: SEASONAL_REASON_LABELS[live.reason],
      nextBoundary: live.nextBoundary,
    },
    history: history.map((entry, index) => ({
      index,
      publishedAt: entry.publishedAt,
      publishedBy: entry.publishedBy,
      mode: entry.config.mode,
      campaignName:
        entry.config.campaigns.find((c) => c.id === entry.config.activeCampaignId)?.name ?? "",
    })),
    canPublish: roleAtLeast(session, "admin"),
    canEdit: roleAtLeast(session, "editor"),
  });
}

/** Save a draft. Drafts are never read by public visitors. */
export async function PUT(request: Request) {
  const cross = rejectIfNotSameSite(request);
  if (cross) return cross;
  let session;
  try {
    session = await requireMinimumRole("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = seasonalConfigSchema.safeParse((body as { config?: unknown } | null)?.config);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Some campaign settings are invalid.", issues: describeIssues(parsed.error) },
      { status: 400 }
    );
  }

  await saveDraft(parsed.data);
  void logActivity({
    actor: session.email ?? session.role,
    action: "seasonal.draft.save",
    target: "Seasonal Campaigns",
    details: `Draft saved (mode: ${parsed.data.mode}, campaign: ${parsed.data.activeCampaignId})`,
    request,
  });
  return NextResponse.json({ ok: true });
}
