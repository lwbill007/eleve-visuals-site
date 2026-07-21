import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeApplicationStatus } from "@/lib/types";
import { getCached, setCache } from "../cache";
import { aiComplete } from "../adapter";
import { isAIConfigured } from "../config";
import { logAIAction } from "../log";
import { generateAIContent } from "../service";
import type { SessionApplicationRank } from "../types";
import {
  collectExternalApplicantEvidence,
  type ExternalApplicantEvidence,
} from "./applicant-evidence";
import { resolveApplicantImageInputs } from "@/lib/session-private-media";

type RankedCategory = SessionApplicationRank["categories"][number];
type CategoryKey = RankedCategory["key"];

export const APPLICATION_EVALUATION_VERSION = "ai-evaluation-v3.0";
const APPLICANT_EVALUATION_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const CATEGORY_DEFINITIONS: { key: CategoryKey; label: string; maxScore: number }[] = [
  { key: "portfolioQuality", label: "Portfolio Quality", maxScore: 25 },
  { key: "brandAlignment", label: "Brand Alignment", maxScore: 20 },
  { key: "businessValue", label: "Business Value", maxScore: 15 },
  { key: "professionalPresence", label: "Professionalism", maxScore: 15 },
  { key: "versatility", label: "Versatility", maxScore: 10 },
  { key: "experience", label: "Experience", maxScore: 5 },
  { key: "marketingImpact", label: "Marketing Value", maxScore: 5 },
  { key: "applicationQuality", label: "Application Quality", maxScore: 5 },
];

const TIE_BREAK_CHAIN: { key: CategoryKey | "confidence"; label: string }[] = [
  { key: "businessValue", label: "Business Value" },
  { key: "brandAlignment", label: "Brand Alignment" },
  { key: "portfolioQuality", label: "Portfolio" },
  { key: "professionalPresence", label: "Professionalism" },
  { key: "experience", label: "Experience" },
  { key: "confidence", label: "Confidence" },
  { key: "versatility", label: "Versatility" },
];

const categoryKeySchema = z.enum([
  "portfolioQuality",
  "brandAlignment",
  "businessValue",
  "professionalPresence",
  "versatility",
  "experience",
  "marketingImpact",
  "applicationQuality",
]);

const aiCategorySchema = z.object({
  key: categoryKeySchema,
  score: z.number().min(0).max(100).nullable(),
  confidence: z.number().min(0).max(100),
  notes: z.string().min(1),
  evidence: z.array(z.string()).max(6),
  missing: z.array(z.string()).max(6),
  improvements: z.array(z.string()).max(4),
});

const aiEvaluationSchema = z.object({
  categories: z.array(aiCategorySchema),
  strengths: z.array(z.string()).min(1).max(5),
  weaknesses: z.array(z.string()).min(1).max(5),
  recommendedProjects: z.array(z.string()).min(1).max(4),
  riskSignals: z.array(z.string()).max(5),
});

type AIEvaluation = z.infer<typeof aiEvaluationSchema>;

const APPLICANT_EVALUATION_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["categories", "strengths", "weaknesses", "recommendedProjects", "riskSignals"],
  properties: {
    categories: {
      type: "array",
      minItems: 8,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "score", "confidence", "notes", "evidence", "missing", "improvements"],
        properties: {
          key: {
            type: "string",
            enum: CATEGORY_DEFINITIONS.map((definition) => definition.key),
          },
          score: { type: ["number", "null"], minimum: 0, maximum: 100 },
          confidence: { type: "number", minimum: 0, maximum: 100 },
          notes: { type: "string" },
          evidence: { type: "array", maxItems: 6, items: { type: "string" } },
          missing: { type: "array", maxItems: 6, items: { type: "string" } },
          improvements: { type: "array", maxItems: 4, items: { type: "string" } },
        },
      },
    },
    strengths: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
    weaknesses: { type: "array", minItems: 1, maxItems: 5, items: { type: "string" } },
    recommendedProjects: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: { type: "string" },
    },
    riskSignals: { type: "array", maxItems: 5, items: { type: "string" } },
  },
};

interface SubmissionRecord {
  id: string;
  data: string;
  status: string;
  contactEmail: string;
  sessionVolumeId: string | null;
  createdAt: Date;
}

interface EvaluatedApplicant {
  submission: SubmissionRecord;
  name: string;
  roles: string[];
  images: string[];
  portfolioVisuallyReviewed: boolean;
  location: string;
  availabilityConfirmed: boolean;
  portfolioProvided: boolean;
  socialProvided: boolean;
  ai: AIEvaluation;
  provider: string;
  evidenceFingerprint: string;
  rawScore: number;
  confidence: number;
  unknownPenalty: number;
  assessedWeight: number;
  pairwiseWins: number;
  pairwiseLosses: number;
  /** Populated when the AI evaluation for this applicant failed. */
  evaluationError?: string;
}

function parseData(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function stringValue(data: Record<string, unknown>, key: string): string {
  return typeof data[key] === "string" ? String(data[key]).trim() : "";
}

function stringArray(data: Record<string, unknown>, key: string): string[] {
  return Array.isArray(data[key])
    ? (data[key] as unknown[]).filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0
      )
    : [];
}

function questionAnswers(data: Record<string, unknown>): { question: string; answer: string }[] {
  if (!Array.isArray(data.questionAnswers)) return [];
  return data.questionAnswers
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const row = item as Record<string, unknown>;
      const question = typeof row.question === "string" ? row.question.trim() : "";
      const answer = typeof row.answer === "string" ? row.answer.trim() : "";
      return question && answer ? { question, answer } : null;
    })
    .filter((item): item is { question: string; answer: string } => item !== null);
}

function inputHash(submission: SubmissionRecord): string {
  return createHash("sha256")
    .update(`${APPLICATION_EVALUATION_VERSION}:${submission.data}`)
    .digest("hex");
}

/** Repairs the most common LLM JSON defects without touching valid JSON. */
function repairJsonCandidate(source: string): string[] {
  const repaired: string[] = [];
  // Trailing commas before a closing bracket.
  const noTrailingCommas = source.replace(/,\s*([}\]])/g, "$1");
  repaired.push(noTrailingCommas);
  // Smart quotes and raw control characters (unescaped newlines inside strings).
  repaired.push(
    noTrailingCommas
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
      .replace(/\r?\n/g, " ")
  );
  // Single-quoted JSON — only attempted when the text has no double quotes at all.
  if (!source.includes('"') && source.includes("'")) {
    repaired.push(noTrailingCommas.replace(/'/g, '"'));
  }
  return repaired;
}

/**
 * Layered JSON extraction: whole response → fenced block → first {...} object
 * → first [...] array, each with repair variants. Throws a diagnostic error
 * (first parser failure with character position and surrounding text) only
 * when every strategy fails.
 */
export function extractJson(content: string): unknown {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidates: string[] = [];
  const push = (value: string | undefined | null) => {
    const trimmed = value?.trim();
    if (trimmed && !candidates.includes(trimmed)) candidates.push(trimmed);
  };

  for (const source of [content, fenced]) {
    if (!source) continue;
    push(source);
    const objectStart = source.indexOf("{");
    const objectEnd = source.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) push(source.slice(objectStart, objectEnd + 1));
    const arrayStart = source.indexOf("[");
    const arrayEnd = source.lastIndexOf("]");
    if (arrayStart >= 0 && arrayEnd > arrayStart) push(source.slice(arrayStart, arrayEnd + 1));
  }
  for (const candidate of [...candidates]) {
    for (const repaired of repairJsonCandidate(candidate)) push(repaired);
  }

  let firstFailure: { candidate: string; message: string } | null = null;
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") return parsed;
    } catch (error) {
      if (!firstFailure) {
        firstFailure = {
          candidate,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    }
  }

  const positionMatch = firstFailure?.message.match(/position (\d+)/);
  const position = positionMatch ? Number(positionMatch[1]) : -1;
  const context =
    firstFailure && position >= 0
      ? ` Near: "${firstFailure.candidate.slice(Math.max(0, position - 40), position + 40)}"`
      : "";
  throw new Error(
    `AI returned malformed JSON. Parser: ${firstFailure?.message ?? "no JSON-like content found"}.${context} Raw response saved to logs.`
  );
}

function clampNumber(value: unknown, min: number, max: number): number | null {
  const num = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(num) ? Math.max(min, Math.min(max, num)) : null;
}

function stringList(value: unknown, max: number): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        .map((item) => item.trim())
        .slice(0, max)
    : [];
}

/**
 * Accepts imperfect model output instead of rejecting the whole evaluation.
 * Invalid categories are dropped (they surface as "not evaluated" with zero
 * confidence), numbers are clamped into range, and missing narrative fields
 * get explicit placeholders.
 */
function normalizeAIEvaluation(raw: unknown): AIEvaluation {
  const strict = aiEvaluationSchema.safeParse(raw);
  if (strict.success) return strict.data;

  const root = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
  const validKeys = new Set<string>(CATEGORY_DEFINITIONS.map((definition) => definition.key));
  const seen = new Set<string>();
  const categories: AIEvaluation["categories"] = [];
  if (Array.isArray(root.categories)) {
    for (const item of root.categories) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const key = typeof row.key === "string" ? row.key : "";
      if (!validKeys.has(key) || seen.has(key)) continue;
      seen.add(key);
      categories.push({
        key: key as CategoryKey,
        score: clampNumber(row.score, 0, 100),
        confidence: clampNumber(row.confidence, 0, 100) ?? 0,
        notes:
          typeof row.notes === "string" && row.notes.trim()
            ? row.notes.trim()
            : "No evaluation notes returned.",
        evidence: stringList(row.evidence, 6),
        missing: stringList(row.missing, 6),
        improvements: stringList(row.improvements, 4),
      });
    }
  }
  const strengths = stringList(root.strengths, 5);
  const weaknesses = stringList(root.weaknesses, 5);
  const recommendedProjects = stringList(root.recommendedProjects, 4);
  return {
    categories,
    strengths: strengths.length ? strengths : ["Not identified by the evaluation."],
    weaknesses: weaknesses.length ? weaknesses : ["Not identified by the evaluation."],
    recommendedProjects: recommendedProjects.length
      ? recommendedProjects
      : ["Standard evaluation session"],
    riskSignals: stringList(root.riskSignals, 5),
  };
}

function evaluationEvidence(data: Record<string, unknown>) {
  const legacyAnswers = [
    ["Why participate", stringValue(data, "whyParticipate")],
    ["Theme fit", stringValue(data, "themeFit")],
  ]
    .filter(([, answer]) => answer)
    .map(([question, answer]) => ({ question, answer }));

  return {
    roles: stringArray(data, "roles"),
    experience: stringValue(data, "experience") || stringValue(data, "experienceLevel"),
    writtenResponses: [...questionAnswers(data), ...legacyAnswers],
    // Presence is informational only. The prompt explicitly forbids awarding points for it.
    informationalSignals: {
      portfolioLinkProvided: Boolean(
        stringValue(data, "portfolioLink") ||
          stringValue(data, "portfolioWebsite") ||
          stringValue(data, "portfolioUrl")
      ),
      socialLinkProvided: Boolean(stringValue(data, "instagram")),
      logisticsConfirmed: {
        availability: data.availabilityConfirm === true,
        transportation: data.transportationConfirm === true,
        creativeDirection: data.creativeDirectionConfirm === true,
      },
    },
  };
}

const EVALUATOR_PROMPT = `You are the ÉLEVÉ applicant evaluation panel: Creative Director, Hiring Manager,
Operations Manager, Marketing Director, Producer, CEO, and Financial Analyst.

Evaluate the applicant's actual demonstrated quality. Return JSON only.

NON-NEGOTIABLE RULES:
- Do not award points because a field is filled, a portfolio exists, images were uploaded, or a social link exists.
- Portfolio Quality may be scored only from the attached images. If no images are attached, use null.
- A portfolio URL or social URL is informational and must never increase a score.
- Score claims only when supported by quoted application text or directly observable visual evidence.
- Do not invent clients, campaign results, revenue, ROI, followers, engagement, history, or analytics.
- If evidence is unavailable, use score: null and identify it under missing.
- Missing information lowers category confidence; it does not imply low applicant quality.
- Application Quality means specificity, clarity, thoughtfulness, and internal consistency—not completeness.
- Business Value means demonstrated commercial judgment, client outcomes, production contribution, or
  transferable value—not simply selecting a role.
- Marketing Value requires demonstrated audience/campaign evidence. Social-link existence is not evidence.
- Give genuine variance. Reserve 95+ category scores for exceptional, directly observable evidence.

Return exactly:
{
  "categories": [
    {
      "key": "portfolioQuality|brandAlignment|businessValue|professionalPresence|versatility|experience|marketingImpact|applicationQuality",
      "score": 0-100 or null,
      "confidence": 0-100,
      "notes": "specific evaluation",
      "evidence": ["direct quote or observable fact"],
      "missing": ["information needed"],
      "improvements": ["specific improvement"]
    }
  ],
  "strengths": ["evidence-based strength"],
  "weaknesses": ["evidence-based limitation or unknown"],
  "recommendedProjects": ["project justified by evidence"],
  "riskSignals": ["evidence gap or operational concern"]
}

Include all eight category keys exactly once.

OUTPUT FORMAT — ABSOLUTE:
You MUST return exactly one valid JSON object.
Do not include explanations.
Do not include markdown.
Do not wrap the JSON in code fences.
Do not include any text before or after the JSON.
Keep every string on a single line (no raw newlines inside strings).`;

async function evaluateApplicant(submission: SubmissionRecord): Promise<EvaluatedApplicant> {
  const data = parseData(submission.data);
  const portfolioUrl =
    stringValue(data, "portfolioLink") ||
    stringValue(data, "portfolioWebsite") ||
    stringValue(data, "portfolioUrl");
  const socialUrl = stringValue(data, "instagram");
  // External pages are best-effort evidence; fetch failures reduce confidence
  // but must never fail the evaluation itself.
  let external: ExternalApplicantEvidence;
  try {
    external = await collectExternalApplicantEvidence(portfolioUrl, socialUrl);
  } catch (error) {
    console.error(
      `[ai-rank] External evidence fetch failed for application ${submission.id} (portfolio=${portfolioUrl || "none"}, social=${socialUrl || "none"}):`,
      error
    );
    external = {
      portfolio: {
        source: portfolioUrl,
        fetched: false,
        pageText: "",
        imageUrls: [],
        error: "Fetch failed",
      },
      social: { source: socialUrl, fetched: false, pageText: "", error: "Fetch failed" },
    };
  }
  const images = await resolveApplicantImageInputs(
    [
      ...new Set([
        ...stringArray(data, "portfolioImages"),
        ...external.portfolio.imageUrls,
      ]),
    ].slice(0, 8)
  );
  const evidence = evaluationEvidence(data);
  const userPrompt = JSON.stringify({
    applicantId: submission.id,
    evidence: {
      ...evidence,
      externalPortfolio: {
        fetched: external.portfolio.fetched,
        source: external.portfolio.source,
        pageText: external.portfolio.pageText,
        discoveredImages: external.portfolio.imageUrls.length,
        error: external.portfolio.error,
      },
      externalSocial: {
        fetched: external.social.fetched,
        source: external.social.source,
        pageText: external.social.pageText,
        error: external.social.error,
      },
    },
    attachedImageCount: images.length,
    instruction:
      "Evaluate this applicant. Attached images, when present, are the only source for Portfolio Quality.",
  });
  console.info(
    `[ai-rank] Request | application=${submission.id} | provider=openrouter | images=${images.length} | promptChars=${userPrompt.length}\nPrompt (first 2000 chars): ${userPrompt.slice(0, 2000)}`
  );
  const result = await aiComplete({
    messages: [
      { role: "system", content: EVALUATOR_PROMPT },
      { role: "user", content: userPrompt, images },
    ],
    temperature: 0.1,
    maxTokens: 6000,
    responseFormat: "json",
    responseSchema: {
      name: "applicant_evaluation",
      schema: APPLICANT_EVALUATION_JSON_SCHEMA,
    },
    task: "applicant_ranking",
    validateResponse: (content) => {
      normalizeAIEvaluation(extractJson(content));
      return true;
    },
  });

  if (!result?.content || result.finishReason === "error") {
    throw new Error(
      `AI provider returned no usable completion (provider=${result?.provider ?? "none"}, model=${result?.model || "none"}, finishReason=${result?.finishReason ?? "none"}, images=${images.length})`
    );
  }

  // Always persist the raw completion to the logs BEFORE parsing so malformed
  // output can be inspected verbatim.
  console.info(
    `[ai-rank] Raw completion | application=${submission.id} | model=${result.model} | provider=${result.provider} | finish=${result.nativeFinishReason ?? "unknown"} | chars=${result.content.length}\n${result.content.slice(0, 6000)}`
  );

  let extracted: unknown;
  try {
    extracted = extractJson(result.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message} Model: ${result.model} (finish=${result.nativeFinishReason ?? "unknown"}).`);
  }
  const parsed = normalizeAIEvaluation(extracted);
  const portfolioVisuallyReviewed = images.length > 0 && result.visionUsed === true;
  const byKey = new Map(parsed.categories.map((category) => [category.key, category]));
  const categories = CATEGORY_DEFINITIONS.map((definition) => {
    const category = byKey.get(definition.key);
    if (!category) {
      return {
        key: definition.key,
        score: null,
        confidence: 0,
        notes: "Not evaluated.",
        evidence: [],
        missing: ["AI evaluation omitted this category"],
        improvements: ["Provide reviewable evidence for this category."],
      };
    }
    // Enforce portfolio vision rule even if a model disregards the prompt.
    if (definition.key === "portfolioQuality" && !portfolioVisuallyReviewed) {
      return {
        ...category,
        score: null,
        confidence: 0,
        notes: "Portfolio quality not scored because no vision-capable review was available.",
        evidence: [],
        missing: [...new Set([...category.missing, "No vision-capable portfolio review available"])],
      };
    }
    return category;
  });

  const normalized: AIEvaluation = { ...parsed, categories };
  const assessed = CATEGORY_DEFINITIONS.flatMap((definition) => {
    const category = categories.find((item) => item.key === definition.key);
    return category?.score == null ? [] : [{ definition, category }];
  });
  const assessedWeight = assessed.reduce((sum, item) => sum + item.definition.maxScore, 0);
  const weighted = assessed.reduce(
    (sum, item) => sum + (item.category.score! / 100) * item.definition.maxScore,
    0
  );
  const rawScore = assessedWeight ? (weighted / assessedWeight) * 100 : 0;
  const categoryConfidence = assessedWeight
    ? assessed.reduce(
        (sum, item) => sum + item.category.confidence * item.definition.maxScore,
        0
      ) / assessedWeight
    : 0;
  const unknownWeight = 100 - assessedWeight;
  const unknownPenalty = Math.round(Math.min(8, unknownWeight * 0.08) * 10) / 10;
  const confidence = Math.round(
    Math.max(0, Math.min(98, categoryConfidence * (0.55 + assessedWeight / 220)))
  );

  return {
    submission,
    name: String(data.fullName || data.name || submission.contactEmail || "Applicant"),
    roles: stringArray(data, "roles"),
    images,
    portfolioVisuallyReviewed,
    location: stringValue(data, "cityState") || stringValue(data, "location") || "Unknown",
    availabilityConfirmed: data.availabilityConfirm === true,
    portfolioProvided: images.length > 0 || evidence.informationalSignals.portfolioLinkProvided,
    socialProvided: evidence.informationalSignals.socialLinkProvided,
    ai: normalized,
    provider: `${result.provider}:${result.model}`,
    evidenceFingerprint: createHash("sha256")
      .update(
        JSON.stringify({
          evidence,
          portfolioPage: external.portfolio.pageText,
          socialPage: external.social.pageText,
          images,
        })
      )
      .digest("hex"),
    rawScore,
    confidence,
    unknownPenalty,
    assessedWeight,
    pairwiseWins: 0,
    pairwiseLosses: 0,
  };
}

function failedEvaluation(submission: SubmissionRecord, error: unknown): EvaluatedApplicant {
  const data = parseData(submission.data);
  const message = error instanceof Error ? error.message : String(error);
  const portfolioProvided = Boolean(
    stringValue(data, "portfolioLink") ||
      stringValue(data, "portfolioWebsite") ||
      stringValue(data, "portfolioUrl")
  );
  return {
    submission,
    name: String(data.fullName || data.name || submission.contactEmail || "Applicant"),
    roles: stringArray(data, "roles"),
    images: [],
    portfolioVisuallyReviewed: false,
    location: stringValue(data, "cityState") || stringValue(data, "location") || "Unknown",
    availabilityConfirmed: data.availabilityConfirm === true,
    portfolioProvided,
    socialProvided: Boolean(stringValue(data, "instagram")),
    ai: {
      categories: [],
      strengths: ["Not evaluated — the AI run failed for this application."],
      weaknesses: [`Evaluation failed: ${message}`],
      recommendedProjects: ["Re-run the AI evaluation for this applicant."],
      riskSignals: ["AI evaluation failed"],
    },
    provider: "evaluation-failed",
    evidenceFingerprint: createHash("sha256")
      .update(`failed:${submission.id}:${submission.data}`)
      .digest("hex"),
    rawScore: 0,
    confidence: 0,
    unknownPenalty: 0,
    assessedWeight: 0,
    pairwiseWins: 0,
    pairwiseLosses: 0,
    evaluationError: message,
  };
}

/**
 * Isolates each applicant's evaluation: one transient AI failure gets a single
 * retry, and a persistent failure produces a visible "Evaluation Failed"
 * placeholder instead of aborting the entire cohort.
 */
async function evaluateApplicantSafely(submission: SubmissionRecord): Promise<EvaluatedApplicant> {
  const cacheKey = `applicant-evaluation:${submission.id}:${inputHash(submission)}`;
  const cached = await getCached<EvaluatedApplicant>(cacheKey).catch(() => null);
  if (cached) {
    await logAIAction("ai_cache_hit", submission.id, cacheKey);
    return {
      ...cached,
      submission: {
        ...cached.submission,
        createdAt: new Date(cached.submission.createdAt),
      },
      pairwiseWins: 0,
      pairwiseLosses: 0,
    };
  }

  let lastError: unknown = new Error("Evaluation did not run");
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const evaluated = await evaluateApplicant(submission);
      await setCache(cacheKey, evaluated, APPLICANT_EVALUATION_CACHE_TTL_MS).catch(() => {});
      return evaluated;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : "no stack";
      console.error(
        `[ai-rank] Evaluation attempt ${attempt}/2 failed | application=${submission.id} | error=${message}\n${stack}`
      );
    }
  }
  return failedEvaluation(submission, lastError);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(items.length, 1)) }, () => worker())
  );
  return results;
}

function categoryScore(applicant: EvaluatedApplicant, key: CategoryKey): number {
  return applicant.ai.categories.find((category) => category.key === key)?.score ?? -1;
}

function compareEvaluations(a: EvaluatedApplicant, b: EvaluatedApplicant): number {
  // Failed evaluations always rank below successfully evaluated applicants.
  if (Boolean(a.evaluationError) !== Boolean(b.evaluationError)) {
    return a.evaluationError ? 1 : -1;
  }
  const aAdjusted = a.rawScore - a.unknownPenalty;
  const bAdjusted = b.rawScore - b.unknownPenalty;
  if (Math.abs(aAdjusted - bAdjusted) > 0.05) return bAdjusted - aAdjusted;
  for (const step of TIE_BREAK_CHAIN) {
    const aValue = step.key === "confidence" ? a.confidence : categoryScore(a, step.key);
    const bValue = step.key === "confidence" ? b.confidence : categoryScore(b, step.key);
    if (Math.abs(aValue - bValue) > 0.05) return bValue - aValue;
  }
  return a.submission.id.localeCompare(b.submission.id);
}

/**
 * Explicit all-pairs comparison. Every applicant is evaluated head-to-head
 * against every other applicant before the final order is produced.
 */
function rankByAllPairs(evaluated: EvaluatedApplicant[]): EvaluatedApplicant[] {
  for (const applicant of evaluated) {
    applicant.pairwiseWins = 0;
    applicant.pairwiseLosses = 0;
  }
  for (let left = 0; left < evaluated.length; left += 1) {
    for (let right = left + 1; right < evaluated.length; right += 1) {
      const comparison = compareEvaluations(evaluated[left], evaluated[right]);
      const winner = comparison <= 0 ? evaluated[left] : evaluated[right];
      const loser = comparison <= 0 ? evaluated[right] : evaluated[left];
      winner.pairwiseWins += 1;
      loser.pairwiseLosses += 1;
    }
  }
  return [...evaluated].sort(
    (a, b) => b.pairwiseWins - a.pairwiseWins || compareEvaluations(a, b)
  );
}

function finalScore(applicant: EvaluatedApplicant, index: number): number {
  const positionalAnchor = Math.max(55, 96 - index * 3);
  const qualityAdjustment = Math.max(-8, Math.min(1, (applicant.rawScore - 70) * 0.08));
  const score = positionalAnchor + qualityAdjustment - applicant.unknownPenalty;
  const cap = applicant.rawScore >= 94 && applicant.confidence >= 92 ? 98.5 : 97;
  return Math.round(Math.max(20, Math.min(cap, score)) * 10) / 10;
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

function tieBreakFor(
  applicant: EvaluatedApplicant,
  above: EvaluatedApplicant | null
): SessionApplicationRank["tieBreak"] {
  if (!above || Math.abs(above.rawScore - applicant.rawScore) > 1.5) return null;
  for (const step of TIE_BREAK_CHAIN) {
    const mine = step.key === "confidence" ? applicant.confidence : categoryScore(applicant, step.key);
    const theirs = step.key === "confidence" ? above.confidence : categoryScore(above, step.key);
    if (Math.abs(theirs - mine) > 0.05) {
      return {
        comparedWith: above.name,
        decidedBy: step.label,
        detail: `${step.label}: ${theirs.toFixed(1)} vs ${mine.toFixed(1)}. ${above.name} wins this tie-break.`,
        chain: TIE_BREAK_CHAIN.map((item) => item.label),
      };
    }
  }
  return {
    comparedWith: above.name,
    decidedBy: "Identical evaluated metrics",
    detail: "All evaluated metrics and confidence are identical; stable submission ID order was used.",
    chain: TIE_BREAK_CHAIN.map((item) => item.label),
  };
}

function reasonForRank(
  applicant: EvaluatedApplicant,
  index: number,
  above: EvaluatedApplicant | null,
  cohortSize: number
): string {
  const strongest = [...applicant.ai.categories]
    .filter((category) => category.score != null)
    .sort((a, b) => b.score! - a.score!)[0];
  if (index === 0) {
    return `Ranked 1 of ${cohortSize}: won ${applicant.pairwiseWins} of ${
      cohortSize - 1
    } head-to-head comparisons with a weighted AI evaluation of ${applicant.rawScore.toFixed(
      1
    )}, led by ${strongest?.key ?? "available evidence"}.`;
  }
  if (!above) return `Ranked ${index + 1} of ${cohortSize}.`;
  if (Math.abs(above.rawScore - applicant.rawScore) <= 1.5) {
    const tieBreak = tieBreakFor(applicant, above);
    return tieBreak
      ? `Near-equal with ${above.name}; ${tieBreak.decidedBy} decided the order.`
      : `Ranked ${index + 1} after comparative evaluation.`;
  }
  return `Ranked below ${above.name}: ${applicant.pairwiseWins} head-to-head wins and weighted AI evaluation ${applicant.rawScore.toFixed(
    1
  )} vs ${above.rawScore.toFixed(1)}. Strongest evaluated area: ${
    strongest?.key ?? "insufficient evidence"
  }.`;
}

async function verifiedRevenueByEmail(
  emails: string[]
): Promise<Map<string, { total: number; count: number }>> {
  const map = new Map<string, { total: number; count: number }>();
  const valid = [...new Set(emails.filter(Boolean))];
  if (!valid.length) return map;
  const payments = await prisma.payment.findMany({
    where: { customerEmail: { in: valid }, status: "succeeded" },
    select: { customerEmail: true, amountCents: true },
  });
  for (const payment of payments) {
    const current = map.get(payment.customerEmail) ?? { total: 0, count: 0 };
    current.total += payment.amountCents / 100;
    current.count += 1;
    map.set(payment.customerEmail, current);
  }
  return map;
}

function buildFailedResult(
  applicant: EvaluatedApplicant,
  index: number,
  cohortSize: number,
  evaluatedAt: string
): SessionApplicationRank {
  const reason = `Ranked ${index + 1} of ${cohortSize}: the AI evaluation failed for this application (${applicant.evaluationError}). It is listed unranked at the bottom; re-run Re-Rank to retry.`;
  return {
    id: applicant.submission.id,
    name: applicant.name,
    email: applicant.submission.contactEmail,
    roles: applicant.roles,
    status: normalizeApplicationStatus(applicant.submission.status),
    score: 0,
    confidence: 0,
    evaluatedAt,
    evaluationVersion: APPLICATION_EVALUATION_VERSION,
    evaluationProvider: "evaluation-failed",
    unknownInformationPenalty: 0,
    evaluationError: applicant.evaluationError,
    tier: "Needs Review",
    recommendation: "Review",
    summary: reason,
    strengths: applicant.ai.strengths,
    weakness: applicant.ai.weaknesses.join(" · "),
    badges: ["Evaluation Failed"],
    riskLevel: "high",
    expectedValue: {
      basis: "insufficient",
      amount: 0,
      low: 0,
      high: 0,
      confidence: 0,
      rationale: "No historical data available.",
    },
    reasonForRank: reason,
    tieBreak: null,
    recommendedProject: applicant.ai.recommendedProjects.join(" · "),
    categories: CATEGORY_DEFINITIONS.map((definition) => ({
      key: definition.key,
      label: definition.label,
      score: 0,
      maxScore: definition.maxScore,
      confidence: 0,
      explanation: "Not scored — the AI evaluation failed for this application.",
      evidence: [],
      missing: ["AI evaluation failed"],
      improvements: ["Re-run the AI ranking."],
    })),
    predictions: [],
    dataQuality: {
      portfolio: applicant.portfolioProvided ? "provided" : "missing",
      social: applicant.socialProvided ? "provided" : "missing",
      availability: applicant.availabilityConfirmed ? "confirmed" : "unknown",
      location: applicant.location,
      evidenceCount: 0,
      missingFields: ["AI evaluation failed"],
    },
    href: `/admin/applications?focus=${applicant.submission.id}`,
    createdAt: applicant.submission.createdAt.toISOString(),
  };
}

function buildRankedResults(
  evaluated: EvaluatedApplicant[],
  revenue: Map<string, { total: number; count: number }>,
  evaluatedAt: string
): SessionApplicationRank[] {
  const cohort = rankByAllPairs(evaluated);
  const scores: number[] = [];

  return cohort.map((applicant, index) => {
    if (applicant.evaluationError) {
      scores.push(0);
      return buildFailedResult(applicant, index, cohort.length, evaluatedAt);
    }
    let score = finalScore(applicant, index);
    const above = index > 0 && !cohort[index - 1].evaluationError ? cohort[index - 1] : null;
    const metricsIdentical =
      above != null &&
      TIE_BREAK_CHAIN.every((step) => {
        const mine =
          step.key === "confidence" ? applicant.confidence : categoryScore(applicant, step.key);
        const theirs =
          step.key === "confidence" ? above.confidence : categoryScore(above, step.key);
        return Math.abs(mine - theirs) <= 0.05;
      });
    const inputsIdentical =
      above != null && above.evidenceFingerprint === applicant.evidenceFingerprint;
    if (index > 0 && !(metricsIdentical && inputsIdentical) && score >= scores[index - 1]) {
      score = Math.round((scores[index - 1] - 0.2) * 10) / 10;
    }
    if (index > 0 && metricsIdentical && inputsIdentical) score = scores[index - 1];
    scores.push(score);

    const categories: RankedCategory[] = CATEGORY_DEFINITIONS.map((definition) => {
      const category = applicant.ai.categories.find((item) => item.key === definition.key);
      return {
        key: definition.key,
        label: definition.label,
        score:
          category?.score == null
            ? 0
            : Math.round((category.score / 100) * definition.maxScore * 10) / 10,
        maxScore: definition.maxScore,
        confidence: Math.round(category?.confidence ?? 0),
        explanation: category?.notes ?? "Not evaluated — insufficient evidence.",
        evidence: category?.evidence ?? [],
        missing: category?.missing ?? ["Insufficient evidence"],
        improvements: category?.improvements ?? [],
      };
    });
    const payment = revenue.get(applicant.submission.contactEmail);
    const reason = reasonForRank(applicant, index, above, cohort.length);
    const riskLevel: SessionApplicationRank["riskLevel"] =
      applicant.confidence < 45 || applicant.ai.riskSignals.length >= 3
        ? "high"
        : applicant.confidence < 70 || applicant.ai.riskSignals.length > 0
          ? "medium"
          : "low";
    const recommendation: SessionApplicationRank["recommendation"] =
      score >= 91 && applicant.confidence >= 70
        ? "Invite to Interview"
        : score >= 85 && applicant.confidence >= 58
          ? "Shortlist"
          : applicant.confidence < 50
            ? "Request Evidence"
            : score >= 78
              ? "Review"
              : "Hold";

    return {
      id: applicant.submission.id,
      name: applicant.name,
      email: applicant.submission.contactEmail,
      roles: applicant.roles,
      status: normalizeApplicationStatus(applicant.submission.status),
      score,
      confidence: applicant.confidence,
      evaluatedAt,
      evaluationVersion: APPLICATION_EVALUATION_VERSION,
      evaluationProvider: applicant.provider,
      unknownInformationPenalty: applicant.unknownPenalty,
      tier: tierFor(score),
      recommendation,
      summary: reason,
      strengths: applicant.ai.strengths,
      weakness: applicant.ai.weaknesses.join(" · "),
      badges: [
        applicant.portfolioProvided ? "Portfolio Provided" : "",
        applicant.socialProvided ? "Social Profile Provided" : "",
        applicant.availabilityConfirmed ? "Availability Confirmed" : "",
        applicant.confidence >= 85 ? "High Confidence" : "",
      ].filter(Boolean),
      riskLevel,
      expectedValue: payment
        ? {
            basis: "verified",
            amount: Math.round(payment.total),
            low: Math.round(payment.total),
            high: Math.round(payment.total),
            confidence: 100,
            rationale: `Verified: ${payment.count} settled payment${
              payment.count === 1 ? "" : "s"
            } linked to this applicant.`,
          }
        : {
            basis: "insufficient",
            amount: 0,
            low: 0,
            high: 0,
            confidence: 0,
            rationale: "No historical data available.",
          },
      reasonForRank: reason,
      tieBreak: tieBreakFor(applicant, above),
      recommendedProject: applicant.ai.recommendedProjects.join(" · "),
      categories,
      predictions: [],
      dataQuality: {
        portfolio: applicant.portfolioVisuallyReviewed
          ? "verified"
          : applicant.portfolioProvided
            ? "provided"
            : "missing",
        social: applicant.socialProvided ? "provided" : "missing",
        availability: applicant.availabilityConfirmed ? "confirmed" : "unknown",
        location: applicant.location,
        evidenceCount: categories.reduce((sum, category) => sum + category.evidence.length, 0),
        missingFields: [
          ...new Set(categories.flatMap((category) => category.missing)),
        ],
      },
      href: `/admin/applications?focus=${applicant.submission.id}`,
      createdAt: applicant.submission.createdAt.toISOString(),
    };
  });
}

async function loadApplications(volumeId?: string): Promise<SubmissionRecord[]> {
  return prisma.submission.findMany({
    where: { type: "session", ...(volumeId ? { sessionVolumeId: volumeId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      data: true,
      status: true,
      contactEmail: true,
      sessionVolumeId: true,
      createdAt: true,
    },
  });
}

export interface SavedRankingState {
  ranked: SessionApplicationRank[];
  applicationCount: number;
  /** Applications with no current evaluation (never evaluated, stale, or superseded version). */
  unevaluatedCount: number;
}

/**
 * Returns whatever valid persisted evaluations exist. Never triggers AI work,
 * so the page load is fast and an unevaluated cohort is reported honestly
 * instead of appearing as "no applications".
 */
export async function getSavedRankingState(volumeId?: string): Promise<SavedRankingState> {
  const applications = await loadApplications(volumeId);
  if (!applications.length) return { ranked: [], applicationCount: 0, unevaluatedCount: 0 };

  const rows = await prisma.applicationEvaluation.findMany({
    where: { submissionId: { in: applications.map((application) => application.id) } },
    orderBy: { rank: "asc" },
  });
  const applicationById = new Map(applications.map((application) => [application.id, application]));
  const ranked: SessionApplicationRank[] = [];
  for (const row of rows) {
    const application = applicationById.get(row.submissionId);
    if (
      !application ||
      row.version !== APPLICATION_EVALUATION_VERSION ||
      row.inputHash !== inputHash(application)
    ) {
      continue;
    }
    try {
      const stored = JSON.parse(row.aiEvaluation) as SessionApplicationRank;
      ranked.push({
        ...stored,
        status: normalizeApplicationStatus(application.status),
        evaluatedAt: row.lastEvaluatedAt.toISOString(),
        evaluationVersion: row.version,
        evaluationProvider: row.provider,
      });
    } catch {
      /* treat unparsable rows as unevaluated */
    }
  }
  return {
    ranked,
    applicationCount: applications.length,
    unevaluatedCount: applications.length - ranked.length,
  };
}

export async function rerankSessionApplications(
  volumeId?: string
): Promise<SessionApplicationRank[]> {
  if (!isAIConfigured()) {
    throw new Error("AI provider is not configured; rankings were not changed.");
  }
  const applications = await loadApplications(volumeId);
  if (!applications.length) return [];

  // Each evaluation is isolated: individual failures become visible
  // "Evaluation Failed" entries instead of aborting the cohort.
  const evaluated = await mapWithConcurrency(applications, 2, evaluateApplicantSafely);
  const failures = evaluated.filter((applicant) => applicant.evaluationError);
  if (failures.length === evaluated.length) {
    throw new Error(
      `AI evaluation failed for all ${evaluated.length} applications; previous rankings were preserved. First error: ${failures[0]?.evaluationError ?? "unknown"}`
    );
  }
  if (failures.length) {
    console.error(
      `[ai-rank] ${failures.length}/${evaluated.length} evaluations failed and will be listed as "Evaluation Failed": ${failures
        .map((applicant) => `${applicant.submission.id} (${applicant.evaluationError})`)
        .join("; ")}`
    );
  }
  const evaluatedAt = new Date().toISOString();
  const revenue = await verifiedRevenueByEmail(
    applications.map((application) => application.contactEmail)
  );
  const ranked = buildRankedResults(evaluated, revenue, evaluatedAt);
  const applicationById = new Map(applications.map((application) => [application.id, application]));
  const providerById = new Map(evaluated.map((applicant) => [applicant.submission.id, applicant.provider]));

  await prisma.$transaction(
    ranked.map((result, index) => {
      const application = applicationById.get(result.id)!;
      const dimension = (key: CategoryKey) => {
        const category = result.categories.find((item) => item.key === key);
        return category?.confidence === 0
          ? null
          : category
            ? Math.round((category.score / category.maxScore) * 1000) / 10
            : null;
      };
      const data = {
        volumeId: application.sessionVolumeId,
        overallScore: result.score,
        confidence: result.confidence,
        rank: index + 1,
        version: APPLICATION_EVALUATION_VERSION,
        provider: providerById.get(result.id) ?? "unknown",
        inputHash: inputHash(application),
        aiEvaluation: JSON.stringify(result),
        portfolioScore: dimension("portfolioQuality"),
        brandAlignment: dimension("brandAlignment"),
        businessValue: dimension("businessValue"),
        professionalism: dimension("professionalPresence"),
        versatility: dimension("versatility"),
        experience: dimension("experience"),
        marketingImpact: dimension("marketingImpact"),
        applicationQuality: dimension("applicationQuality"),
        riskLevel: result.riskLevel,
        strengths: JSON.stringify(result.strengths),
        weaknesses: JSON.stringify([result.weakness]),
        reasoning: result.reasonForRank,
        lastEvaluatedAt: new Date(evaluatedAt),
      };
      return prisma.applicationEvaluation.upsert({
        where: { submissionId: result.id },
        create: { submissionId: result.id, ...data },
        update: data,
      });
    })
  );
  return ranked;
}

export async function rankSessionApplications(
  volumeId?: string
): Promise<SessionApplicationRank[]> {
  return (await getSavedRankingState(volumeId)).ranked;
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
