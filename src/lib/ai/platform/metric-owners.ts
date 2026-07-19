/**
 * One metric = one owner. Client-safe registry + types only.
 * Server KPI resolution lives in resolve-command-kpis.ts (Prisma).
 */

import type { TruthValue } from "./truth-metadata";

export type MetricOwnerId =
  | "financial_center"
  | "bookings"
  | "analytics"
  | "pipeline"
  | "ai_operations"
  | "clients"
  | "applications"
  | "settings";

export interface MetricOwner {
  id: MetricOwnerId;
  label: string;
  href: string;
}

export const METRIC_OWNERS: Record<MetricOwnerId, MetricOwner> = {
  financial_center: {
    id: "financial_center",
    label: "Financial Center",
    href: "/admin/financial",
  },
  bookings: {
    id: "bookings",
    label: "Bookings",
    href: "/admin/submissions?type=booking",
  },
  analytics: {
    id: "analytics",
    label: "Analytics",
    href: "/admin/analytics",
  },
  pipeline: {
    id: "pipeline",
    label: "Pipeline",
    href: "/admin/pipeline",
  },
  ai_operations: {
    id: "ai_operations",
    label: "AI Operations",
    href: "/admin/ai-operations",
  },
  clients: {
    id: "clients",
    label: "Clients",
    href: "/admin/crm",
  },
  applications: {
    id: "applications",
    label: "Applications",
    href: "/admin/applications",
  },
  settings: {
    id: "settings",
    label: "Settings",
    href: "/admin/settings",
  },
};

export interface MissingMetric {
  label: string;
  reason: string;
  required: string[];
  confidence: 0;
  unlockAfter: string;
  owner: MetricOwner;
  unlockHref?: string;
}

export interface OwnedMetric {
  key: string;
  label: string;
  owner: MetricOwner;
  /** Present when the owner can produce a value. */
  metric: TruthValue<number> | null;
  missing: MissingMetric | null;
}
