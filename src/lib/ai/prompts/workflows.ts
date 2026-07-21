export const AI_WORKFLOW_MODES = [
  "standard",
  "brainstorming",
  "writing-plans",
  "seo-audit",
  "sales-enablement",
  "ad-creative",
] as const;

export type AIWorkflowMode = (typeof AI_WORKFLOW_MODES)[number];

export interface AIWorkflowHistoryMessage {
  role?: string;
  content: string;
}

export interface AIWorkflowSelection {
  mode: AIWorkflowMode;
  label: string;
  prompt: string;
}

interface RouteAIWorkflowInput {
  message: string;
  page?: string;
  history?: AIWorkflowHistoryMessage[];
}

const SHARED_CONSTRAINTS = `Use Business DNA, current workspace context, memory, and verified evidence as authoritative inputs.
Ask only for information that is not already available.
Label assumptions, estimates, drafts, and unknowns explicitly. Never invent analytics, revenue, rankings, testimonials, outcomes, or performance.
Return a reviewable draft or plan only. Never execute, send, publish, mutate, or claim implementation.`;

const WORKFLOWS: Record<
  AIWorkflowMode,
  { label: string; prompt: string }
> = {
  standard: {
    label: "Standard",
    prompt: "",
  },
  brainstorming: {
    label: "Brainstorming",
    prompt: `ACTIVE WORKFLOW: BRAINSTORMING
Guide the user from an idea to an approved direction.
Ask one focused question per response. Prefer concise choices when they make the decision easier.
Establish the goal, constraints, audience, and success criteria before proposing solutions.
When context is sufficient, compare two or three viable approaches with trade-offs, lead with a recommendation, and ask for approval.
After approval, offer an actionable plan; do not continue asking questions that the available evidence already answers.
${SHARED_CONSTRAINTS}`,
  },
  "writing-plans": {
    label: "Writing Plans",
    prompt: `ACTIVE WORKFLOW: WRITING PLANS
Convert the approved or sufficiently defined direction into an outcome-oriented ÉLEVÉ business plan.
Include the goal, evidence, assumptions, constraints, owners, dependencies, ordered phases, deliverables, success measures, risks, and verification criteria.
Use concrete steps, but do not invent technical implementation details or unavailable business facts.
Keep unknowns explicit and identify the decision or evidence needed to resolve each one.
${SHARED_CONSTRAINTS}`,
  },
  "seo-audit": {
    label: "SEO Audit",
    prompt: `ACTIVE WORKFLOW: SEO AUDIT
Audit in this priority order: crawlability and indexation, technical foundations, on-page optimization, content quality, then authority and links.
For every finding provide Issue, Impact, Evidence, Fix, and Priority.
Distinguish observed evidence from recommendations. State when Search Console, analytics, rendered schema, Core Web Vitals, or competitor evidence is unavailable.
Do not claim that schema is absent unless rendered-page evidence supports it.
${SHARED_CONSTRAINTS}`,
  },
  "sales-enablement": {
    label: "Sales Enablement",
    prompt: `ACTIVE WORKFLOW: SALES ENABLEMENT
Create collateral tailored to the buyer, funnel stage, sales motion, and provable outcomes.
Use the correct format for the requested asset: proposal, deck outline, one-pager, objection handling, demo script, talk track, playbook, or buyer card.
Keep the result scannable and connect claims to revenue, efficiency, risk reduction, or another evidenced buyer outcome.
Mark unsupported proof points as missing evidence instead of fabricating them.
${SHARED_CONSTRAINTS}`,
  },
  "ad-creative": {
    label: "Ad Creative",
    prompt: `ACTIVE WORKFLOW: AD CREATIVE
Establish platform, format, offer, audience, awareness stage, grounding evidence, brand constraints, and the metric the test should optimize.
Organize creative around distinct testable angles rather than superficial wording changes.
Validate every deliverable against the selected platform's current character limits and flag any unavailable specification.
Cite grounding sources when available. Never predict performance without measured data, and label every concept as draft creative.
${SHARED_CONSTRAINTS}`,
  },
};

const SEO_INTENT =
  /\b(seo|search engine|organic traffic|search console|index(?:ing|ation|ed)?|crawl(?:ability|ing)?|canonical|sitemap|robots\.txt|meta (?:title|description|tags?)|schema markup|structured data|core web vitals?|not ranking|rankings?)\b/i;
const AD_INTENT =
  /\b(ad creative|ad copy|paid ads?|meta ads?|facebook ads?|instagram ads?|google ads?|linkedin ads?|tiktok ads?|responsive search ads?|rsa headlines?|creative variations?|creative testing|ad hooks?|roas|cost per acquisition|cpa)\b/i;
const SALES_INTENT =
  /\b(sales enablement|pitch deck|sales deck|one[- ]pager|leave[- ]behind|objection handling|demo script|talk track|sales playbook|proposal template|buyer persona card|sales collateral|roi calculator)\b/i;
const PLAN_INTENT =
  /\b(implementation plan|action plan|phased plan|project plan|execution plan|rollout plan|turn (?:this|it) into (?:a )?plan|break (?:this|it) into steps|sequence the work)\b/i;
const BRAINSTORM_INTENT =
  /\b(brainstorm|ideate|explore ideas?|creative direction|design (?:a|the|new)|come up with|new feature|new workflow|what should we build|compare approaches|campaign concept|campaign direction)\b/i;
const APPROVAL =
  /^(?:yes|approved|approve|looks good|that works|use (?:the|your) recommended|go with (?:the|your) recommended|best option|proceed)\b/i;
const BRAINSTORMING_HANDOFF =
  /\b(two|three|2|3) (?:viable )?approaches\b|\btrade-?offs\b|\bdoes (?:this|that) direction look right\b|\bi recommend\b/i;

function select(mode: AIWorkflowMode): AIWorkflowSelection {
  return { mode, ...WORKFLOWS[mode] };
}

export function workflowPrompt(mode: AIWorkflowMode): string {
  return WORKFLOWS[mode].prompt;
}

export function routeAIWorkflow({
  message,
  page = "general",
  history = [],
}: RouteAIWorkflowInput): AIWorkflowSelection {
  const request = message.trim();
  const lastAssistant =
    [...history].reverse().find((item) => item.role === "assistant")?.content ?? "";

  if (SEO_INTENT.test(request)) return select("seo-audit");
  if (AD_INTENT.test(request)) return select("ad-creative");
  if (SALES_INTENT.test(request)) return select("sales-enablement");
  if (PLAN_INTENT.test(request)) return select("writing-plans");
  if (BRAINSTORM_INTENT.test(request)) return select("brainstorming");

  if (APPROVAL.test(request) && BRAINSTORMING_HANDOFF.test(lastAssistant)) {
    return select("writing-plans");
  }

  const workspace = page.toLowerCase();
  if (
    /(website|homepage|content)/.test(workspace) &&
    /\b(audit|traffic|metadata|discoverability|performance)\b/i.test(request)
  ) {
    return select("seo-audit");
  }
  if (
    /(marketing|campaign)/.test(workspace) &&
    /\b(headlines?|hooks?|variations?|creative|paid)\b/i.test(request)
  ) {
    return select("ad-creative");
  }
  if (
    /(crm|pipeline|booking|email)/.test(workspace) &&
    /\b(collateral|proposal|objections?|pitch|sales material)\b/i.test(request)
  ) {
    return select("sales-enablement");
  }

  return select("standard");
}
