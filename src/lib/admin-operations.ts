import type { ProductionStatus } from "@/lib/booking-pipeline";

export interface AdminBookingSummary {
  id: string;
  name: string;
  email: string;
  service: string;
  value: number;
  valueQuality?: "estimated" | "verified";
  createdAt: string;
  updatedAt?: string;
  ageDays?: number;
  leadScore?: number;
  priority?: string;
}

export interface AdminPipelineColumn {
  id: ProductionStatus;
  label: string;
  items: AdminBookingSummary[];
}

export function bookingDetailHref(id: string): string {
  return `/admin/bookings/${encodeURIComponent(id)}`;
}

export function emailComposerHref(input: {
  email: string;
  name?: string;
  templateId?: string;
  source?: "booking" | "crm";
}): string {
  const params = new URLSearchParams();
  params.set("to", input.email);
  if (input.name) params.set("name", input.name);
  if (input.templateId) params.set("template", input.templateId);
  if (input.source) params.set("source", input.source);
  return `/admin/email?${params.toString()}`;
}

export function staleFirst<T extends { ageDays?: number; updatedAt?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ageDelta = (b.ageDays ?? 0) - (a.ageDays ?? 0);
    if (ageDelta !== 0) return ageDelta;
    return new Date(a.updatedAt ?? 0).getTime() - new Date(b.updatedAt ?? 0).getTime();
  });
}

export type OpportunityStatus = "pending" | "accepted" | "completed" | "rejected";

const OPPORTUNITY_TRANSITIONS: Record<OpportunityStatus, readonly OpportunityStatus[]> = {
  pending: ["accepted", "rejected"],
  accepted: ["completed", "rejected"],
  completed: [],
  rejected: [],
};

export function canTransitionOpportunity(
  current: OpportunityStatus,
  next: Exclude<OpportunityStatus, "pending">
): boolean {
  return OPPORTUNITY_TRANSITIONS[current].includes(next);
}
