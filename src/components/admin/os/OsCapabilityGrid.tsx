"use client";

import Link from "next/link";
import type { MissingMetric } from "@/lib/ai/platform/metric-owners";
import { MissingMetricCard } from "@/components/admin/ai/OwnedMetricCard";
import { cn } from "@/lib/utils";

export interface OsCapability {
  id: string;
  label: string;
  status: "live" | "partial" | "planned";
  summary: string;
  href?: string;
  missing?: MissingMetric;
}

/** Honest capability map — live vs MissingMetric unlock paths. Never invent readiness. */
export function OsCapabilityGrid({
  title,
  subtitle,
  capabilities,
  className,
}: {
  title: string;
  subtitle?: string;
  capabilities: OsCapability[];
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div>
        <h2 className="font-display text-xl text-cream">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-fog">{subtitle}</p>}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {capabilities.map((cap) =>
          cap.missing ? (
            <MissingMetricCard key={cap.id} missing={cap.missing} />
          ) : (
            <article
              key={cap.id}
              className="rounded-xl border border-stone/20 bg-ink/40 p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">
                  {cap.label}
                </p>
                <span
                  className={cn(
                    "rounded-full border px-1.5 py-0.5 text-[0.5rem] uppercase",
                    cap.status === "live" && "border-emerald-400/30 text-emerald-300",
                    cap.status === "partial" && "border-amber-400/30 text-amber-200",
                    cap.status === "planned" && "border-stone/30 text-muted"
                  )}
                >
                  {cap.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-fog">{cap.summary}</p>
              {cap.href && (
                <Link
                  href={cap.href}
                  className="mt-3 inline-block text-[0.65rem] text-accent underline-offset-2 hover:underline"
                >
                  Open →
                </Link>
              )}
            </article>
          )
        )}
      </div>
    </section>
  );
}
