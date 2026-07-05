import { getAdminCRMContacts } from "@/lib/admin-os-server";
import { buildClientMarketingProfiles } from "../../marketing/client-intel";
import type { ExecutiveRoleBrief } from "../types";
import { ROLE_META } from "../types";

export async function buildClientSuccessBrief(): Promise<ExecutiveRoleBrief> {
  const [crm, profiles] = await Promise.all([
    getAdminCRMContacts(),
    buildClientMarketingProfiles(20),
  ]);

  const inactive = crm.filter((c) => {
    const days = (Date.now() - new Date(c.lastActivity).getTime()) / 86400000;
    return days > 60;
  });
  const vip = crm.filter((c) => c.status === "vip" || c.revenue > 2000);
  const atRisk = profiles.filter((p) => p.retentionRisk === "high");
  const repeatRate = crm.length
    ? Math.round((crm.filter((c) => c.bookings > 1).length / crm.length) * 100)
    : 0;

  const health = Math.min(100, Math.max(30, 50 + repeatRate / 2 - atRisk.length * 5));

  return {
    id: "client_success",
    title: ROLE_META.client_success.title,
    mission: ROLE_META.client_success.mission,
    healthScore: health,
    confidence: 0.84,
    topPriority:
      atRisk.length > 0
        ? `Re-engage ${atRisk.length} at-risk clients before churn`
        : inactive.length > 0
          ? `${inactive.length} clients inactive 60+ days`
          : "Request testimonials from VIP clients",
    insights: [
      { text: `${crm.length} CRM contacts · ${vip.length} VIP/high-value`, kind: "fact" },
      { text: `${repeatRate}% repeat booking rate`, kind: "fact" },
      {
        text: `~$${inactive.reduce((s, c) => s + c.revenue, 0).toLocaleString()} in inactive client LTV`,
        kind: "prediction",
      },
      ...(atRisk[0]
        ? [{ text: `At risk: ${atRisk[0].name} — ${atRisk[0].personalizedRecommendations[0]}`, kind: "suggestion" as const }]
        : []),
    ],
    recommendations: profiles
      .filter((p) => p.retentionRisk !== "low")
      .slice(0, 3)
      .map((p) => ({
        id: `cs-${p.email}`,
        title: `Personalize outreach: ${p.name}`,
        detail: p.personalizedRecommendations[0] ?? "Schedule follow-up",
        why: `${p.bookingHistory} bookings · $${p.averageSpend} avg · ${p.retentionRisk} retention risk`,
        kind: "suggestion" as const,
        confidence: 0.8,
        expectedImpact: `$${p.averageSpend}+ potential repeat`,
        actions: [
          { id: "crm", label: "Open CRM", type: "open_crm", href: `/admin/crm/${encodeURIComponent(p.email)}` },
        ],
      })),
    metrics: [
      { label: "Contacts", value: String(crm.length), source: "CRM" },
      { label: "Inactive", value: String(inactive.length), source: "CRM" },
      { label: "At risk", value: String(atRisk.length), source: "Client intel" },
      { label: "Repeat rate", value: `${repeatRate}%`, source: "CRM" },
    ],
    href: ROLE_META.client_success.href,
  };
}
