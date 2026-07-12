/**
 * Production intelligence generated immediately after a booking inquiry.
 * Rules-first; optional AI enrichment when configured.
 */

import { writeMemory } from "@/lib/ai/memory/store";
import { aiComplete } from "@/lib/ai/adapter";
import { isAIConfigured } from "@/lib/ai/config";
import { systemPromptForTask } from "@/lib/ai/prompts/system";
import { estimateBudgetValue } from "@/lib/estimate-budget";
import { getPackageById } from "@/lib/booking-packages";

export interface BookingProductionIntel {
  executiveSummary: string;
  creativeBrief: string;
  suggestedPackage: string;
  suggestedTimeline: string;
  suggestedCrew: string[];
  suggestedLocations: string[];
  lightingRecommendations: string[];
  weatherNotes: string;
  goldenHourNotes: string;
  potentialRisks: string[];
  upsellOpportunities: string[];
  recommendedAddOns: string[];
  salesNotes: string;
  estimatedProductionHours: number;
  recommendedFollowUp: string;
  confidence: number;
  generatedAt: string;
  truthLabel: "estimated" | "calculated";
}

type BookingPayload = {
  fullName?: string;
  email?: string;
  packageId?: string;
  addOnIds?: string[];
  projectCategory?: string;
  serviceTypes?: string[];
  feelingPrompt?: string;
  inspirationPrompt?: string;
  purpose?: string;
  goals?: string;
  audience?: string;
  creativeDirection?: string;
  projectVision?: string;
  preferredDate?: string;
  flexibleDate?: string;
  location?: string;
  sessionSetting?: string;
  duration?: string;
  budgetRange?: string;
  projectTimeline?: string;
  deliverables?: string[];
  pinterestLink?: string;
  moodBoardUrl?: string;
  driveLink?: string;
  referralSource?: string;
  qualification?: {
    estimatedProjectValue?: number;
    packageName?: string;
    leadScore?: number;
    upsellOpportunities?: string[];
    recommendedAddOns?: string[];
    aiSummary?: string;
  };
};

function rulesBrief(data: BookingPayload): BookingProductionIntel {
  const pkg = data.packageId ? getPackageById(data.packageId) : undefined;
  const category = pkg?.projectCategory || data.projectCategory || data.serviceTypes?.[0] || "Portrait";
  const budget =
    data.qualification?.estimatedProjectValue ||
    estimateBudgetValue(data.budgetRange || "", data.packageId, data.addOnIds);
  const isVideo = /video|hybrid|film|motion|cinema/i.test(`${category} ${pkg?.family || ""}`);
  const isEvent = /event/i.test(category);
  const outdoor = /location|outdoor|on.?location/i.test(data.sessionSetting || "");
  const hours = pkg?.family === "partnership" ? 12 : isEvent ? 10 : isVideo ? 8 : 5;

  const risks: string[] = [];
  if (!data.preferredDate) risks.push("No preferred date — scheduling risk");
  if (outdoor) risks.push("On-location: weather and golden-hour dependency");
  if (budget > 0 && budget < 1000 && pkg?.family !== "portrait") {
    risks.push("Investment range may constrain package scope");
  }
  if (!data.deliverables?.length) risks.push("Deliverables unspecified");
  if (pkg?.family === "partnership") risks.push("Partnership sale — discovery before proposal");

  const upsells: string[] = [
    ...(data.qualification?.upsellOpportunities || []),
    ...(data.qualification?.recommendedAddOns || []).map((a) => `Add-on: ${a}`),
  ];
  if (!upsells.length) {
    if (!isVideo) upsells.push("Add short-form video / social cutdowns");
    upsells.push("Same-day selects for social");
    if (outdoor) upsells.push("Second location or blue-hour extension");
  }

  return {
    executiveSummary:
      data.qualification?.aiSummary ||
      `${data.fullName || "Client"} inquired for ${pkg?.name || category}${
        data.location ? ` in ${data.location}` : ""
      }. Investment signal ~$${budget || 1500} (estimated). Priority: discovery call within 24h.`,
    creativeBrief: [
      data.feelingPrompt && `Feeling: ${data.feelingPrompt}`,
      data.inspirationPrompt && `Inspiration: ${data.inspirationPrompt}`,
      data.purpose && `Purpose: ${data.purpose}`,
      data.goals && `Goals: ${data.goals}`,
      data.audience && `Audience: ${data.audience}`,
      data.creativeDirection && `Direction: ${data.creativeDirection}`,
      data.projectVision && `Story: ${data.projectVision}`,
    ]
      .filter(Boolean)
      .join("\n") || "Creative brief pending discovery conversation.",
    suggestedPackage:
      pkg?.name ||
      data.qualification?.packageName ||
      (isVideo
        ? "Hybrid Signature — photo + hero film"
        : isEvent
          ? "Event Documentary — coverage + highlight"
          : "Portrait Signature — directed session + selects"),
    suggestedTimeline: data.projectTimeline?.trim()
      ? data.projectTimeline
      : pkg?.estimatedTimeline ||
        "Inquiry → Consultation → Proposal → Retainer → Planning → Production → Delivery",
    suggestedCrew: isVideo
      ? ["Director / DP", "1st AC or grip", "Producer (part-day)"]
      : isEvent
        ? ["Lead photographer", "Second shooter"]
        : ["Lead photographer", "Optional assistant"],
    suggestedLocations: data.location
      ? [data.location, outdoor ? "Backup covered location" : "Studio control"]
      : ["Studio", "Client-preferred location TBD"],
    lightingRecommendations: outdoor
      ? ["Prioritize golden hour", "Silk / reflector kit", "Practical fill for shade"]
      : ["Soft key + rim", "Controlled background separation", "Catchlight consistency"],
    weatherNotes: outdoor
      ? "Monitor forecast 72h out; hold indoor backup."
      : "Studio-controlled — weather low risk.",
    goldenHourNotes: outdoor
      ? `Target golden hour near ${data.preferredDate || "preferred date"} if outdoor hero frames matter.`
      : "N/A for fully studio productions.",
    potentialRisks: risks.length ? risks : ["Standard scheduling / scope alignment"],
    upsellOpportunities: upsells.slice(0, 6),
    recommendedAddOns:
      data.qualification?.recommendedAddOns ||
      pkg?.recommendedAddOnIds ||
      ["Rush edit", "Print suite", "Usage license expansion"],
    salesNotes: [
      pkg ? `Client self-selected ${pkg.name} (from $${pkg.startingPrice}).` : null,
      data.addOnIds?.length ? `Add-ons: ${data.addOnIds.join(", ")}.` : "No add-ons yet.",
      `Referral: ${data.referralSource || "unknown"}.`,
      typeof data.qualification?.leadScore === "number"
        ? `Lead score ${data.qualification.leadScore}/100.`
        : null,
      `Respond within 24h. Investment signal ~$${budget || 1500} (estimated).`,
    ]
      .filter(Boolean)
      .join(" "),
    estimatedProductionHours: hours,
    recommendedFollowUp:
      pkg?.family === "partnership"
        ? "Schedule strategy consultation within 12 hours — partnership sale."
        : "Personal email within 24 hours confirming receipt + 2 discovery windows.",
    confidence: pkg ? 0.78 : 0.72,
    generatedAt: new Date().toISOString(),
    truthLabel: "estimated",
  };
}

export async function generateBookingProductionIntel(
  data: BookingPayload
): Promise<BookingProductionIntel> {
  const base = rulesBrief(data);

  if (!isAIConfigured()) return base;

  try {
    const result = await aiComplete({
      messages: [
        {
          role: "system",
          content: systemPromptForTask(
            "You are ÉLEVÉ Visuals production lead. Return concise JSON only with keys: executiveSummary, creativeBrief, suggestedPackage, suggestedTimeline, salesNotes, recommendedFollowUp. Be specific to the inquiry. No fluff."
          ),
        },
        {
          role: "user",
          content: JSON.stringify({
            category: data.projectCategory,
            purpose: data.purpose,
            goals: data.goals,
            vision: data.projectVision,
            location: data.location,
            budget: data.budgetRange,
            date: data.preferredDate,
          }),
        },
      ],
      maxTokens: 700,
    });

    if (!result?.content) return base;
    const text = result.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return base;
    const parsed = JSON.parse(jsonMatch[0]) as Partial<BookingProductionIntel>;
    return {
      ...base,
      ...Object.fromEntries(
        Object.entries(parsed).filter(([, v]) => typeof v === "string" && v.trim())
      ),
      confidence: Math.min(0.88, base.confidence + 0.08),
      truthLabel: "estimated",
      generatedAt: new Date().toISOString(),
    };
  } catch {
    return base;
  }
}

export async function persistBookingProductionIntel(
  submissionId: string,
  data: BookingPayload
): Promise<BookingProductionIntel> {
  const intel = await generateBookingProductionIntel(data);

  // Modular orchestrator — evidence, multi-agent audit, action plan
  try {
    const { runOrchestrator } = await import("@/lib/ai/orchestrator");
    await runOrchestrator({
      taskKind: "booking_submitted",
      submissionId,
      data: data as Record<string, unknown>,
      email: data.email,
    });
  } catch {
    /* orchestrator is non-blocking */
  }

  await writeMemory({
    layer: "business",
    category: "booking_brief",
    key: `brief-${submissionId}`,
    title: `Creative Brief: ${data.fullName || submissionId}`,
    summary: intel.executiveSummary,
    value: { ...intel, submissionId },
    confidence: intel.confidence,
    importance: 86,
    source: "system",
    sourceRef: submissionId,
    verified: false,
    tags: ["booking", "creative-brief", "production-intel"],
    actor: "booking-production-intel",
    reason: "Auto-generated on inquiry submit",
  });

  // Proposal draft (human approval required before send)
  await writeMemory({
    layer: "business",
    category: "booking_proposal",
    key: `proposal-${submissionId}`,
    title: `Proposal draft: ${data.fullName || submissionId}`,
    summary: `${intel.suggestedPackage} · ~$${estimateBudgetValue(data.budgetRange || "") || 1500} investment signal`,
    value: {
      submissionId,
      status: "draft",
      package: intel.suggestedPackage,
      timeline: intel.suggestedTimeline,
      estimatedInvestment: estimateBudgetValue(data.budgetRange || "") || 1500,
      addOns: intel.recommendedAddOns,
      upsells: intel.upsellOpportunities,
      notes: intel.salesNotes,
      expiresInDays: 14,
      approvalRequired: true,
      generatedAt: intel.generatedAt,
    },
    confidence: intel.confidence,
    importance: 84,
    source: "system",
    sourceRef: submissionId,
    verified: false,
    tags: ["booking", "proposal", "draft", "human-approval"],
    actor: "booking-proposal-draft",
    reason: "Proposal draft — human approval required before outbound send",
  });

  return intel;
}

export function generateBookingProductionIntelBackground(
  submissionId: string,
  data: BookingPayload
): void {
  void persistBookingProductionIntel(submissionId, data).catch((err) =>
    console.error("[booking-production-intel]", err)
  );
}
