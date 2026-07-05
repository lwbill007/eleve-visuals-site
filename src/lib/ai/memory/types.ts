export const DEFAULT_WORKSPACE_ID = "default";

/** Nine specialized memory layers — scalable to multi-workspace / multi-agent */
export type MemoryLayer =
  | "business"
  | "crm"
  | "brand"
  | "creative"
  | "marketing"
  | "financial"
  | "sessions"
  | "sponsor"
  | "operational";

export const MEMORY_LAYERS: {
  id: MemoryLayer;
  label: string;
  description: string;
}[] = [
  { id: "business", label: "Business", description: "Revenue, KPIs, forecasts, milestones, performance" },
  { id: "crm", label: "CRM", description: "Client relationships, LTV, engagement, follow-ups" },
  { id: "brand", label: "Brand", description: "Voice, values, visual identity, positioning" },
  { id: "creative", label: "Creative", description: "Projects, moodboards, successful creative patterns" },
  { id: "marketing", label: "Marketing", description: "Campaigns, channels, ROI, experiments" },
  { id: "financial", label: "Financial", description: "Cash flow, profitability, seasonal trends" },
  { id: "sessions", label: "ÉLEVÉ Sessions", description: "Volumes, applications, themes, growth" },
  { id: "sponsor", label: "Sponsor", description: "Partnerships, deliverables, renewal probability" },
  { id: "operational", label: "Operational", description: "Workflows, tasks, bottlenecks, productivity" },
];

export const LEGACY_CATEGORY_TO_LAYER: Record<string, MemoryLayer> = {
  client: "crm",
  page: "brand",
  session: "sessions",
};

export type MemorySource = "system" | "user" | "ai" | "import" | "sync";

export interface MemoryRecord {
  id: string;
  workspaceId: string;
  layer: MemoryLayer;
  category: string;
  key: string;
  title: string;
  summary: string;
  value: Record<string, unknown>;
  confidence: number;
  importance: number;
  source: MemorySource;
  sourceRef: string;
  verified: boolean;
  pinned: boolean;
  archived: boolean;
  tags: string[];
  updatedAt: string;
  createdAt: string;
}

export interface MemoryWriteInput {
  workspaceId?: string;
  layer: MemoryLayer;
  category: string;
  key: string;
  title?: string;
  summary?: string;
  value: Record<string, unknown>;
  confidence?: number;
  importance?: number;
  source?: MemorySource;
  sourceRef?: string;
  verified?: boolean;
  pinned?: boolean;
  archived?: boolean;
  tags?: string[];
  actor?: string;
  reason?: string;
}

export interface MemorySearchFilters {
  workspaceId?: string;
  layer?: MemoryLayer | MemoryLayer[];
  category?: string;
  query?: string;
  pinned?: boolean;
  archived?: boolean;
  verified?: boolean;
  source?: MemorySource;
  limit?: number;
  offset?: number;
}

export interface RetrievedMemory {
  memory: MemoryRecord;
  score: number;
  reasons: string[];
}

export interface MemoryCitation {
  memoryId: string;
  layer: MemoryLayer;
  title: string;
  summary: string;
  confidence: number;
  source: MemorySource;
}

export interface LearningOutcomeInput {
  workspaceId?: string;
  domain: string;
  actionType: string;
  actionRef?: string;
  hypothesis?: string;
  outcome: "positive" | "negative" | "neutral";
  metrics?: Record<string, unknown>;
  revenueImpact?: number;
  confidence?: number;
  memoryIds?: string[];
}

export interface GraphNode {
  id: string;
  label: string;
  layer: MemoryLayer;
  category: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  relationType: string;
  weight: number;
}

export interface MemoryGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
