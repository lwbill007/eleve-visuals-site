/**
 * Inquiry qualification — lead score, priority, close likelihood, CRM segment.
 * Rules-first; stored on Submission.data as `qualification`.
 */

import {
  estimateInquiryValue,
  getAddOnById,
  getPackageById,
  type BookingPackage,
} from "./booking-packages";

export type CrmSegment =
  | "Portrait"
  | "Brand"
  | "Business"
  | "Event"
  | "Creative Partner"
  | "Repeat Client"
  | "VIP";

export type LeadPriority = "low" | "medium" | "high" | "urgent";

export interface InquiryQualification {
  estimatedProjectValue: number;
  packageId: string;
  packageName: string;
  addOnIds: string[];
  addOnNames: string[];
  likelihoodToClose: number;
  leadScore: number;
  priority: LeadPriority;
  idealFollowUpHours: number;
  idealFollowUpLabel: string;
  aiSummary: string;
  suggestedQuestions: string[];
  upsellOpportunities: string[];
  recommendedPackage: string;
  recommendedAddOns: string[];
  potentialLifetimeValue: number;
  crmSegment: CrmSegment;
  incompleteSignals: string[];
  risks: string[];
  opportunities: string[];
  truthLabel: "estimated" | "calculated";
  generatedAt: string;
}

export interface QualificationInput {
  packageId: string;
  addOnIds: string[];
  fullName?: string;
  email?: string;
  instagram?: string;
  website?: string;
  businessName?: string;
  purpose?: string;
  goals?: string;
  audience?: string;
  creativeDirection?: string;
  projectVision?: string;
  preferredDate?: string;
  location?: string;
  referralSource?: string;
  pinterestLink?: string;
  moodBoardUrl?: string;
  driveLink?: string;
  feelingPrompt?: string;
  inspirationPrompt?: string;
  projectCategory?: string;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function segmentFromPackage(
  pkg: BookingPackage | undefined,
  category?: string,
  visionBlob?: string
): CrmSegment {
  const blob = `${pkg?.id || ""} ${pkg?.projectCategory || ""} ${category || ""} ${visionBlob || ""}`;
  if (pkg?.family === "partnership") return "Creative Partner";
  if (/event|wedding|gala|conference|launch party/i.test(blob)) return "Event";
  if (pkg?.family === "hybrid" || /brand|business/i.test(pkg?.projectCategory || category || "")) {
    if (/business|ascend|apex|brand/i.test(`${pkg?.id || ""} ${category || ""}`)) return "Business";
    return "Brand";
  }
  if (pkg?.family === "motion") return "Brand";
  return "Portrait";
}

function lifetimeMultiplier(segment: CrmSegment, pkg?: BookingPackage): number {
  if (segment === "Creative Partner") return pkg?.id === "legacy" ? 1.4 : 2.2;
  if (segment === "Business" || segment === "Brand") return 2.5;
  if (segment === "Event") return 1.6;
  return 1.8;
}

export function qualifyInquiry(input: QualificationInput): InquiryQualification {
  const pkg = getPackageById(input.packageId);
  const addOnIds = input.addOnIds ?? [];
  const value = estimateInquiryValue(input.packageId, addOnIds);
  const visionBlob = [
    input.feelingPrompt,
    input.inspirationPrompt,
    input.purpose,
    input.goals,
    input.projectVision,
  ]
    .filter(Boolean)
    .join(" ");
  const segment = segmentFromPackage(pkg, input.projectCategory, visionBlob);

  const incomplete: string[] = [];
  if (!input.purpose?.trim() && !input.feelingPrompt?.trim()) incomplete.push("Missing emotional / purpose brief");
  if (!input.goals?.trim() && !input.inspirationPrompt?.trim()) incomplete.push("Missing goals / inspiration");
  if (!input.preferredDate) incomplete.push("No preferred date");
  if (!input.location?.trim()) incomplete.push("Location unspecified");
  if (!input.instagram && !input.website) incomplete.push("Thin digital footprint (no IG / site)");
  if (!input.moodBoardUrl && !input.pinterestLink && !input.driveLink) {
    incomplete.push("No visual references attached");
  }

  let score = 40;
  if (pkg) score += Math.min(35, Math.round(pkg.startingPrice / 50));
  if (addOnIds.length > 0) score += Math.min(10, addOnIds.length * 3);
  if (input.instagram) score += 5;
  if (input.website) score += 5;
  if (input.businessName) score += 4;
  if ((input.projectVision?.length || 0) >= 40 || (input.feelingPrompt?.length || 0) >= 40) score += 8;
  if (input.moodBoardUrl || input.pinterestLink) score += 6;
  if (pkg?.family === "partnership") score += 15;
  score -= incomplete.length * 4;
  score = clamp(score, 5, 98);

  const likelihood = clamp(
    Math.round(score * 0.85 + (pkg?.family === "partnership" ? 8 : 0) - incomplete.length * 3),
    8,
    95
  );

  let priority: LeadPriority = "medium";
  if (score >= 80 || value >= 5000) priority = "urgent";
  else if (score >= 65 || value >= 900) priority = "high";
  else if (score < 40) priority = "low";

  const idealFollowUpHours =
    priority === "urgent" ? 4 : priority === "high" ? 12 : priority === "medium" ? 24 : 48;

  const resolvedAddOnNames = addOnIds
    .map((id) => getAddOnById(id)?.name)
    .filter((n): n is string => Boolean(n));

  const upsells: string[] = [];
  if (pkg?.id === "foundations") upsells.push("Present Signature — creative planning + more images");
  if (pkg?.id === "signature") upsells.push("Present Prestige — multi-location editorial");
  if (pkg?.id === "motion") upsells.push("Upgrade to Cinema for hero film + sound design");
  if (pkg?.id === "fusion") upsells.push("Ascend brand day if they need a content library");
  if (pkg && pkg.family !== "partnership" && value < 5000) {
    upsells.push("Introduce Reserve if they need ongoing creative access");
  }
  for (const id of pkg?.recommendedAddOnIds || []) {
    if (!addOnIds.includes(id)) {
      const a = getAddOnById(id);
      if (a) upsells.push(`Add-on: ${a.name} — ${a.whyItMatters}`);
    }
  }

  const questions = [
    "What should people feel the moment they see this work?",
    "Where will these assets live first—web, social, print, or press?",
    "Is there a hard launch or event date we must protect?",
    "Who else needs to approve creative direction?",
    pkg?.family === "partnership"
      ? "How do you currently produce content month to month?"
      : "Would a multi-day or retainer model serve you better than a single production?",
  ];

  const risks: string[] = [...incomplete];
  if (value < 200 && pkg?.family !== "portrait") {
    risks.push("Selected package may under-scope stated ambition");
  }
  if (pkg?.family === "partnership") {
    risks.push("High-ticket partnership — needs discovery before proposal");
  }

  const opportunities: string[] = [...upsells.slice(0, 4)];
  if (input.referralSource && /referral|friend|returning/i.test(input.referralSource)) {
    opportunities.push("Warm referral — lean into social proof in follow-up");
  }

  const recommendedPackage =
    pkg?.id === "foundations" && score >= 60
      ? "ÉLEVÉ Signature"
      : pkg?.id === "signature" && score >= 75
        ? "ÉLEVÉ Prestige"
        : pkg?.name || "Discovery call to recommend";

  const recommendedAddOns = (pkg?.recommendedAddOnIds || [])
    .filter((id) => !addOnIds.includes(id))
    .slice(0, 3)
    .map((id) => getAddOnById(id)?.name)
    .filter((n): n is string => Boolean(n));

  const ltv = Math.round(value * lifetimeMultiplier(segment, pkg));

  const hasRefs = Boolean(input.moodBoardUrl || input.pinterestLink || input.driveLink);
  const aiSummaryParts: string[] = [];
  if (pkg?.family === "partnership") {
    aiSummaryParts.push(
      `This inquiry represents a high-value creative partnership opportunity around ${pkg.name}.`
    );
  } else if (value >= 1200) {
    aiSummaryParts.push("This is a premium production inquiry with strong commercial potential.");
  } else if (value >= 500) {
    aiSummaryParts.push("This is a solid mid-to-premium booking with clear production scope.");
  } else {
    aiSummaryParts.push("This is an introductory inquiry that may grow with thoughtful consultation.");
  }
  if (addOnIds.length > 0) {
    aiSummaryParts.push("Premium add-ons signal confidence and buying intent.");
  }
  if (priority === "urgent" || priority === "high") {
    aiSummaryParts.push("Immediate, personal follow-up is recommended.");
  } else {
    aiSummaryParts.push("A timely, considered follow-up will protect conversion quality.");
  }
  if (!hasRefs) {
    aiSummaryParts.push("Visual references are still needed before proposal approval.");
  }
  const aiSummary = aiSummaryParts.join(" ");

  return {
    estimatedProjectValue: value,
    packageId: input.packageId,
    packageName: pkg?.name || input.packageId,
    addOnIds,
    addOnNames: resolvedAddOnNames,
    likelihoodToClose: likelihood,
    leadScore: score,
    priority,
    idealFollowUpHours,
    idealFollowUpLabel:
      idealFollowUpHours <= 4
        ? "Same business day"
        : idealFollowUpHours <= 12
          ? "Within 12 hours"
          : idealFollowUpHours <= 24
            ? "Within 1 business day"
            : "Within 2 business days",
    aiSummary,
    suggestedQuestions: questions,
    upsellOpportunities: upsells.slice(0, 6),
    recommendedPackage,
    recommendedAddOns,
    potentialLifetimeValue: ltv,
    crmSegment: segment,
    incompleteSignals: incomplete,
    risks,
    opportunities,
    truthLabel: "estimated",
    generatedAt: new Date().toISOString(),
  };
}
