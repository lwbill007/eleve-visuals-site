import type { ExecutionDraft } from "../types";
import { getOperatorMetrics, OS_ROUTES } from "./business-operator";

export async function getExecutionDrafts(): Promise<ExecutionDraft[]> {
  const metrics = await getOperatorMetrics();
  const drafts: ExecutionDraft[] = [];

  if (metrics.attention.abandonedInquiries > 0) {
    drafts.push({
      id: "draft-abandoned-email",
      type: "follow_up",
      title: "Abandoned booking follow-up emails",
      description: `${metrics.attention.abandonedInquiries} inquiries ready for personalized recovery sequence.`,
      status: "ready",
      href: `${OS_ROUTES.marketingFollowUp}&focus=abandoned`,
      prompt: `Write follow-up for ${metrics.attention.abandonedInquiries} abandoned portrait booking inquiries`,
      estimatedMinutes: 20,
    });
  }

  if (metrics.attention.followUpClients > 0) {
    drafts.push({
      id: "draft-client-reengage",
      type: "follow_up",
      title: "Inactive client re-engagement",
      description: `Target ${metrics.attention.followUpClients} past clients (~$${metrics.attention.followUpValue.toLocaleString()} value).`,
      status: "ready",
      href: OS_ROUTES.marketingFollowUp,
      prompt: "Re-engagement email for inactive portrait clients",
      estimatedMinutes: 30,
    });
  }

  if (metrics.month.bookingsChange <= -10) {
    drafts.push({
      id: "draft-recovery-campaign",
      type: "launch_campaign",
      title: "Booking recovery campaign",
      description: "Multi-channel push to reverse booking decline this month.",
      status: "needs_review",
      href: "/admin/marketing?focus=launch_campaign",
      prompt: "Recovery campaign for slow booking month at ÉLEVÉ Visuals",
      estimatedMinutes: 45,
    });
  }

  drafts.push({
    id: "draft-instagram",
    type: "instagram_caption",
    title: "Instagram content draft",
    description: "Portfolio or session BTS caption based on current traffic winners.",
    status: "ready",
    href: "/admin/marketing?focus=instagram_caption",
    prompt: `Instagram carousel for top page ${metrics.traffic.topPage}`,
    estimatedMinutes: 15,
  });

  if (metrics.traffic.conversionRate < 3) {
    drafts.push({
      id: "draft-newsletter",
      type: "newsletter",
      title: "Newsletter draft",
      description: "Drive traffic back to booking flow with portfolio highlights.",
      status: "ready",
      href: "/admin/marketing?focus=newsletter",
      prompt: "Newsletter highlighting portfolio and booking CTA",
      estimatedMinutes: 35,
    });
  }

  return drafts;
}
