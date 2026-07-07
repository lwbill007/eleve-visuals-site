/**
 * Principle #2 — Knowledge Graph ontology
 * Typed entities and relationships for queryable business intelligence.
 */

export const GRAPH_ENTITY_TYPES = [
  "client",
  "project",
  "page",
  "campaign",
  "booking",
  "service",
  "portfolio_item",
  "application",
  "sponsor",
  "invoice",
  "payment",
  "session",
  "volume",
  "cast_member",
  "equipment",
  "location",
  "email",
  "analytics_event",
  "crm_contact",
  "testimonial",
  "contract",
  "task",
  "goal",
  "experiment",
  "prediction",
  "recommendation",
  "lesson",
  "instagram_post",
  "reel",
] as const;

export type GraphEntityType = (typeof GRAPH_ENTITY_TYPES)[number];

/** Canonical relation types — stored in AIMemoryRelation.relationType */
export const GRAPH_RELATION_TYPES = {
  booked: "client booked project",
  generated_revenue: "project generated revenue",
  created_booking: "campaign created booking",
  caused_conversion: "page caused conversion",
  improved_ctr: "experiment improved ctr",
  contains_applications: "session contains applications",
  submitted_via: "inquiry submitted via page",
  discovered_via: "lead discovered via portfolio",
  viewed_work: "contact viewed portfolio",
  contributed_revenue: "contact contributed revenue",
  prospect_for: "contact prospect for service",
  traffic_flow: "page traffic flows to page",
  related_funnel: "funnel step related",
  sponsored_by: "volume sponsored by sponsor",
  delivered_gallery: "project delivered gallery",
  referred_client: "client referred client",
  learned_from: "lesson learned from event",
  recommended_action: "recommendation targets entity",
  predicted_outcome: "prediction forecasts metric",
} as const;

export type GraphRelationType = keyof typeof GRAPH_RELATION_TYPES;

export function inferEntityType(layer: string, category: string, key: string): GraphEntityType {
  if (category === "lead" || layer === "crm") return "client";
  if (category === "project" || layer === "creative") return "portfolio_item";
  if (category === "volume" || layer === "sessions") return "volume";
  if (category === "application") return "application";
  if (category === "page_intel" || key.startsWith("page:")) return "page";
  if (category === "campaign_case_study") return "campaign";
  if (category === "experiment") return "experiment";
  if (category === "learning" || category === "mission_outcome") return "lesson";
  if (category === "revenue" || layer === "financial") return "payment";
  return "task";
}

export function isValidRelationType(type: string): type is GraphRelationType {
  return type in GRAPH_RELATION_TYPES;
}
