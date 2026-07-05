import { getAdminCRMContacts } from "@/lib/admin-os-server";
import { prisma } from "@/lib/db";
import type { ClientMarketingProfile } from "./types";

function parseService(data: string): string {
  try {
    const d = JSON.parse(data) as Record<string, unknown>;
    return (d.serviceType as string) || (d.service as string) || "Portrait";
  } catch {
    return "Portrait";
  }
}

export async function buildClientMarketingProfiles(limit = 25): Promise<ClientMarketingProfile[]> {
  const crm = await getAdminCRMContacts();
  const topClients = crm
    .filter((c) => c.email)
    .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings)
    .slice(0, limit);

  const profiles: ClientMarketingProfile[] = [];

  for (const client of topClients) {
    const submissions = await prisma.submission.findMany({
      where: { contactEmail: client.email },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { type: true, data: true, status: true, notes: true, createdAt: true },
    });

    const bookingSubs = submissions.filter((s) => s.type === "booking");
    const sessionSubs = submissions.filter((s) => s.type === "session");
    const services = bookingSubs.map((s) => parseService(s.data));
    const daysSince = (Date.now() - new Date(client.lastActivity).getTime()) / 86400000;

    let retentionRisk: ClientMarketingProfile["retentionRisk"] = "low";
    if (daysSince > 90 && client.bookings > 0) retentionRisk = "high";
    else if (daysSince > 60) retentionRisk = "medium";

    const recommendations: string[] = [];
    if (retentionRisk === "high") {
      recommendations.push("Send personalized re-engagement email with recent portfolio work");
    }
    if (client.revenue > 2000) {
      recommendations.push("VIP treatment — offer priority booking window");
    }
    if (client.bookings >= 2) {
      recommendations.push("Request testimonial and referral introduction");
    }
    if (sessionSubs.length > 0) {
      recommendations.push("Sessions alum — promote next volume applications");
    }

    profiles.push({
      email: client.email,
      name: client.name,
      preferences: services.length ? [...new Set(services)] : ["Portrait"],
      favoriteStyles: services.slice(0, 2),
      averageSpend: client.bookings > 0 ? Math.round(client.revenue / client.bookings) : client.revenue,
      bookingHistory: client.bookings,
      referrals: client.tags.includes("referral") ? 1 : 0,
      communicationStyle: client.instagram ? "Visual-first (Instagram)" : "Email-primary",
      sessionHistory: sessionSubs.map((s) => `Application ${new Date(s.createdAt).toLocaleDateString()}`),
      feedback: submissions.filter((s) => s.notes).map((s) => s.notes!).slice(0, 2),
      satisfactionScore: client.status === "vip" ? 95 : client.status === "repeat" ? 85 : 70,
      retentionRisk,
      personalizedRecommendations: recommendations,
    });
  }

  return profiles;
}
