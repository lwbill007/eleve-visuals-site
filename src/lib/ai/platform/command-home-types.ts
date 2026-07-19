/**
 * Client-safe Command Home payload types (no Prisma / AI adapters).
 */

import type { OwnedMetric } from "./metric-owners";
import type { RecommendationContract } from "./recommendation-contract";
import type { LiveBusinessHealth } from "../reasoning/types";

export interface ChangeInsight {
  id: string;
  label: string;
  period: "yesterday" | "last_week" | "last_month";
  direction: "up" | "down" | "flat" | "unknown";
  deltaLabel: string;
  why: string;
  evidence: string[];
  ownerHref: string;
  confidence: number;
}

export interface CommandHomePayload {
  generatedAt: string;
  executiveSummary: {
    briefing: string;
    biggestWin: { title: string; evidence: string[]; href: string } | null;
    biggestProblem: { title: string; evidence: string[]; href: string } | null;
    biggestOpportunity: { title: string; evidence: string[]; href: string } | null;
    biggestRisk: { title: string; evidence: string[]; href: string } | null;
  };
  kpis: OwnedMetric[];
  businessHealth: LiveBusinessHealth & {
    domains: {
      id: string;
      label: string;
      score: number | null;
      href: string;
      explain: string;
    }[];
  };
  whatChanged: ChangeInsight[];
  priorities: RecommendationContract[];
}
