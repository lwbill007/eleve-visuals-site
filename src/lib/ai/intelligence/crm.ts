import { prisma } from "@/lib/db";
import { getAdminCRMContacts } from "@/lib/admin-os-server";
import { generateAIContent } from "../service";
import { setAIMemory } from "../memory";
import type { CRMContactIntelligence } from "../types";

function parseSubmissionData(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parseName(data: Record<string, unknown>): string {
  return (
    (typeof data.fullName === "string" && data.fullName) ||
    (typeof data.name === "string" && data.name) ||
    ""
  );
}

export async function getCRMContactIntelligence(email: string): Promise<CRMContactIntelligence | null> {
  const normalized = email.toLowerCase().trim();
  const contacts = await getAdminCRMContacts();
  const contact = contacts.find((c) => c.email === normalized);
  if (!contact) return null;

  const submissions = await prisma.submission.findMany({
    where: {
      OR: [{ contactEmail: normalized }, { contactEmail: { equals: normalized, mode: "insensitive" } }],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, type: true, status: true, data: true, notes: true, createdAt: true },
  });

  const timeline = submissions.map((s) => {
    const data = parseSubmissionData(s.data);
    return {
      id: s.id,
      type: s.type,
      status: s.status,
      label:
        s.type === "booking"
          ? "Booking inquiry"
          : s.type === "session"
            ? "Session application"
            : "Contact form",
      detail: parseName(data) || contact.name,
      createdAt: s.createdAt.toISOString(),
      href:
        s.type === "session"
          ? `/admin/applications?focus=${s.id}`
          : `/admin/submissions?type=${s.type}&focus=${s.id}`,
    };
  });

  const daysSinceActivity = Math.round(
    (Date.now() - new Date(contact.lastActivity).getTime()) / 86400000
  );

  const bookingHistory = submissions
    .filter((s) => s.type === "booking")
    .map((s) => {
      const data = parseSubmissionData(s.data);
      return {
        id: s.id,
        status: s.status,
        service: String(data.serviceType || (Array.isArray(data.serviceTypes) ? data.serviceTypes[0] : "") || ""),
        budget: String(data.budgetRange || ""),
        createdAt: s.createdAt.toISOString(),
      };
    });

  const avgRevenuePerBooking = contact.bookings > 0 ? contact.revenue / contact.bookings : 1500;
  const predictedLTV = Math.round(
    avgRevenuePerBooking * (contact.status === "vip" ? 3.2 : contact.status === "repeat" ? 2.4 : 1.6)
  );

  let bookingProbability = 0.15;
  if (contact.status === "interested") bookingProbability = 0.45;
  if (contact.status === "booked") bookingProbability = 0.85;
  if (contact.status === "completed") bookingProbability = daysSinceActivity > 90 ? 0.25 : 0.55;
  if (contact.status === "repeat" || contact.status === "vip") bookingProbability = 0.7;
  if (daysSinceActivity > 180) bookingProbability *= 0.5;

  const upsells: string[] = [];
  if (contact.bookings >= 1 && contact.applications === 0) upsells.push("ÉLEVÉ Sessions participation");
  if (contact.status === "completed" && contact.bookings === 1) upsells.push("Portrait refresh package");
  if (contact.revenue > 2500) upsells.push("Premium editorial collection");
  if (contact.tags.includes("Sessions")) upsells.push("Cast portfolio feature");

  const recommendedFollowUp =
    daysSinceActivity > 90
      ? `Re-engage — last active ${daysSinceActivity} days ago`
      : daysSinceActivity > 30
        ? `Check in — ${daysSinceActivity} days since last touch`
        : "On track — maintain relationship";

  const recommendedContactDate = new Date();
  if (daysSinceActivity > 90) recommendedContactDate.setDate(recommendedContactDate.getDate() + 1);
  else if (daysSinceActivity > 30) recommendedContactDate.setDate(recommendedContactDate.getDate() + 7);
  else recommendedContactDate.setDate(recommendedContactDate.getDate() + 21);

  const intelligence: CRMContactIntelligence = {
    contact,
    timeline,
    bookingHistory,
    conversationSummary: `${contact.name} has ${contact.bookings} booking${contact.bookings === 1 ? "" : "s"}, ${contact.applications} session application${contact.applications === 1 ? "" : "s"}, and ${contact.contacts} contact form${contact.contacts === 1 ? "" : "s"}. Status: ${contact.status}. Source: ${contact.source}.`,
    predictedLTV,
    bookingProbability: Math.round(bookingProbability * 100),
    recommendedFollowUp,
    recommendedContactDate: recommendedContactDate.toISOString().slice(0, 10),
    upsells,
    isInactive: daysSinceActivity > 90,
    daysSinceActivity,
  };

  await setAIMemory("client", normalized, {
    lastIntelligence: new Date().toISOString(),
    status: contact.status,
    ltv: predictedLTV,
  }).catch(() => {});

  return intelligence;
}

export async function generateCRMContactAI(
  email: string,
  type: "summary" | "email" | "upsell"
): Promise<string> {
  const intel = await getCRMContactIntelligence(email);
  if (!intel) return "Contact not found.";

  const taskMap = {
    summary: "client_summary" as const,
    email: "follow_up" as const,
    upsell: "campaign" as const,
  };

  const promptMap = {
    summary: `Summarize this client's relationship with ÉLEVÉ Visuals including booking history, engagement, and next best action.`,
    email: `Write a personalized follow-up email for ${intel.contact.name}. ${intel.recommendedFollowUp}. Reference their history naturally.`,
    upsell: `Write a personalized upsell offer for: ${intel.upsells.join(", ") || "portrait session"}.`,
  };

  const result = await generateAIContent({
    task: taskMap[type],
    prompt: promptMap[type],
    context: { contact: intel.contact, timeline: intel.timeline.slice(0, 5), upsells: intel.upsells },
  });

  return result.content;
}
