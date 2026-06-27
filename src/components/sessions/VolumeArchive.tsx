"use client";

import { useMemo, useState } from "react";
import type { SessionVolumeDTO, SessionVolumeStatus } from "@/lib/types";
import { SESSION_VOLUME_STATUSES } from "@/lib/types";
import { getSessionStatusLabel } from "@/lib/session-volume";
import { VolumeArchiveCard } from "./VolumeArchiveCard";

export function VolumeArchive({
  volumes,
  excludeId,
}: {
  volumes: SessionVolumeDTO[];
  excludeId?: string;
}) {
  const [statusFilter, setStatusFilter] = useState<SessionVolumeStatus | "all">("all");
  const [yearFilter, setYearFilter] = useState<string>("all");

  const pool = useMemo(
    () => volumes.filter((v) => v.id !== excludeId),
    [volumes, excludeId]
  );

  const years = useMemo(
    () => [...new Set(pool.map((v) => v.year).filter(Boolean))].sort().reverse(),
    [pool]
  );

  const filtered = pool.filter((v) => {
    if (statusFilter !== "all" && v.status !== statusFilter) return false;
    if (yearFilter !== "all" && v.year !== yearFilter) return false;
    return true;
  });

  return (
    <section className="section-padding">
      <div className="container-wide">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="label-caps mb-2 text-accent">The Collection</p>
            <h2 className="headline-md">All volumes</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SessionVolumeStatus | "all")}
              className="min-h-11 border border-stone/50 bg-charcoal px-3 py-2.5 text-xs text-cream"
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              {SESSION_VOLUME_STATUSES.filter((s) => s !== "draft").map((status) => (
                <option key={status} value={status}>
                  {getSessionStatusLabel(status)}
                </option>
              ))}
            </select>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="min-h-11 border border-stone/50 bg-charcoal px-3 py-2.5 text-xs text-cream"
              aria-label="Filter by year"
            >
              <option value="all">All years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-display text-2xl text-cream">
              {pool.length === 0
                ? "The collection is being curated."
                : "No volumes match your filters."}
            </p>
            <p className="mt-3 text-sm text-fog">Check back as new productions are announced.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
            {filtered.map((volume) => (
              <VolumeArchiveCard key={volume.id} volume={volume} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
