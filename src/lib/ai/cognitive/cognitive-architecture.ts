import { prisma } from "@/lib/db";
import { getCached, setCache } from "../cache";
import { getMemoryGraph } from "../memory/graph";
import { getWorkspaceId } from "../memory/workspace";
import {
  getIntelligenceAutomationSettings,
  getAutomationOptions,
} from "../memory/knowledge/automation";
import { getExecutiveIntelligence } from "../intelligence/executive-intelligence";
import { getPrioritizedRecommendations } from "../intelligence/executive-prioritization";
import { detectRevenueLeaks } from "../executive/revenue-leaks";
import { buildBusinessDNA } from "./business-dna";
import { buildKnowledgeObjects } from "./knowledge-objects";
import { buildUnknowns } from "./unknowns-engine";
import { buildKnowledgeHealth } from "./knowledge-health";
import { buildDecisionJournal } from "./decision-journal";
import { buildLearningPatterns } from "./learning-engine";
import { buildExecutiveReasoning } from "./reasoning";
import { buildEvidenceCenter } from "./evidence-center";
import type {
  CognitiveArchitecture,
  CognitiveSystemMeta,
  ExecutiveBriefing,
  GraphGrowthPoint,
} from "./types";
import type { RefreshLearnReport } from "../memory/knowledge/types";

const COGNITIVE_SYSTEMS: CognitiveSystemMeta[] = [
  {
    id: "executive_intelligence",
    label: "Executive Intelligence",
    description: "Cross-domain synthesis for daily decisions",
    status: "active",
    contribution: "Morning briefing, priorities, ROI ranking",
  },
  {
    id: "business_brain",
    label: "Business Brain",
    description: "Unified understanding of ÉLEVÉ as a living business",
    status: "active",
    contribution: "Connects CRM, revenue, creative, and operations context",
  },
  {
    id: "knowledge_graph",
    label: "Knowledge Graph",
    description: "Living semantic graph of every business relationship",
    status: "active",
    contribution: "Traces homepage → portfolio → lead → booking → revenue chains",
  },
  {
    id: "business_dna",
    label: "Business DNA",
    description: "Permanent deepest understanding of the company",
    status: "active",
    contribution: "Every recommendation references mission, positioning, and rules",
  },
  {
    id: "learning_engine",
    label: "Learning Engine",
    description: "Patterns, habits, successes, and failures",
    status: "active",
    contribution: "Strengthens future recommendations from real outcomes",
  },
  {
    id: "prediction_engine",
    label: "Prediction Engine",
    description: "Forecasts with confidence intervals",
    status: "partial",
    contribution: "Revenue, bookings, demand, seasonality projections",
  },
  {
    id: "decision_engine",
    label: "Decision Engine",
    description: "Transparent reasoning for every recommendation",
    status: "active",
    contribution: "Why, evidence, impact, alternatives — never a black box",
  },
  {
    id: "opportunity_engine",
    label: "Opportunity Engine",
    description: "Data-backed growth opportunities",
    status: "active",
    contribution: "Ranked by expected revenue and implementation effort",
  },
  {
    id: "risk_engine",
    label: "Risk Engine",
    description: "Revenue leaks, churn, and operational risks",
    status: "active",
    contribution: "Surfaces what could hurt the business before it does",
  },
  {
    id: "memory_explorer",
    label: "Memory Explorer",
    description: "Typed knowledge objects with full metadata",
    status: "active",
    contribution: "Browse institutional knowledge by type, impact, and confidence",
  },
  {
    id: "timeline",
    label: "Timeline",
    description: "Chronological business intelligence events",
    status: "active",
    contribution: "What changed, when, and why it matters",
  },
  {
    id: "automation_intelligence",
    label: "Automation Intelligence",
    description: "When and why intelligence refreshes",
    status: "active",
    contribution: "Event-driven learning from bookings, uploads, deployments",
  },
  {
    id: "unknowns_center",
    label: "Unknowns Center",
    description: "What the AI does not yet know",
    status: "active",
    contribution: "Actively reduces uncertainty — GA4, Search Console, ad spend gaps",
  },
  {
    id: "evidence_center",
    label: "Evidence Center",
    description: "Verified facts supporting decisions",
    status: "active",
    contribution: "Metrics, memories, learnings with freshness and confidence",
  },
  {
    id: "strategy_simulator",
    label: "Strategy Simulator",
    description: "Executive what-if scenarios",
    status: "active",
    contribution: "Model pricing, hiring, campaigns before committing",
  },
];

async function loadLastRefreshReport(): Promise<RefreshLearnReport | null> {
  const workspaceId = getWorkspaceId();
  const mem = await prisma.aIMemory.findFirst({
    where: { workspaceId, category: "refresh_report", archived: false },
    orderBy: { updatedAt: "desc" },
  });
  if (!mem?.value) return null;
  try {
    return JSON.parse(mem.value) as RefreshLearnReport;
  } catch {
    return null;
  }
}

async function buildGraphGrowth(): Promise<GraphGrowthPoint[]> {
  const workspaceId = getWorkspaceId();
  const reports = await prisma.aIMemory.findMany({
    where: { workspaceId, category: "refresh_report", archived: false },
    orderBy: { createdAt: "asc" },
    take: 12,
    select: { value: true, createdAt: true },
  });

  return reports.map((r) => {
    let nodes = 0;
    let edges = 0;
    try {
      const report = JSON.parse(r.value) as RefreshLearnReport;
      nodes = report.memoriesCreated + report.memoriesUpdated + report.memoriesUnchanged;
      edges = report.graphLinksCreated;
    } catch {
      /* ignore */
    }
    return {
      date: r.createdAt.toISOString().slice(0, 10),
      nodes,
      edges,
    };
  });
}

async function buildExecutiveBriefing(
  lastRefresh: RefreshLearnReport | null
): Promise<ExecutiveBriefing> {
  const [recs, intelligence, leaks] = await Promise.all([
    getPrioritizedRecommendations(3),
    getExecutiveIntelligence(),
    detectRevenueLeaks(),
  ]);

  const topRec = recs[0];
  const topRisk = intelligence.risks[0];
  const leakTotal = leaks.reduce((s, l) => s + l.estimatedLoss, 0);

  return {
    generatedAt: new Date().toISOString(),
    executiveSummary: lastRefresh
      ? lastRefresh.executiveReport.summary
      : "Run Refresh Executive Intelligence to generate a full platform scan and executive summary.",
    biggestDiscovery:
      lastRefresh?.whatChanged[0] ??
      (intelligence.opportunities[0]?.title ?? "Complete first intelligence refresh"),
    biggestOpportunity: topRec?.title ?? intelligence.opportunities[0]?.title ?? "Awaiting scan",
    biggestRisk: topRisk?.title ?? `~$${Math.round(leakTotal).toLocaleString()} revenue at risk from detected leaks`,
    revenueImpact: topRec
      ? `~$${topRec.estimatedRevenue.toLocaleString()} expected from top action`
      : "Unknown until pipeline scanned",
    brandImpact: lastRefresh?.executiveReport.brandInconsistencies[0] ?? "No brand issues flagged",
    websiteImpact: lastRefresh?.executiveReport.conversionBlockers[0] ?? "Scan website funnel",
    marketingImpact: lastRefresh?.opportunities[0] ?? "Connect Instagram API for content intelligence",
    salesImpact:
      intelligence.opportunities.find((o) => o.category === "sales")?.title ??
      "Review stale inquiries",
    knowledgeChanges: lastRefresh
      ? [
          `${lastRefresh.memoriesCreated} new · ${lastRefresh.memoriesUpdated} updated · ${lastRefresh.memoriesArchived} archived`,
          ...lastRefresh.whatChanged.slice(0, 3),
        ]
      : ["No refresh completed yet"],
    recommendedActions: recs.slice(0, 3).map((r) => ({
      title: r.title,
      href: r.actions[0]?.href ?? "/admin/opportunities",
      expectedRoi: `~$${r.estimatedRevenue.toLocaleString()}`,
    })),
    unknowns: lastRefresh?.missingInformation.slice(0, 5) ?? [
      "GA4 not connected",
      "Search Console not synced",
      "Ad spend not tracked",
    ],
    expectedRoi: topRec ? `~$${topRec.estimatedRevenue.toLocaleString()} · ${Math.round(topRec.confidence * 100)}% conf` : "TBD",
  };
}

function buildChainExample(graph: Awaited<ReturnType<typeof getMemoryGraph>>): string[] {
  if (graph.nodes.length < 3) {
    return [
      "Homepage",
      "Portfolio",
      "Cinema Noir",
      "Volume 1",
      "Instagram Reel",
      "Lead",
      "Booking",
      "Revenue",
      "Testimonial",
      "Referral",
      "Repeat Client",
    ];
  }

  const edge = graph.edges[0];
  if (!edge) return graph.nodes.slice(0, 6).map((n) => n.label);

  const from = graph.nodes.find((n) => n.id === edge.from);
  const to = graph.nodes.find((n) => n.id === edge.to);
  const chain = [from?.label ?? "Source", to?.label ?? "Target"];
  let current = edge.to;
  for (let i = 0; i < 4; i++) {
    const next = graph.edges.find((e) => e.from === current);
    if (!next) break;
    const node = graph.nodes.find((n) => n.id === next.to);
    if (node) chain.push(node.label);
    current = next.to;
  }
  return chain;
}

export async function buildCognitiveArchitecture(): Promise<CognitiveArchitecture> {
  const lastRefresh = await loadLastRefreshReport();

  const [
    businessDna,
    knowledgeData,
    graph,
    graphGrowth,
    reasoning,
    learningPatterns,
    decisionJournal,
    unknowns,
    knowledgeHealth,
    evidence,
    executiveBriefing,
    automationSettings,
    totalNodes,
    totalEdges,
  ] = await Promise.all([
    buildBusinessDNA(),
    buildKnowledgeObjects(60),
    getMemoryGraph({ limit: 80 }),
    buildGraphGrowth(),
    buildExecutiveReasoning(),
    buildLearningPatterns(),
    buildDecisionJournal(15),
    buildUnknowns(),
    buildKnowledgeHealth(),
    buildEvidenceCenter(12),
    buildExecutiveBriefing(lastRefresh),
    getIntelligenceAutomationSettings(),
    prisma.aIMemory.count({ where: { workspaceId: getWorkspaceId(), archived: false } }),
    prisma.aIMemoryRelation.count({ where: { workspaceId: getWorkspaceId() } }),
  ]);

  const automationOptions = getAutomationOptions(automationSettings);

  return {
    generatedAt: new Date().toISOString(),
    systems: COGNITIVE_SYSTEMS,
    businessDna,
    knowledgeObjects: knowledgeData.objects,
    objectCounts: knowledgeData.counts,
    graph: {
      nodes: graph.nodes.map((n) => ({
        id: n.id,
        label: n.label,
        layer: n.layer,
        type: n.category,
      })),
      edges: graph.edges,
      growth: graphGrowth,
      chainExample: buildChainExample(graph),
      totalNodes,
      totalEdges,
    },
    reasoning,
    learningPatterns,
    decisionJournal,
    unknowns,
    knowledgeHealth,
    executiveBriefing,
    lastRefresh,
    evidence,
    automation: {
      triggers: automationOptions.map((o) => ({
        id: o.id,
        label: o.label,
        enabled: o.enabled,
      })),
      lastRun: automationSettings.lastRunAt,
      nextScheduled: automationSettings.schedules.includes("daily")
        ? "Tonight (daily)"
        : automationSettings.schedules.includes("weekly")
          ? "This week"
          : undefined,
    },
  };
}

export async function getCognitiveArchitecture(force = false): Promise<CognitiveArchitecture> {
  const cacheKey = "cognitive-architecture-v1";
  if (!force) {
    const cached = await getCached<CognitiveArchitecture>(cacheKey);
    if (cached) return cached;
  }

  const arch = await buildCognitiveArchitecture();
  await setCache(cacheKey, arch, 10 * 60 * 1000);
  return arch;
}
