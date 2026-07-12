/**
 * Research gate — search only when it materially improves decisions.
 */

import {
  AUTO_SEARCH_TRIGGERS,
  KNOWLEDGE_PRIORITY_ORDER,
  RESEARCH_CATEGORIES,
  type ResearchCategory,
} from "./charter";
import type { ResearchGateDecision } from "./types";
import { listKnowledgeConnectors } from "../connectors/knowledge";
import { evaluateBusinessRelevance } from "./relevance";

const CATEGORY_KEYWORDS: Record<ResearchCategory, RegExp> = {
  marketing: /\b(instagram|tiktok|youtube|linkedin|pinterest|meta ads|email marketing|campaign|branding|audience|seasonal marketing)\b/i,
  seo: /\b(seo|search console|core web vitals|structured data|indexing|rich results|google search|algorithm update)\b/i,
  ux: /\b(ux|accessibility|ada|conversion optimization|design system|booking ux|checkout|navigation)\b/i,
  business: /\b(pricing model|client retention|crm strateg|agency|studio business|executive operations)\b/i,
  technology: /\b(openai|anthropic|next\.?js|vercel|prisma|stripe|cloudinary|resend|clerk|supabase|neon|api update|firmware)\b/i,
  photography: /\b(lightroom|capture one|davinci|lens|camera|color grading|editorial photography|lighting technique)\b/i,
  local: /\b(weather|golden hour|sunrise|sunset|road closure|permit|venue|studio rental|local event)\b/i,
  financial: /\b(inflation|interest rate|tax|deduction|grant|funding|economic indicator)\b/i,
  competitor: /\b(competitor|competitive|rival studio|positioning vs)\b/i,
  legal: /\b(copyright|licensing|privacy law|ccpa|gdpr|ftc|compliance|regulation)\b/i,
};

const EXPLICIT_CURRENT =
  /\b(latest|current|today|this week|this month|202[4-9]|what's new|what is new|recent update|breaking|now)\b/i;

const STATIC_INTERNAL =
  /\b(our (bookings?|crm|pipeline|revenue|clients?|portfolio|analytics)|how many|mtd|this month'?s bookings)\b/i;

export function detectResearchCategory(query: string): ResearchCategory | null {
  for (const [cat, re] of Object.entries(CATEGORY_KEYWORDS) as [ResearchCategory, RegExp][]) {
    if (re.test(query)) return cat;
  }
  return null;
}

export function matchAutoTriggers(query: string): string[] {
  const q = query.toLowerCase();
  const matched: string[] = [];
  for (const t of AUTO_SEARCH_TRIGGERS) {
    const key = t.toLowerCase().split(" ")[0];
    if (q.includes(key) || (EXPLICIT_CURRENT.test(query) && t.includes("explicitly"))) {
      matched.push(t);
    }
  }
  if (EXPLICIT_CURRENT.test(query) && !matched.includes("User explicitly requests current information")) {
    matched.push("User explicitly requests current information");
  }
  const cat = detectResearchCategory(query);
  if (cat && matched.length === 0) {
    matched.push(`Category signal: ${RESEARCH_CATEGORIES[cat].label}`);
  }
  return matched;
}

export async function evaluateResearchGate(input: {
  query: string;
  internalSufficient?: boolean;
  forceExternal?: boolean;
}): Promise<ResearchGateDecision> {
  const connectors = await listKnowledgeConnectors();
  const web = connectors.find((c) => c.id === "web_search");
  const connectorAvailable = Boolean(web?.wired && web.health === "healthy");

  const category = detectResearchCategory(input.query);
  const triggersMatched = matchAutoTriggers(input.query);
  const relevance = evaluateBusinessRelevance(input.query);
  const looksInternalStatic = STATIC_INTERNAL.test(input.query) && !EXPLICIT_CURRENT.test(input.query);

  const internalSufficient =
    input.internalSufficient === true ||
    (looksInternalStatic && !input.forceExternal && triggersMatched.length === 0);

  let shouldSearch = false;
  let reason = "";

  if (!relevance.relevant && !input.forceExternal) {
    shouldSearch = false;
    reason = `Business relevance filter: ${relevance.reason}`;
  } else if (internalSufficient && !input.forceExternal) {
    shouldSearch = false;
    reason =
      "Internal knowledge is sufficient — web search skipped per priority order (internal before general web).";
  } else if (input.forceExternal || triggersMatched.length > 0 || category != null) {
    if (!connectorAvailable) {
      shouldSearch = false;
      reason =
        "External research would improve this decision, but the live web connector is not wired — do not invent findings.";
    } else {
      shouldSearch = true;
      reason =
        "External research may materially improve accuracy, confidence, or decision quality.";
    }
  } else {
    shouldSearch = false;
    reason =
      "No material external-research trigger detected — prefer internal database, CRM, bookings, analytics, and knowledge graph.";
  }

  return {
    shouldSearch,
    reason,
    category,
    triggersMatched,
    internalSufficient,
    connectorAvailable,
    priorityChecked: KNOWLEDGE_PRIORITY_ORDER,
    relevance,
  };
}
