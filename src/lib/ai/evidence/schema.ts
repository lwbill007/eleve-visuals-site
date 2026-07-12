/**
 * Evidence Layer — every AI conclusion carries structured, inspectable evidence.
 */

export type EvidenceSourceType =
  | "internal_crm"
  | "internal_booking"
  | "internal_analytics"
  | "internal_portfolio"
  | "internal_knowledge"
  | "live_web"
  | "industry_best_practice"
  | "ai_inference"
  | "historical_performance";

export type EvidenceStatus = "verified" | "estimated" | "missing" | "assumed";

export interface EvidenceItem {
  id: string;
  label: string;
  value: string;
  sourceType: EvidenceSourceType;
  status: EvidenceStatus;
  connectorId?: string;
  weight?: number;
}

export interface EvidenceBundle {
  summary: string;
  items: EvidenceItem[];
  sourceTypes: EvidenceSourceType[];
  gaps: string[];
}

export interface ConfidenceBreakdown {
  overall: number;
  creative: number;
  business: number;
  research: number;
  production: number;
  sales: number;
  reasoning: string[];
}

export const EVIDENCE_SOURCE_LABELS: Record<EvidenceSourceType, string> = {
  internal_crm: "Internal CRM",
  internal_booking: "Internal Booking",
  internal_analytics: "Internal Analytics",
  internal_portfolio: "Internal Portfolio",
  internal_knowledge: "Knowledge Base",
  live_web: "Live Web Research",
  industry_best_practice: "Industry Best Practice",
  ai_inference: "AI Inference",
  historical_performance: "Historical Performance",
};

export function buildEvidenceBundle(
  summary: string,
  items: EvidenceItem[]
): EvidenceBundle {
  const present = items.filter((i) => i.status !== "missing");
  const sourceTypes = [...new Set(present.map((i) => i.sourceType))];
  const gaps = items.filter((i) => i.status === "missing").map((i) => i.label);
  return { summary, items, sourceTypes, gaps };
}

export function scoreConfidenceFromEvidence(
  items: EvidenceItem[],
  dims?: Partial<ConfidenceBreakdown>
): ConfidenceBreakdown {
  const usable = items.filter((i) => i.status === "verified" || i.status === "estimated");
  const verified = items.filter((i) => i.status === "verified").length;
  const missing = items.filter((i) => i.status === "missing").length;
  const base = Math.round(
    Math.max(
      45,
      Math.min(
        98,
        55 + verified * 6 + usable.length * 2 - missing * 5
      )
    )
  );

  const overall = dims?.overall ?? base;
  const reasoning: string[] = [];
  if (verified > 0) reasoning.push(`${verified} verified evidence items`);
  if (missing > 0) reasoning.push(`${missing} evidence gaps reduce certainty`);
  if (items.some((i) => i.sourceType === "live_web" && i.status === "verified")) {
    reasoning.push("Live research available");
  } else {
    reasoning.push("No live web verification in this pass");
  }

  return {
    overall,
    creative: dims?.creative ?? clamp(overall - 4, 40, 98),
    business: dims?.business ?? clamp(overall + 2, 40, 99),
    research: dims?.research ?? clamp(overall - (items.some((i) => i.sourceType === "live_web") ? 0 : 12), 35, 95),
    production: dims?.production ?? clamp(overall - 2, 40, 96),
    sales: dims?.sales ?? clamp(overall, 40, 98),
    reasoning: dims?.reasoning ?? reasoning,
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function formatEvidenceForPrompt(bundle: EvidenceBundle): string {
  const lines = bundle.items.map((i) => {
    const mark = i.status === "verified" ? "✓" : i.status === "missing" ? "✗" : "~";
    return `${mark} ${i.label}: ${i.value} [${EVIDENCE_SOURCE_LABELS[i.sourceType]}]`;
  });
  return [
    `Evidence summary: ${bundle.summary}`,
    ...lines,
    bundle.gaps.length ? `Gaps: ${bundle.gaps.join("; ")}` : "Gaps: none",
  ].join("\n");
}
