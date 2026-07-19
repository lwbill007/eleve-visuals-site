"use client";

import Link from "next/link";
import type { MissingMetric, OwnedMetric } from "@/lib/ai/platform/metric-owners";
import { TruthMetricCard } from "@/components/admin/ai/TruthMetricCard";
import { cn } from "@/lib/utils";

export function MissingMetricCard({
  missing,
  className,
}: {
  missing: MissingMetric;
  className?: string;
}) {
  const required = missing?.required ?? [];
  return (
    <div
      className={cn(
        "rounded-xl border border-red-400/25 bg-red-400/[0.04] p-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.65rem] tracking-[0.16em] text-muted uppercase">
          {missing?.label ?? "Unknown metric"}
        </p>
        <span className="rounded-full border border-red-400/30 bg-red-400/10 px-1.5 py-0.5 text-[0.5rem] text-red-300 uppercase">
          Unknown
        </span>
      </div>
      <p className="mt-2 font-display text-2xl text-cream">—</p>
      <p className="mt-2 text-xs leading-relaxed text-fog">
        {missing?.reason ?? "More data required."}
      </p>
      <p className="mt-3 text-[0.55rem] tracking-[0.12em] text-muted uppercase">
        Required
      </p>
      <ul className="mt-1 space-y-0.5">
        {required.map((item) => (
          <li key={item} className="text-[0.7rem] text-fog">
            • {item}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[0.7rem] text-amber-200">
        Confidence 0% · {missing?.unlockAfter ?? "Unlock criteria pending"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2 text-[0.65rem]">
        {missing?.owner && (
          <Link
            href={missing.owner.href}
            className="text-accent underline-offset-2 hover:underline"
          >
            Owner · {missing.owner.label}
          </Link>
        )}
        {missing?.unlockHref && (
          <Link
            href={missing.unlockHref}
            className="text-muted underline-offset-2 hover:underline"
          >
            Executive QA
          </Link>
        )}
      </div>
    </div>
  );
}

export function OwnedMetricCard({
  owned,
  currency = false,
}: {
  owned: OwnedMetric;
  currency?: boolean;
}) {
  if (owned.missing || !owned.metric) {
    if (!owned.missing) {
      return (
        <MissingMetricCard
          missing={{
            label: owned.label,
            reason: "Metric value unavailable.",
            required: ["Owned data source"],
            confidence: 0,
            unlockAfter: "Unlock after the metric owner returns a value.",
            owner: owned.owner,
            unlockHref: "/admin/qa",
          }}
        />
      );
    }
    return <MissingMetricCard missing={owned.missing} />;
  }
  return (
    <TruthMetricCard
      metric={owned.metric}
      currency={currency}
      href={owned.owner.href}
      hint={`Owned by ${owned.owner.label}`}
    />
  );
}
