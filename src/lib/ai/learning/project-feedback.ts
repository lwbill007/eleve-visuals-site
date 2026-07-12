/**
 * Continuous learning — feed project outcomes back into future recommendations.
 */

import { writeMemory } from "../memory/store";
import { getWorkspaceId } from "../memory/workspace";
import { rememberForAgent } from "../agents/agent-memory";

export interface ProjectOutcomeFeedback {
  submissionId: string;
  clientEmail?: string;
  booked: boolean;
  finalRevenue?: number;
  profit?: number;
  clientRating?: number;
  deliveryDays?: number;
  portfolioFeatured?: boolean;
  notes?: string;
}

export async function recordProjectOutcome(feedback: ProjectOutcomeFeedback) {
  const summary = [
    feedback.booked ? "Booked" : "Did not book",
    feedback.finalRevenue != null ? `Revenue $${feedback.finalRevenue}` : null,
    feedback.profit != null ? `Profit $${feedback.profit}` : null,
    feedback.clientRating != null ? `Rating ${feedback.clientRating}/5` : null,
    feedback.deliveryDays != null ? `Delivery ${feedback.deliveryDays}d` : null,
    feedback.portfolioFeatured ? "Portfolio featured" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  await writeMemory({
    workspaceId: getWorkspaceId(),
    category: "project_outcome",
    layer: "business",
    key: `outcome:${feedback.submissionId}`,
    title: `Project outcome · ${feedback.submissionId.slice(0, 8)}`,
    summary,
    value: { ...feedback, recordedAt: new Date().toISOString() },
    confidence: 0.95,
    importance: feedback.booked ? 0.9 : 0.7,
    source: "system",
    sourceRef: feedback.submissionId,
    tags: ["learning", "outcome", feedback.booked ? "won" : "lost"],
  });

  if (feedback.booked) {
    await rememberForAgent("sales_advisor", {
      key: `win:${feedback.submissionId}`,
      title: "Successful close pattern",
      summary,
      value: feedback as unknown as Record<string, unknown>,
      importance: 0.9,
    });
    await rememberForAgent("business_strategist", {
      key: `margin:${feedback.submissionId}`,
      title: "Revenue / margin outcome",
      summary,
      value: {
        revenue: feedback.finalRevenue,
        profit: feedback.profit,
      },
      importance: 0.85,
    });
  }

  if (feedback.portfolioFeatured) {
    await rememberForAgent("creative", {
      key: `portfolio:${feedback.submissionId}`,
      title: "Portfolio-worthy delivery",
      summary: feedback.notes || summary,
      value: feedback as unknown as Record<string, unknown>,
      importance: 0.8,
    });
  }

  return { ok: true as const, summary };
}
