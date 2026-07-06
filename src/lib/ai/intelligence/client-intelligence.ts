import { getAdminCRMContacts } from "@/lib/admin-os-server";
import { prisma } from "@/lib/db";
import type { ClientIntelligenceSummary, ClientIntelProfile } from "../types";

function parseService(data: string): string {
  try {
    const d = JSON.parse(data) as Record<string, unknown>;
    const types = d.serviceTypes as string[] | undefined;
    return types?.[0] || (d.serviceType as string) || "Portrait";
  } catch {
    return "Portrait";
  }
}

function parseBirthday(data: string): string | null {
  try {
    const d = JSON.parse(data) as Record<string, unknown>;
    const b = d.birthday || d.dateOfBirth;
    return b ? String(b) : null;
  } catch {
    return null;
  }
}

export async function getClientIntelligenceSummary(limit = 20): Promise<ClientIntelligenceSummary> {
  const crm = await getAdminCRMContacts();
  const top = crm
    .filter((c) => c.email)
    .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings)
    .slice(0, limit);

  const clients: ClientIntelProfile[] = [];

  for (const c of top) {
    const subs = await prisma.submission.findMany({
      where: { contactEmail: c.email },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { type: true, data: true, createdAt: true, status: true },
    });

    const bookingSubs = subs.filter((s) => s.type === "booking");
    const services = [...new Set(bookingSubs.map((s) => parseService(s.data)))];
    const lastBooking = bookingSubs[0]?.createdAt.toISOString() ?? null;
    const daysSince = (Date.now() - new Date(c.lastActivity).getTime()) / 86400000;

    let churnRisk: ClientIntelProfile["churnRisk"] = "low";
    if (daysSince > 90 && c.bookings > 0) churnRisk = "high";
    else if (daysSince > 60) churnRisk = "medium";

    const upsells: string[] = [];
    if (c.status === "vip" || c.revenue > 3000) upsells.push("Premium editorial package or annual portrait plan");
    if (c.bookings === 1) upsells.push("Second session within 6 months — loyalty pricing");
    if (c.tags.includes("Sessions")) upsells.push("ÉLEVÉ Sessions alumni portrait add-on");

    const birthday =
      bookingSubs.map((s) => parseBirthday(s.data)).find(Boolean) ?? null;

    clients.push({
      email: c.email,
      name: c.name,
      lifetimeValue: c.revenue,
      totalSessions: c.bookings + c.applications,
      lastBooking,
      favoriteServices: services.length ? services : ["Portrait"],
      referralCount: c.tags.filter((t) => t.toLowerCase().includes("referral")).length,
      birthdayReminder: birthday,
      upsellOpportunities: upsells,
      followUpReminder:
        churnRisk !== "low"
          ? `No activity in ${Math.round(daysSince)} days — re-engage before LTV decays`
          : null,
      churnRisk,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    clients,
    atRiskCount: clients.filter((c) => c.churnRisk !== "low").length,
    totalLtv: clients.reduce((s, c) => s + c.lifetimeValue, 0),
  };
}
