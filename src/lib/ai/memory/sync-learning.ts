import { searchMemories } from "./store";
import { recordLearningOutcome } from "./learning";
import { getWorkspaceId } from "./workspace";

/** Infer learning outcomes from synced memories — improves future recommendations */
export async function runLearningPass(): Promise<{ recorded: number }> {
  const workspaceId = getWorkspaceId();
  let recorded = 0;

  const [{ items: marketing }, { items: creative }, { items: financial }, { items: business }] =
    await Promise.all([
      searchMemories({ workspaceId, layer: "marketing", limit: 10 }),
      searchMemories({ workspaceId, layer: "creative", limit: 10 }),
      searchMemories({ workspaceId, layer: "financial", limit: 5 }),
      searchMemories({ workspaceId, layer: "business", limit: 5 }),
    ]);

  const channelMemory = marketing.find((m) => m.category === "channel_roi");
  if (channelMemory) {
    const instagram = channelMemory.value.instagram as { visits30?: number; trend?: number } | undefined;
    if ((instagram?.visits30 ?? 0) > 20) {
      await recordLearningOutcome({
        workspaceId,
        domain: "marketing",
        actionType: "instagram_traffic",
        hypothesis: "Instagram referrals correlate with studio visibility",
        outcome: (instagram?.trend ?? 0) >= 0 ? "positive" : "neutral",
        metrics: { visits30: instagram?.visits30, trend: instagram?.trend },
        memoryIds: [channelMemory.id],
        confidence: 0.72,
      });
      recorded += 1;
    }
  }

  const topProject = creative.find((m) => m.category === "performance");
  if (topProject) {
    const pageviews = topProject.value.pageviews as number | undefined;
    await recordLearningOutcome({
      workspaceId,
      domain: "creative",
      actionType: "portfolio_feature",
      hypothesis: "Featured portfolio projects drive inbound interest",
      outcome: (pageviews ?? 0) > 30 ? "positive" : "neutral",
      metrics: { pageviews },
      revenueImpact: (pageviews ?? 0) > 50 ? 1200 : undefined,
      memoryIds: [topProject.id],
      confidence: 0.68,
    });
    recorded += 1;
  }

  const riskMemory = financial.find((m) => m.category === "risk");
  if (riskMemory) {
    await recordLearningOutcome({
      workspaceId,
      domain: "sales",
      actionType: "stale_inquiry_recovery",
      hypothesis: "Speed-to-lead on stale inquiries protects pipeline value",
      outcome: "positive",
      metrics: riskMemory.value,
      revenueImpact: Number(riskMemory.value.inactiveClientValue ?? 0) || undefined,
      memoryIds: [riskMemory.id],
      confidence: 0.8,
    });
    recorded += 1;
  }

  const emailMemory = marketing.find((m) => m.category === "email_delivery");
  const businessSnapshot = business.find((m) => m.category === "snapshot");
  if (emailMemory && businessSnapshot) {
    const sent = emailMemory.value.emailSent as number | undefined;
    if ((sent ?? 0) > 0) {
      await recordLearningOutcome({
        workspaceId,
        domain: "operations",
        actionType: "notification_delivery",
        hypothesis: "Automated notifications maintain client communication cadence",
        outcome: (emailMemory.value.emailFailed as number) === 0 ? "positive" : "neutral",
        metrics: { sent, failed: emailMemory.value.emailFailed },
        memoryIds: [emailMemory.id, businessSnapshot.id],
        confidence: 0.65,
      });
      recorded += 1;
    }
  }

  return { recorded };
}
