/**
 * Natural business questions → graph traversal (no custom code per question).
 */

import { prisma } from "@/lib/db";
import { getWorkspaceId } from "../memory/workspace";
import type { GraphRelationType } from "./graph-ontology";

export interface GraphQueryResult {
  question: string;
  answer: string;
  paths: string[];
  confidence: number;
  evidence: string[];
  truthLabel: "verified" | "calculated" | "estimated" | "predicted" | "unknown";
}

type QueryTemplate = {
  patterns: RegExp[];
  relations: GraphRelationType[];
  answer: (paths: string[], stats: { nodes: number; edges: number }) => string;
};

const TEMPLATES: QueryTemplate[] = [
  {
    patterns: [/revenue|july|mtd|money/i, /caused|drove|from|why/i],
    relations: ["generated_revenue", "contributed_revenue", "created_booking", "caused_conversion"],
    answer: (paths, stats) =>
      paths.length > 0
        ? `Revenue trace: ${paths.slice(0, 5).join(" → ")}`
        : `Insufficient graph links (${stats.edges} edges). Run intelligence refresh to connect bookings → revenue.`,
  },
  {
    patterns: [/campaign|instagram|marketing/i, /booking|conversion|apv|revenue/i],
    relations: ["created_booking", "caused_conversion", "improved_ctr"],
    answer: (paths) =>
      paths.length > 0
        ? `Campaign influence path: ${paths.slice(0, 4).join(" → ")}`
        : "No campaign→booking edges yet. Log campaigns in Marketing Studio or connect Instagram API.",
  },
  {
    patterns: [/page|portfolio|homepage|book/i, /conversion|booking|portrait/i],
    relations: ["caused_conversion", "traffic_flow", "submitted_via", "discovered_via"],
    answer: (paths) =>
      paths.length > 0
        ? `Conversion path: ${paths.slice(0, 5).join(" → ")}`
        : "Page→conversion relationships not established. Analytics sync will create traffic_flow edges.",
  },
  {
    patterns: [/session|volume|application/i],
    relations: ["contains_applications", "related_funnel"],
    answer: (paths) =>
      paths.length > 0
        ? `Session funnel: ${paths.slice(0, 4).join(" → ")}`
        : "Link session volumes to applications via refresh or publish events.",
  },
];

function matchTemplate(question: string): QueryTemplate | null {
  for (const t of TEMPLATES) {
    const hits = t.patterns.filter((p) => p.test(question)).length;
    if (hits >= 2 || (t.patterns.length === 1 && hits === 1)) return t;
  }
  return TEMPLATES.find((t) => t.patterns.some((p) => p.test(question))) ?? null;
}

export async function queryBusinessGraph(question: string): Promise<GraphQueryResult> {
  const workspaceId = getWorkspaceId();
  const template = matchTemplate(question);

  const [nodeCount, edgeCount, relations] = await Promise.all([
    prisma.aIMemory.count({ where: { workspaceId, archived: false } }),
    prisma.aIMemoryRelation.count({ where: { workspaceId } }),
    prisma.aIMemoryRelation.findMany({
      where: { workspaceId },
      orderBy: { weight: "desc" },
      take: 80,
      include: {
        fromMemory: { select: { title: true, category: true } },
        toMemory: { select: { title: true, category: true } },
      },
    }),
  ]);

  const filtered = template
    ? relations.filter((r) => template.relations.includes(r.relationType as GraphRelationType))
    : relations;

  const paths = filtered.map(
    (r) => `${r.fromMemory.title} —[${r.relationType}]→ ${r.toMemory.title}`
  );

  const confidence =
    edgeCount >= 500 ? 0.85 : edgeCount >= 100 ? 0.65 : edgeCount >= 20 ? 0.45 : 0.25;

  const truthLabel =
    confidence >= 0.8 ? "verified" : confidence >= 0.6 ? "calculated" : confidence >= 0.4 ? "estimated" : "unknown";

  return {
    question,
    answer: template
      ? template.answer(paths, { nodes: nodeCount, edges: edgeCount })
      : paths.length > 0
        ? `Found ${paths.length} relationships. Top: ${paths[0]}`
        : `Graph has ${nodeCount} nodes and ${edgeCount} edges — too sparse for this query.`,
    paths,
    confidence,
    evidence: [`${nodeCount} knowledge nodes`, `${edgeCount} relationships`, ...paths.slice(0, 3)],
    truthLabel,
  };
}
