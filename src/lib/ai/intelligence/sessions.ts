import { prisma } from "@/lib/db";
import { normalizeApplicationStatus } from "@/lib/types";
import { generateAIContent } from "../service";
import type { SessionApplicationRank } from "../types";

function parseData(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

type RankedCategory = SessionApplicationRank["categories"][number];
type Prediction = SessionApplicationRank["predictions"][number];

const categoryDefinitions: {
  key: RankedCategory["key"];
  label: string;
  maxScore: number;
}[] = [
  { key: "portfolioQuality", label: "Portfolio Quality", maxScore: 25 },
  { key: "brandAlignment", label: "Brand Alignment", maxScore: 20 },
  { key: "businessValue", label: "Business Value", maxScore: 15 },
  { key: "reliability", label: "Reliability", maxScore: 15 },
  { key: "versatility", label: "Versatility", maxScore: 10 },
  { key: "professionalPresence", label: "Professional Presence", maxScore: 5 },
  { key: "marketingImpact", label: "Marketing Impact", maxScore: 5 },
  { key: "experience", label: "Experience", maxScore: 5 },
];

function stringValue(data: Record<string, unknown>, key: string): string {
  return typeof data[key] === "string" ? String(data[key]).trim() : "";
}

function stringArray(data: Record<string, unknown>, key: string): string[] {
  return Array.isArray(data[key])
    ? (data[key] as unknown[]).filter((value): value is string => typeof value === "string" && value.length > 0)
    : [];
}

function answer(data: Record<string, unknown>, id: string): string {
  const answers = Array.isArray(data.questionAnswers) ? data.questionAnswers : [];
  const match = answers.find(
    (item) => item && typeof item === "object" && "id" in item && (item as { id?: unknown }).id === id
  ) as { answer?: unknown } | undefined;
  if (typeof match?.answer === "string") return match.answer.trim();
  const legacyKey = id === "why-participate" ? "whyParticipate" : id === "theme-fit" ? "themeFit" : "";
  return legacyKey ? stringValue(data, legacyKey) : "";
}

function containsSpecifics(value: string): boolean {
  return /\b(client|campaign|editorial|commercial|published|production|brand|years?|agency|director|studio|award)\b/i.test(
    value
  );
}

function buildCategory(
  definition: (typeof categoryDefinitions)[number],
  ratio: number,
  evidence: string[],
  missing: string[],
  improvements: string[]
): RankedCategory {
  const bounded = Math.max(0, Math.min(0.985, ratio));
  const score = evidence.length === 0 ? 0 : Math.round(definition.maxScore * bounded * 10) / 10;
  const confidence = Math.min(98, Math.round(28 + evidence.length * 13 - missing.length * 5));
  return {
    ...definition,
    score,
    confidence: evidence.length === 0 ? 0 : Math.max(18, confidence),
    explanation:
      evidence.length === 0
        ? "Not scored — no supporting evidence was supplied."
        : `${evidence.length} verified application signal${evidence.length === 1 ? "" : "s"} support this score.`,
    evidence,
    missing,
    improvements,
  };
}

function tierFor(score: number): SessionApplicationRank["tier"] {
  if (score >= 98) return "Exceptional";
  if (score >= 94) return "Elite";
  if (score >= 90) return "Excellent";
  if (score >= 85) return "Strong";
  if (score >= 80) return "Good";
  if (score >= 75) return "Average";
  return "Needs Review";
}

function prediction(
  key: Prediction["key"],
  label: string,
  probability: number,
  confidence: number
): Prediction {
  const uncertainty = Math.max(6, Math.round((100 - confidence) * 0.28));
  return {
    key,
    label,
    probability: Math.round(Math.max(5, Math.min(95, probability))),
    low: Math.round(Math.max(1, probability - uncertainty)),
    high: Math.round(Math.min(99, probability + uncertainty)),
    confidence,
  };
}

function scoreApplication(data: Record<string, unknown>) {
  const roles = stringArray(data, "roles");
  const images = stringArray(data, "portfolioImages");
  const portfolioUrl =
    stringValue(data, "portfolioLink") ||
    stringValue(data, "portfolioWebsite") ||
    stringValue(data, "portfolioUrl");
  const instagram = stringValue(data, "instagram");
  const experience = stringValue(data, "experience") || stringValue(data, "experienceLevel");
  const why = answer(data, "why-participate");
  const theme = answer(data, "theme-fit");
  const contribution = answer(data, "contribution");
  const channels = ["demoReel", "youtube", "vimeo", "behance", "driveLink"].filter((key) =>
    Boolean(stringValue(data, key))
  );
  const location = stringValue(data, "cityState") || stringValue(data, "location");

  const categories: RankedCategory[] = [];
  categories.push(
    buildCategory(
      categoryDefinitions[0],
      Math.min(1, images.length * 0.13 + (portfolioUrl ? 0.22 : 0) + channels.length * 0.08 + (containsSpecifics(experience) ? 0.12 : 0)),
      [
        images.length ? `${images.length} portfolio image${images.length === 1 ? "" : "s"} supplied` : "",
        portfolioUrl ? "External portfolio link supplied" : "",
        channels.length ? `${channels.length} additional work channel${channels.length === 1 ? "" : "s"}` : "",
        containsSpecifics(experience) ? "Experience statement references professional work" : "",
      ].filter(Boolean),
      [images.length === 0 ? "No uploaded work samples" : "", !portfolioUrl ? "No external portfolio URL" : ""].filter(Boolean),
      ["Add a tightly edited portfolio with commercial, editorial, and environmental range."]
    )
  );
  categories.push(
    buildCategory(
      categoryDefinitions[1],
      Math.min(1, (theme.length >= 80 ? 0.38 : theme.length ? 0.2 : 0) + (why.length >= 80 ? 0.25 : why.length ? 0.12 : 0) + (contribution.length >= 80 ? 0.25 : contribution.length ? 0.12 : 0) + (/\b(luxury|editorial|premium|elev[eé]|cinematic|storytelling)\b/i.test(`${theme} ${why} ${contribution}`) ? 0.1 : 0)),
      [
        theme.length ? "Theme-alignment response supplied" : "",
        why.length ? "ÉLEVÉ motivation supplied" : "",
        contribution.length ? "Creative contribution articulated" : "",
        /\b(luxury|editorial|premium|elev[eé]|cinematic|storytelling)\b/i.test(`${theme} ${why} ${contribution}`)
          ? "Language aligns with premium editorial positioning"
          : "",
      ].filter(Boolean),
      [!theme ? "No theme-alignment evidence" : ""].filter(Boolean),
      ["Connect past work to ÉLEVÉ’s premium, editorial client experience with specific examples."]
    )
  );
  categories.push(
    buildCategory(
      categoryDefinitions[2],
      Math.min(1, (containsSpecifics(experience) ? 0.38 : experience ? 0.18 : 0) + (roles.length ? 0.16 : 0) + (contribution.length >= 120 ? 0.24 : contribution.length ? 0.12 : 0) + (portfolioUrl || images.length ? 0.16 : 0)),
      [
        containsSpecifics(experience) ? "Professional or commercial work referenced" : "",
        roles.length ? "Clear production role selected" : "",
        contribution.length >= 120 ? "Detailed value contribution" : "",
        portfolioUrl || images.length ? "Work evidence available for client-fit review" : "",
      ].filter(Boolean),
      [!containsSpecifics(experience) ? "No measurable commercial outcomes supplied" : ""].filter(Boolean),
      ["Add client outcomes, campaign results, rates, repeat work, or measurable production impact."]
    )
  );
  categories.push(
    buildCategory(
      categoryDefinitions[3],
      Math.min(1, (data.availabilityConfirm === true ? 0.34 : 0) + (data.transportationConfirm === true ? 0.26 : 0) + (data.creativeDirectionConfirm === true ? 0.2 : 0) + (data.agreementAccurate === true ? 0.12 : 0) + (stringValue(data, "phone") ? 0.08 : 0)),
      [
        data.availabilityConfirm === true ? "Availability confirmed" : "",
        data.transportationConfirm === true ? "Transportation confirmed" : "",
        data.creativeDirectionConfirm === true ? "Creative-direction commitment confirmed" : "",
        data.agreementAccurate === true ? "Application accuracy attested" : "",
        stringValue(data, "phone") ? "Direct contact method supplied" : "",
      ].filter(Boolean),
      [data.availabilityConfirm !== true ? "Availability not confirmed" : ""].filter(Boolean),
      ["Validate responsiveness, punctuality, and cancellation history during interview."]
    )
  );
  categories.push(
    buildCategory(
      categoryDefinitions[4],
      Math.min(1, roles.length * 0.25 + Math.min(channels.length, 3) * 0.12 + (images.length >= 4 ? 0.2 : images.length ? 0.1 : 0) + (/\b(editorial|commercial|portrait|fashion|video|photo|direction)\b/gi.test(experience) ? 0.18 : 0)),
      [
        roles.length > 1 ? `${roles.length} production roles selected` : roles.length ? "One focused role selected" : "",
        channels.length ? "Multiple media channels supplied" : "",
        images.length >= 4 ? "Portfolio set supports range review" : "",
        /\b(editorial|commercial|portrait|fashion|video|photo|direction)\b/i.test(experience)
          ? "Cross-discipline language appears in experience"
          : "",
      ].filter(Boolean),
      [roles.length < 2 ? "Limited cross-role evidence" : ""].filter(Boolean),
      ["Show distinct project types rather than multiple examples of the same execution."]
    )
  );
  categories.push(
    buildCategory(
      categoryDefinitions[5],
      Math.min(1, (stringValue(data, "email") ? 0.2 : 0) + (stringValue(data, "phone") ? 0.2 : 0) + (location ? 0.15 : 0) + (instagram ? 0.15 : 0) + (why.length >= 80 ? 0.15 : why.length ? 0.08 : 0) + (experience.length >= 80 ? 0.15 : experience.length ? 0.08 : 0)),
      [
        stringValue(data, "email") && stringValue(data, "phone") ? "Complete direct contact profile" : "",
        location ? "Location supplied" : "",
        instagram ? "Professional social handle supplied" : "",
        why.length >= 80 ? "Thoughtful written communication" : "",
        experience.length >= 80 ? "Detailed professional profile" : "",
      ].filter(Boolean),
      [!experience ? "No professional summary" : ""].filter(Boolean),
      ["Add concise credentials and a professional bio with specific credits."]
    )
  );
  categories.push(
    buildCategory(
      categoryDefinitions[6],
      Math.min(1, (instagram ? 0.38 : 0) + (stringValue(data, "youtube") ? 0.18 : 0) + (stringValue(data, "vimeo") ? 0.14 : 0) + (stringValue(data, "behance") ? 0.14 : 0) + (/\b(audience|followers?|engagement|campaign|content|social)\b/i.test(experience) ? 0.16 : 0)),
      [
        instagram ? "Instagram profile supplied" : "",
        channels.length ? "Additional public media presence supplied" : "",
        /\b(audience|followers?|engagement|campaign|content|social)\b/i.test(experience)
          ? "Marketing or audience experience referenced"
          : "",
      ].filter(Boolean),
      ["Audience size and engagement are not independently verified"],
      ["Provide verified audience, engagement, referral, or campaign-conversion metrics."]
    )
  );
  categories.push(
    buildCategory(
      categoryDefinitions[7],
      Math.min(1, (experience.length >= 180 ? 0.56 : experience.length >= 80 ? 0.38 : experience.length ? 0.2 : 0) + (containsSpecifics(experience) ? 0.3 : 0) + (/\b\d+\s*(years?|yrs?)\b/i.test(experience) ? 0.14 : 0)),
      [
        experience.length ? "Experience statement supplied" : "",
        containsSpecifics(experience) ? "Professional work context included" : "",
        /\b\d+\s*(years?|yrs?)\b/i.test(experience) ? "Years of experience stated" : "",
      ].filter(Boolean),
      [!experience ? "Experience history not supplied" : ""].filter(Boolean),
      ["Add years, named credits, client types, and production responsibilities."]
    )
  );

  const assessed = categories.filter((category) => category.confidence > 0);
  const assessedWeight = assessed.reduce((sum, category) => sum + category.maxScore, 0);
  const earned = assessed.reduce((sum, category) => sum + category.score, 0);
  const score = assessedWeight ? Math.round((earned / assessedWeight) * 1000) / 10 : 0;
  const evidenceCount = categories.reduce((sum, category) => sum + category.evidence.length, 0);
  const missingFields = categories.flatMap((category) => category.missing);
  const confidence = Math.max(
    18,
    Math.min(98, Math.round(26 + assessedWeight * 0.46 + evidenceCount * 1.7 - missingFields.length * 1.8))
  );
  const categoryRate = (key: RankedCategory["key"]) => {
    const category = categories.find((item) => item.key === key);
    return category && category.maxScore ? (category.score / category.maxScore) * 100 : 0;
  };
  const reliability = categoryRate("reliability");
  const brand = categoryRate("brandAlignment");
  const business = categoryRate("businessValue");
  const marketing = categoryRate("marketingImpact");
  const versatility = categoryRate("versatility");
  const experienceRate = categoryRate("experience");
  const predictions = [
    prediction("repeatBookings", "Repeat bookings", 24 + reliability * 0.38 + business * 0.24, confidence),
    prediction("premiumClientSuccess", "Premium client success", 18 + brand * 0.42 + categoryRate("portfolioQuality") * 0.28, confidence),
    prediction("referralPotential", "Referral potential", 18 + categoryRate("professionalPresence") * 0.28 + marketing * 0.25, confidence),
    prediction("upsellPotential", "Upsell potential", 16 + business * 0.38 + versatility * 0.22, confidence),
    prediction("leadershipPotential", "Leadership potential", 12 + experienceRate * 0.38 + business * 0.24, confidence),
    prediction("brandAmbassador", "Brand ambassador", 14 + brand * 0.34 + marketing * 0.3, confidence),
    prediction("productionEfficiency", "Production efficiency", 20 + reliability * 0.48 + experienceRate * 0.2, confidence),
    prediction("marketingImpact", "Marketing impact", 12 + marketing * 0.58 + brand * 0.16, confidence),
  ] satisfies Prediction[];
  return { categories, score, confidence, predictions, evidenceCount, missingFields };
}

export async function rankSessionApplications(volumeId?: string): Promise<SessionApplicationRank[]> {
  const apps = await prisma.submission.findMany({
    where: {
      type: "session",
      ...(volumeId ? { sessionVolumeId: volumeId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, data: true, status: true, contactEmail: true, createdAt: true, sessionVolumeId: true },
  });

  const ranked = apps
    .map((app) => {
      const data = parseData(app.data);
      const name = String(data.fullName || data.name || app.contactEmail);
      const roles = Array.isArray(data.roles) ? (data.roles as string[]) : [];
      const analysis = scoreApplication(data);
      const score = analysis.score;
      const confidence = analysis.confidence;
      const tier = tierFor(score);
      const portfolio = analysis.categories.find((category) => category.key === "portfolioQuality");
      const brand = analysis.categories.find((category) => category.key === "brandAlignment");
      const business = analysis.categories.find((category) => category.key === "businessValue");
      const reliability = analysis.categories.find((category) => category.key === "reliability");
      const marketing = analysis.categories.find((category) => category.key === "marketingImpact");
      const strongest = [...analysis.categories]
        .filter((category) => category.confidence > 0)
        .sort((a, b) => b.score / b.maxScore - a.score / a.maxScore);
      const weakest = [...analysis.categories]
        .filter((category) => category.confidence > 0)
        .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore)[0];
      const rolesLower = roles.join(" ").toLowerCase();
      const roleBase = rolesLower.includes("director")
        ? 5200
        : rolesLower.includes("photographer") || rolesLower.includes("videographer")
          ? 4200
          : rolesLower.includes("model")
            ? 2600
            : 3200;
      const expectedAmount = Math.round((roleBase * (0.45 + (business?.score ?? 0) / 25 + score / 250)) / 100) * 100;
      const revenueUncertainty = Math.max(0.18, (100 - confidence) / 100);
      const portfolioImages = stringArray(data, "portfolioImages");
      const portfolioUrl =
        stringValue(data, "portfolioLink") ||
        stringValue(data, "portfolioWebsite") ||
        stringValue(data, "portfolioUrl");
      const instagram = stringValue(data, "instagram");
      const portfolioStatus: SessionApplicationRank["dataQuality"]["portfolio"] =
        portfolioImages.length > 0 && portfolioUrl
          ? "verified"
          : portfolioImages.length > 0 || portfolioUrl
            ? "provided"
            : "missing";
      const socialStatus: SessionApplicationRank["dataQuality"]["social"] = instagram ? "provided" : "missing";
      const availabilityStatus: SessionApplicationRank["dataQuality"]["availability"] =
        data.availabilityConfirm === true ? "confirmed" : "unknown";
      const recommendation: SessionApplicationRank["recommendation"] =
        score >= 90 && confidence >= 72
          ? "Invite to Interview"
          : score >= 84 && confidence >= 60
            ? "Shortlist"
            : confidence < 58
              ? "Request Evidence"
              : score >= 75
                ? "Review"
                : "Hold";
      const badges = [
        portfolio && portfolio.score / portfolio.maxScore >= 0.85 ? "Top Portfolio" : "",
        brand && brand.score / brand.maxScore >= 0.86 ? "Luxury Specialist" : "",
        business && business.score / business.maxScore >= 0.84 ? "High Revenue Potential" : "",
        roles.length > 1 ? "Multi-Disciplinary" : "",
        confidence >= 88 ? "High Confidence" : "",
        marketing && marketing.score / marketing.maxScore >= 0.78 ? "Brand Ambassador Potential" : "",
        portfolioImages.length > 0 && portfolioUrl ? "Verified Professional" : "",
      ].filter(Boolean);
      const riskLevel: SessionApplicationRank["riskLevel"] =
        confidence < 50 || (reliability?.score ?? 0) / (reliability?.maxScore ?? 15) < 0.45
          ? "high"
          : confidence < 72 || (reliability?.score ?? 0) / (reliability?.maxScore ?? 15) < 0.72
            ? "medium"
            : "low";

      return {
        id: app.id,
        name,
        email: app.contactEmail,
        roles,
        status: normalizeApplicationStatus(app.status),
        score,
        confidence,
        tier,
        recommendation,
        summary: `${strongest[0]?.label ?? "Application evidence"} leads the profile. Estimated value reflects role economics and observed business-value signals, not a guarantee.`,
        strengths: strongest.slice(0, 3).map((category) => category.label),
        weakness: weakest
          ? `${weakest.label}: ${weakest.improvements[0]}`
          : "Insufficient evidence for a reliable weakness assessment.",
        badges,
        riskLevel,
        expectedValue: {
          amount: expectedAmount,
          low: Math.round((expectedAmount * (1 - revenueUncertainty)) / 100) * 100,
          high: Math.round((expectedAmount * (1 + revenueUncertainty)) / 100) * 100,
          confidence,
          rationale: "Directional opportunity estimate based on role, business-value evidence, and cohort score.",
        },
        recommendedProject: rolesLower.includes("director")
          ? "Premium campaign leadership"
          : rolesLower.includes("photographer") || rolesLower.includes("videographer")
            ? "Editorial brand campaign"
            : rolesLower.includes("model")
              ? "Luxury editorial production"
              : "Paid collaborative test",
        categories: analysis.categories,
        predictions: analysis.predictions,
        dataQuality: {
          portfolio: portfolioStatus,
          social: socialStatus,
          availability: availabilityStatus,
          location: stringValue(data, "cityState") || stringValue(data, "location") || "Unknown",
          evidenceCount: analysis.evidenceCount,
          missingFields: analysis.missingFields,
        },
        href: `/admin/applications?focus=${app.id}`,
        createdAt: app.createdAt.toISOString(),
      };
    })
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence || a.id.localeCompare(b.id));

  return ranked;
}

export async function generateApplicationRankingSummary(volumeId?: string): Promise<string> {
  const ranked = await rankSessionApplications(volumeId);
  const result = await generateAIContent({
    task: "general",
    prompt: "Summarize top session applicants and recommend who to shortlist. Human makes final decisions.",
    context: { topApplicants: ranked.slice(0, 10) },
  });
  return result.content;
}
