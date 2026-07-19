import { prisma } from "@/lib/db";
import { normalizeApplicationStatus } from "@/lib/types";
import { generateAIContent } from "../service";
import type { SessionApplicationRank } from "../types";

/**
 * Comparative ranking engine for session applications.
 *
 * Pipeline: collect evidence → extract features → evaluate categories →
 * weighted raw score → cohort-relative final score → confidence →
 * tie-breaks → reason for rank.
 *
 * Rules the engine enforces:
 * - No points without evidence: a category with zero observed signals scores 0.
 * - Scores are relative: the final score blends absolute evidence quality with
 *   position in the cohort, so identical scores only occur for identical evidence.
 * - Confidence is computed separately and never inflates the quality score.
 * - Revenue is reported only from settled Payment rows; otherwise the engine
 *   states "Insufficient historical data" instead of inventing figures.
 */

type RankedCategory = SessionApplicationRank["categories"][number];
type Prediction = SessionApplicationRank["predictions"][number];
type CategoryKey = RankedCategory["key"];

const CATEGORY_DEFINITIONS: { key: CategoryKey; label: string; maxScore: number }[] = [
  { key: "portfolioQuality", label: "Portfolio Quality", maxScore: 25 },
  { key: "brandAlignment", label: "Brand Alignment", maxScore: 20 },
  { key: "businessValue", label: "Business Value", maxScore: 15 },
  { key: "reliability", label: "Reliability", maxScore: 15 },
  { key: "versatility", label: "Versatility", maxScore: 10 },
  { key: "professionalPresence", label: "Professional Presence", maxScore: 5 },
  { key: "marketingImpact", label: "Marketing Impact", maxScore: 5 },
  { key: "experience", label: "Experience", maxScore: 5 },
];

/** Order used to break near-equal overall scores, most decisive first. */
const TIE_BREAK_CHAIN: { key: CategoryKey | "confidence"; label: string }[] = [
  { key: "businessValue", label: "Business Value" },
  { key: "brandAlignment", label: "Brand Alignment" },
  { key: "portfolioQuality", label: "Portfolio" },
  { key: "reliability", label: "Reliability" },
  { key: "experience", label: "Experience" },
  { key: "confidence", label: "Confidence" },
  { key: "versatility", label: "Versatility" },
];

// ---------------------------------------------------------------------------
// Stage 1 — collect evidence
// ---------------------------------------------------------------------------

function parseData(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function str(data: Record<string, unknown>, key: string): string {
  return typeof data[key] === "string" ? String(data[key]).trim() : "";
}

function strArray(data: Record<string, unknown>, key: string): string[] {
  return Array.isArray(data[key])
    ? (data[key] as unknown[]).filter((v): v is string => typeof v === "string" && v.length > 0)
    : [];
}

function answer(data: Record<string, unknown>, id: string): string {
  const answers = Array.isArray(data.questionAnswers) ? data.questionAnswers : [];
  const match = answers.find(
    (item) => item && typeof item === "object" && (item as { id?: unknown }).id === id
  ) as { answer?: unknown } | undefined;
  if (typeof match?.answer === "string") return match.answer.trim();
  const legacyKey = id === "why-participate" ? "whyParticipate" : id === "theme-fit" ? "themeFit" : "";
  return legacyKey ? str(data, legacyKey) : "";
}

// ---------------------------------------------------------------------------
// Stage 2 — extract applicant features (continuous, not booleans)
// ---------------------------------------------------------------------------

const PROFESSIONAL_TERMS =
  /\b(client|campaign|editorial|commercial|published|production|brand|agency|director|studio|award|magazine|runway|signed|booked|contract|retainer)\b/gi;
const LUXURY_TERMS =
  /\b(luxury|editorial|premium|elev[eé]|cinematic|storytelling|couture|high[- ]end|refined|elegant)\b/gi;
const DISCIPLINE_TERMS =
  /\b(editorial|commercial|portrait|fashion|video|photo|film|direction|styling|beauty|lifestyle|product)\b/gi;
const AUDIENCE_TERMS = /\b(audience|followers?|engagement|reach|content|social|viral|community)\b/gi;

function countMatches(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

/** 0..1 saturation curve — early signals count most, diminishing returns after. */
function saturate(value: number, scale: number): number {
  if (value <= 0) return 0;
  return 1 - Math.exp(-value / scale);
}

/** Graded writing quality: depth (length), specificity, and sentence structure. */
function textQuality(text: string): number {
  if (!text) return 0;
  const depth = saturate(text.length, 220);
  const specificity = saturate(countMatches(text, PROFESSIONAL_TERMS), 3);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 12).length;
  const structure = saturate(sentences, 3);
  return depth * 0.45 + specificity * 0.3 + structure * 0.25;
}

interface Features {
  roles: string[];
  images: string[];
  portfolioUrl: string;
  channels: string[];
  instagram: string;
  experienceText: string;
  why: string;
  theme: string;
  contribution: string;
  location: string;
  phone: string;
  email: string;
  yearsStated: number;
  confirmations: number;
  availabilityConfirmed: boolean;
}

function extractFeatures(data: Record<string, unknown>): Features {
  const yearsMatch = (str(data, "experience") || str(data, "experienceLevel")).match(/\b(\d{1,2})\s*(?:\+?\s*)?(years?|yrs?)\b/i);
  return {
    roles: strArray(data, "roles"),
    images: strArray(data, "portfolioImages"),
    portfolioUrl: str(data, "portfolioLink") || str(data, "portfolioWebsite") || str(data, "portfolioUrl"),
    channels: ["demoReel", "youtube", "vimeo", "behance", "driveLink"].filter((k) => Boolean(str(data, k))),
    instagram: str(data, "instagram"),
    experienceText: str(data, "experience") || str(data, "experienceLevel"),
    why: answer(data, "why-participate"),
    theme: answer(data, "theme-fit"),
    contribution: answer(data, "contribution"),
    location: str(data, "cityState") || str(data, "location"),
    phone: str(data, "phone"),
    email: str(data, "email"),
    yearsStated: yearsMatch ? Math.min(30, parseInt(yearsMatch[1], 10)) : 0,
    confirmations:
      (data.availabilityConfirm === true ? 1 : 0) +
      (data.transportationConfirm === true ? 1 : 0) +
      (data.creativeDirectionConfirm === true ? 1 : 0) +
      (data.agreementAccurate === true ? 1 : 0),
    availabilityConfirmed: data.availabilityConfirm === true,
  };
}

/** Canonical fingerprint — two applicants may share a score only if this matches. */
function featureFingerprint(f: Features): string {
  return JSON.stringify([
    f.roles.slice().sort(),
    f.images.length,
    Boolean(f.portfolioUrl),
    f.channels.slice().sort(),
    Boolean(f.instagram),
    f.experienceText.length,
    f.why.length,
    f.theme.length,
    f.contribution.length,
    f.yearsStated,
    f.confirmations,
    f.availabilityConfirmed,
    Boolean(f.phone),
    Boolean(f.location),
  ]);
}

// ---------------------------------------------------------------------------
// Stage 3 — evaluate categories (every point tied to named evidence)
// ---------------------------------------------------------------------------

interface CategoryEval {
  key: CategoryKey;
  ratio: number; // raw 0..1 before cohort comparison
  evidence: string[];
  missing: string[];
  improvements: string[];
}

function evaluateCategories(f: Features): CategoryEval[] {
  const professionalHits = countMatches(f.experienceText, PROFESSIONAL_TERMS);
  const luxuryHits = countMatches(`${f.theme} ${f.why} ${f.contribution}`, LUXURY_TERMS);
  const disciplineHits = countMatches(`${f.experienceText} ${f.contribution}`, DISCIPLINE_TERMS);
  const audienceHits = countMatches(f.experienceText, AUDIENCE_TERMS);

  return [
    {
      key: "portfolioQuality",
      ratio:
        saturate(f.images.length, 3) * 0.45 +
        (f.portfolioUrl ? 0.2 : 0) +
        saturate(f.channels.length, 2) * 0.15 +
        saturate(professionalHits, 3) * 0.2,
      evidence: [
        f.images.length ? `${f.images.length} work sample${f.images.length === 1 ? "" : "s"} uploaded for direct review` : "",
        f.portfolioUrl ? "Curated external portfolio provided" : "",
        f.channels.length ? `${f.channels.length} additional media channel${f.channels.length === 1 ? "" : "s"} (reel/video/behance)` : "",
        professionalHits > 0 ? `${professionalHits} professional production reference${professionalHits === 1 ? "" : "s"} in experience` : "",
      ].filter(Boolean),
      missing: [
        f.images.length === 0 ? "No uploaded work samples" : "",
        !f.portfolioUrl ? "No external portfolio URL" : "",
      ].filter(Boolean),
      improvements: ["Submit a tightly edited set showing lighting consistency, posing, and environmental range."],
    },
    {
      key: "brandAlignment",
      ratio:
        textQuality(f.theme) * 0.35 +
        textQuality(f.why) * 0.25 +
        textQuality(f.contribution) * 0.25 +
        saturate(luxuryHits, 3) * 0.15,
      evidence: [
        f.theme ? `Theme-fit response (${f.theme.length} chars) addresses the volume aesthetic` : "",
        f.why ? "Motivation statement explains fit with ÉLEVÉ" : "",
        f.contribution ? "Creative contribution articulated" : "",
        luxuryHits > 0 ? `${luxuryHits} premium/editorial positioning term${luxuryHits === 1 ? "" : "s"} used` : "",
      ].filter(Boolean),
      missing: [!f.theme ? "No theme-alignment response" : ""].filter(Boolean),
      improvements: ["Reference specific past work that matches ÉLEVÉ's premium editorial standard."],
    },
    {
      key: "businessValue",
      ratio:
        saturate(professionalHits, 4) * 0.4 +
        textQuality(f.contribution) * 0.25 +
        saturate(f.roles.length, 1.5) * 0.15 +
        (f.images.length || f.portfolioUrl ? 0.2 : 0),
      evidence: [
        professionalHits > 0 ? `Commercial context: ${professionalHits} client/production reference${professionalHits === 1 ? "" : "s"}` : "",
        f.contribution.length >= 80 ? "Concrete value contribution described" : "",
        f.roles.length ? `Deployable in ${f.roles.length} production role${f.roles.length === 1 ? "" : "s"}` : "",
        f.images.length || f.portfolioUrl ? "Work evidence available for client-fit assessment" : "",
      ].filter(Boolean),
      missing: [professionalHits === 0 ? "No commercial outcomes or client history supplied" : ""].filter(Boolean),
      improvements: ["Provide client outcomes, repeat-work history, rates, or measurable campaign results."],
    },
    {
      key: "reliability",
      ratio: saturate(f.confirmations, 2.2) * 0.75 + (f.phone ? 0.13 : 0) + (f.email ? 0.12 : 0),
      evidence: [
        f.confirmations > 0 ? `${f.confirmations} of 4 logistics/accuracy commitments confirmed` : "",
        f.phone ? "Direct phone contact supplied" : "",
        f.email ? "Email contact supplied" : "",
      ].filter(Boolean),
      missing: [f.confirmations < 4 ? `${4 - f.confirmations} commitment${4 - f.confirmations === 1 ? "" : "s"} unconfirmed` : ""].filter(Boolean),
      improvements: ["Verify punctuality and cancellation history in a reference or paid test."],
    },
    {
      key: "versatility",
      ratio:
        saturate(f.roles.length, 1.8) * 0.35 +
        saturate(disciplineHits, 3) * 0.3 +
        saturate(f.channels.length, 2) * 0.15 +
        saturate(f.images.length, 4) * 0.2,
      evidence: [
        f.roles.length > 1 ? `${f.roles.length} distinct production roles` : f.roles.length ? "One focused role" : "",
        disciplineHits > 0 ? `${disciplineHits} discipline reference${disciplineHits === 1 ? "" : "s"} across written materials` : "",
        f.channels.length ? "Multiple media formats represented" : "",
        f.images.length >= 4 ? "Sample set large enough to assess range" : "",
      ].filter(Boolean),
      missing: [f.roles.length < 2 && disciplineHits < 2 ? "Limited cross-discipline evidence" : ""].filter(Boolean),
      improvements: ["Show distinct project types rather than variations of one execution."],
    },
    {
      key: "professionalPresence",
      ratio:
        (f.email ? 0.15 : 0) +
        (f.phone ? 0.15 : 0) +
        (f.location ? 0.15 : 0) +
        (f.instagram ? 0.15 : 0) +
        textQuality(f.why) * 0.2 +
        textQuality(f.experienceText) * 0.2,
      evidence: [
        f.email && f.phone ? "Complete direct-contact profile" : "",
        f.location ? `Location on record (${f.location})` : "",
        f.instagram ? "Public professional handle supplied" : "",
        textQuality(f.why) > 0.5 ? "Clear, structured written communication" : "",
      ].filter(Boolean),
      missing: [!f.experienceText ? "No professional summary" : ""].filter(Boolean),
      improvements: ["Add concise credentials with named credits."],
    },
    {
      key: "marketingImpact",
      ratio:
        (f.instagram ? 0.35 : 0) +
        saturate(f.channels.filter((c) => c !== "driveLink").length, 2) * 0.35 +
        saturate(audienceHits, 2) * 0.3,
      evidence: [
        f.instagram ? "Instagram presence provided" : "",
        f.channels.filter((c) => c !== "driveLink").length ? "Public video/creative channels provided" : "",
        audienceHits > 0 ? "Audience or content experience referenced" : "",
      ].filter(Boolean),
      missing: ["Audience size and engagement are not independently verified"],
      improvements: ["Provide verified audience, engagement, or campaign-conversion metrics."],
    },
    {
      key: "experience",
      ratio:
        textQuality(f.experienceText) * 0.5 +
        saturate(professionalHits, 4) * 0.3 +
        saturate(f.yearsStated, 6) * 0.2,
      evidence: [
        f.experienceText ? `Experience statement supplied (${f.experienceText.length} chars)` : "",
        professionalHits > 0 ? "Named professional context included" : "",
        f.yearsStated > 0 ? `${f.yearsStated} year${f.yearsStated === 1 ? "" : "s"} of experience stated` : "",
      ].filter(Boolean),
      missing: [!f.experienceText ? "Experience history not supplied" : ""].filter(Boolean),
      improvements: ["List years, named credits, client types, and responsibilities."],
    },
  ];
}

// ---------------------------------------------------------------------------
// Stage 4/5 — weighted raw score + confidence (independent of quality)
// ---------------------------------------------------------------------------

interface Profile {
  id: string;
  name: string;
  email: string;
  roles: string[];
  status: string;
  createdAt: string;
  features: Features;
  fingerprint: string;
  evals: CategoryEval[];
  rawScore: number; // 0..100, evidence-weighted, pre-cohort
  confidence: number;
  evidenceCount: number;
  missingFields: string[];
}

function buildProfile(app: {
  id: string;
  data: string;
  status: string;
  contactEmail: string;
  createdAt: Date;
}): Profile {
  const data = parseData(app.data);
  const features = extractFeatures(data);
  const evals = evaluateCategories(features);

  // Never assign points without evidence.
  for (const e of evals) if (e.evidence.length === 0) e.ratio = 0;

  const assessed = evals.filter((e) => e.evidence.length > 0);
  const assessedWeight = assessed.reduce(
    (sum, e) => sum + (CATEGORY_DEFINITIONS.find((d) => d.key === e.key)?.maxScore ?? 0),
    0
  );
  const earned = assessed.reduce(
    (sum, e) => sum + e.ratio * (CATEGORY_DEFINITIONS.find((d) => d.key === e.key)?.maxScore ?? 0),
    0
  );
  const rawScore = assessedWeight ? (earned / assessedWeight) * 100 : 0;

  const evidenceCount = evals.reduce((sum, e) => sum + e.evidence.length, 0);
  const missingFields = evals.flatMap((e) => e.missing);
  // Confidence = information coverage, never applicant quality.
  const coverage = assessedWeight / 100;
  const confidence = Math.max(
    15,
    Math.min(97, Math.round(coverage * 62 + saturate(evidenceCount, 12) * 42 - missingFields.length * 2.2))
  );

  return {
    id: app.id,
    name: String(data.fullName || data.name || app.contactEmail),
    email: app.contactEmail,
    roles: features.roles,
    status: normalizeApplicationStatus(app.status),
    createdAt: app.createdAt.toISOString(),
    features,
    fingerprint: featureFingerprint(features),
    evals,
    rawScore,
    confidence,
    evidenceCount,
    missingFields,
  };
}

// ---------------------------------------------------------------------------
// Stage 6 — cohort comparison, tie-breaks, positional variance
// ---------------------------------------------------------------------------

function categoryRatio(profile: Profile, key: CategoryKey): number {
  return profile.evals.find((e) => e.key === key)?.ratio ?? 0;
}

function chainValue(profile: Profile, key: CategoryKey | "confidence"): number {
  return key === "confidence" ? profile.confidence / 100 : categoryRatio(profile, key);
}

/** Head-to-head comparator: raw score, then the declared tie-break chain. */
function compareProfiles(a: Profile, b: Profile): number {
  if (Math.abs(a.rawScore - b.rawScore) > 0.05) return b.rawScore - a.rawScore;
  for (const step of TIE_BREAK_CHAIN) {
    const diff = chainValue(b, step.key) - chainValue(a, step.key);
    if (Math.abs(diff) > 0.005) return diff;
  }
  return a.id.localeCompare(b.id);
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

/**
 * Final score: cohort position sets the band (top ≈ 93–97, each rank ~3 points
 * lower), absolute evidence quality moves the applicant within and below the
 * band. Scores above 97 require near-perfect evidence AND high confidence.
 */
function finalScore(profile: Profile, rank: number, cohortBest: number): number {
  const anchor = Math.max(45, 95 - rank * 3.1);
  // Quality factor: raw evidence strength normalized so a genuinely strong
  // applicant (raw ≈ 85, near the saturation ceiling) reaches ~1.0.
  const quality = Math.min(1, profile.rawScore / 85);
  // Weak evidence pulls the score well below the positional band; a mediocre
  // cohort leader must not inherit a 95.
  const qualityPenalty = (1 - quality) * 22;
  // Gap to cohort leader pulls trailing applicants further down within bands.
  const gapPenalty = Math.max(0, (cohortBest - profile.rawScore) * 0.2);
  let score = anchor - qualityPenalty - gapPenalty;
  // Extraordinary gate: exceeding 97 demands exceptional evidence and certainty.
  const cap = profile.rawScore >= 90 && profile.confidence >= 90 ? 98.6 : 97;
  score = Math.min(cap, Math.max(20, score));
  return Math.round(score * 10) / 10;
}

function tieBreakFor(profile: Profile, above: Profile | null): SessionApplicationRank["tieBreak"] {
  if (!above || Math.abs(above.rawScore - profile.rawScore) > 1.5) return null;
  for (const step of TIE_BREAK_CHAIN) {
    const mine = chainValue(profile, step.key);
    const theirs = chainValue(above, step.key);
    if (Math.abs(theirs - mine) > 0.005) {
      return {
        comparedWith: above.name,
        decidedBy: step.label,
        detail: `${step.label}: ${Math.round(theirs * 100)}% vs ${Math.round(mine * 100)}% — ${above.name} wins this step.`,
        chain: TIE_BREAK_CHAIN.map((s) => s.label),
      };
    }
  }
  return {
    comparedWith: above.name,
    decidedBy: "All metrics identical",
    detail: "Every measurable metric is identical; order falls back to submission ID.",
    chain: TIE_BREAK_CHAIN.map((s) => s.label),
  };
}

function reasonForRank(profile: Profile, rank: number, above: Profile | null, cohortSize: number): string {
  const best = [...profile.evals]
    .filter((e) => e.evidence.length > 0)
    .sort((a, b) => b.ratio - a.ratio)[0];
  const bestLabel = CATEGORY_DEFINITIONS.find((d) => d.key === best?.key)?.label ?? "supplied evidence";
  if (rank === 0) {
    return `Leads the cohort of ${cohortSize}: highest evidence-weighted total (${profile.rawScore.toFixed(1)} raw), strongest in ${bestLabel}.`;
  }
  if (!above) return `Ranked ${rank + 1} of ${cohortSize} on evidence-weighted total.`;
  const decisive = TIE_BREAK_CHAIN.map((step) => ({
    step,
    diff: chainValue(above, step.key) - chainValue(profile, step.key),
  })).find((d) => d.diff > 0.02);
  const gap = above.rawScore - profile.rawScore;
  if (gap > 1.5) {
    return `Ranks below ${above.name} on overall evidence (${profile.rawScore.toFixed(1)} vs ${above.rawScore.toFixed(1)} raw); strongest own category is ${bestLabel}.`;
  }
  if (decisive) {
    return `Near-equal with ${above.name}; tie-break on ${decisive.step.label} (${Math.round(chainValue(above, decisive.step.key) * 100)}% vs ${Math.round(chainValue(profile, decisive.step.key) * 100)}%) decided the order.`;
  }
  return `Effectively tied with ${above.name}; every tie-break metric matched, so order falls back to submission ID.`;
}

// ---------------------------------------------------------------------------
// Predictions — probabilities with intervals derived from observed evidence
// ---------------------------------------------------------------------------

function prediction(key: Prediction["key"], label: string, probability: number, confidence: number): Prediction {
  const uncertainty = Math.max(6, Math.round((100 - confidence) * 0.3));
  const p = Math.round(Math.max(5, Math.min(95, probability)));
  return { key, label, probability: p, low: Math.max(1, p - uncertainty), high: Math.min(99, p + uncertainty), confidence };
}

function buildPredictions(profile: Profile): Prediction[] {
  const r = (key: CategoryKey) => categoryRatio(profile, key) * 100;
  const c = profile.confidence;
  return [
    prediction("repeatBookings", "Repeat bookings", 22 + r("reliability") * 0.38 + r("businessValue") * 0.25, c),
    prediction("premiumClientSuccess", "Premium client success", 16 + r("brandAlignment") * 0.42 + r("portfolioQuality") * 0.3, c),
    prediction("referralPotential", "Referral potential", 16 + r("professionalPresence") * 0.3 + r("marketingImpact") * 0.28, c),
    prediction("upsellPotential", "Upsell potential", 15 + r("businessValue") * 0.4 + r("versatility") * 0.22, c),
    prediction("leadershipPotential", "Leadership potential", 11 + r("experience") * 0.4 + r("businessValue") * 0.25, c),
    prediction("brandAmbassador", "Brand ambassador", 13 + r("brandAlignment") * 0.35 + r("marketingImpact") * 0.3, c),
    prediction("productionEfficiency", "Production efficiency", 18 + r("reliability") * 0.48 + r("experience") * 0.22, c),
    prediction("marketingImpact", "Marketing impact", 11 + r("marketingImpact") * 0.58 + r("brandAlignment") * 0.17, c),
  ];
}

// ---------------------------------------------------------------------------
// Verified revenue — real Payment rows only, never estimates
// ---------------------------------------------------------------------------

async function verifiedRevenueByEmail(emails: string[]): Promise<Map<string, { total: number; count: number }>> {
  const map = new Map<string, { total: number; count: number }>();
  const valid = emails.filter(Boolean);
  if (valid.length === 0) return map;
  const payments = await prisma.payment.findMany({
    where: { customerEmail: { in: valid }, status: "succeeded" },
    select: { customerEmail: true, amountCents: true },
  });
  for (const p of payments) {
    const entry = map.get(p.customerEmail) ?? { total: 0, count: 0 };
    entry.total += p.amountCents / 100;
    entry.count += 1;
    map.set(p.customerEmail, entry);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Stage 7 — rank all applicants
// ---------------------------------------------------------------------------

export interface RankableApplication {
  id: string;
  data: string;
  status: string;
  contactEmail: string;
  createdAt: Date;
}

/** Pure cohort ranking — separated from data access so the engine is testable. */
export function rankApplicationCohort(
  apps: RankableApplication[],
  revenue: Map<string, { total: number; count: number }>
): SessionApplicationRank[] {
  const profiles = apps.map(buildProfile).sort(compareProfiles);
  const cohortBest = profiles[0]?.rawScore ?? 0;

  // Assign final scores, enforcing separation unless evidence is truly identical.
  const finals: number[] = [];
  profiles.forEach((profile, rank) => {
    let score = finalScore(profile, rank, cohortBest);
    if (rank > 0) {
      const above = profiles[rank - 1];
      const identical = above.fingerprint === profile.fingerprint;
      if (!identical && score >= finals[rank - 1]) {
        score = Math.round((finals[rank - 1] - 0.2) * 10) / 10;
      }
      if (identical) score = finals[rank - 1];
    }
    finals.push(Math.max(20, score));
  });

  return profiles.map((profile, rank) => {
    const score = finals[rank];
    const above = rank > 0 ? profiles[rank - 1] : null;
    const categories: RankedCategory[] = profile.evals.map((e) => {
      const def = CATEGORY_DEFINITIONS.find((d) => d.key === e.key)!;
      const catConfidence =
        e.evidence.length === 0 ? 0 : Math.max(18, Math.min(96, Math.round(30 + e.evidence.length * 13 - e.missing.length * 5)));
      return {
        key: def.key,
        label: def.label,
        maxScore: def.maxScore,
        score: Math.round(e.ratio * def.maxScore * 10) / 10,
        confidence: catConfidence,
        explanation:
          e.evidence.length === 0
            ? "Not scored — no supporting evidence was supplied."
            : `Scored from ${e.evidence.length} observed signal${e.evidence.length === 1 ? "" : "s"}; graded continuously, not pass/fail.`,
        evidence: e.evidence,
        missing: e.missing,
        improvements: e.improvements,
      };
    });

    const sortedByStrength = [...categories].filter((c) => c.confidence > 0).sort((a, b) => b.score / b.maxScore - a.score / a.maxScore);
    const weakest = sortedByStrength[sortedByStrength.length - 1];
    const paid = revenue.get(profile.email);
    const rolesLower = profile.roles.join(" ").toLowerCase();
    const recommendation: SessionApplicationRank["recommendation"] =
      score >= 90 && profile.confidence >= 72
        ? "Invite to Interview"
        : score >= 84 && profile.confidence >= 60
          ? "Shortlist"
          : profile.confidence < 55
            ? "Request Evidence"
            : score >= 75
              ? "Review"
              : "Hold";
    const reliabilityRatio = categoryRatio(profile, "reliability");
    const riskLevel: SessionApplicationRank["riskLevel"] =
      profile.confidence < 50 || reliabilityRatio < 0.45 ? "high" : profile.confidence < 72 || reliabilityRatio < 0.72 ? "medium" : "low";

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      roles: profile.roles,
      status: profile.status,
      score,
      confidence: profile.confidence,
      tier: tierFor(score),
      recommendation,
      summary: reasonForRank(profile, rank, above, profiles.length),
      strengths: sortedByStrength.slice(0, 3).map((c) => c.label),
      weakness: weakest ? `${weakest.label}: ${weakest.improvements[0]}` : "Insufficient evidence for a reliable weakness assessment.",
      badges: [
        categoryRatio(profile, "portfolioQuality") >= 0.85 ? "Top Portfolio" : "",
        categoryRatio(profile, "brandAlignment") >= 0.86 ? "Luxury Specialist" : "",
        categoryRatio(profile, "businessValue") >= 0.84 ? "High Revenue Potential" : "",
        profile.roles.length > 1 ? "Multi-Disciplinary" : "",
        profile.confidence >= 88 ? "High Confidence" : "",
        categoryRatio(profile, "marketingImpact") >= 0.78 ? "Brand Ambassador Potential" : "",
        profile.features.images.length > 0 && profile.features.portfolioUrl ? "Verified Professional" : "",
      ].filter(Boolean),
      riskLevel,
      expectedValue: paid
        ? {
            basis: "verified" as const,
            amount: Math.round(paid.total),
            low: Math.round(paid.total),
            high: Math.round(paid.total),
            confidence: 95,
            rationale: `Verified: ${paid.count} settled payment${paid.count === 1 ? "" : "s"} linked to this email in the ÉLEVÉ database.`,
          }
        : {
            basis: "insufficient" as const,
            amount: 0,
            low: 0,
            high: 0,
            confidence: 0,
            rationale: "Insufficient historical data. No settled payments are linked to this applicant.",
          },
      reasonForRank: reasonForRank(profile, rank, above, profiles.length),
      tieBreak: tieBreakFor(profile, above),
      recommendedProject: rolesLower.includes("director")
        ? "Premium campaign leadership"
        : rolesLower.includes("photographer") || rolesLower.includes("videographer")
          ? "Editorial brand campaign"
          : rolesLower.includes("model")
            ? "Luxury editorial production"
            : "Paid collaborative test",
      categories,
      predictions: buildPredictions(profile),
      dataQuality: {
        portfolio:
          profile.features.images.length > 0 && profile.features.portfolioUrl
            ? ("verified" as const)
            : profile.features.images.length > 0 || profile.features.portfolioUrl
              ? ("provided" as const)
              : ("missing" as const),
        social: profile.features.instagram ? ("provided" as const) : ("missing" as const),
        availability: profile.features.availabilityConfirmed ? ("confirmed" as const) : ("unknown" as const),
        location: profile.features.location || "Unknown",
        evidenceCount: profile.evidenceCount,
        missingFields: profile.missingFields,
      },
      href: `/admin/applications?focus=${profile.id}`,
      createdAt: profile.createdAt,
    };
  });
}

export async function rankSessionApplications(volumeId?: string): Promise<SessionApplicationRank[]> {
  const apps = await prisma.submission.findMany({
    where: { type: "session", ...(volumeId ? { sessionVolumeId: volumeId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, data: true, status: true, contactEmail: true, createdAt: true },
  });
  const revenue = await verifiedRevenueByEmail(apps.map((a) => a.contactEmail));
  return rankApplicationCohort(apps, revenue);
}

export async function generateApplicationRankingSummary(volumeId?: string): Promise<string> {
  const ranked = await rankSessionApplications(volumeId);
  const result = await generateAIContent({
    task: "general",
    prompt:
      "You are an executive hiring panel for ÉLEVÉ: creative director, hiring manager, operations manager, marketing director, producer, CEO, and financial analyst. " +
      "Review the ranked session applicants below and recommend who to shortlist and interview, with the decisive evidence for each. " +
      "Rules: cite only the evidence provided in context; never invent statistics, revenue figures, or historical comparisons — if data is missing, say 'Insufficient historical data'. " +
      "Explain relative order (why one applicant ranks above another). The human makes final decisions.",
    context: {
      cohortSize: ranked.length,
      topApplicants: ranked.slice(0, 10).map((r) => ({
        name: r.name,
        roles: r.roles,
        score: r.score,
        confidence: r.confidence,
        reasonForRank: r.reasonForRank,
        strengths: r.strengths,
        weakness: r.weakness,
        verifiedRevenue: r.expectedValue.basis === "verified" ? r.expectedValue.amount : "Insufficient historical data",
      })),
    },
  });
  return result.content;
}
