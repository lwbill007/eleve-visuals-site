"use client";

import { useMemo, useState } from "react";
import type { SessionVolumeDTO, SessionVolumeStatus } from "@/lib/types";
import { SESSION_VOLUME_STATUSES } from "@/lib/types";
import { getSessionStatusLabel } from "@/lib/session-volume";
import { SessionPosterCard } from "./SessionPosterCard";

export function SessionsVolumeGrid({
  volumes,
  showArchive = false,
}: {
  volumes: SessionVolumeDTO[];
  showArchive?: boolean;
}) {
  const [statusFilter, setStatusFilter] = useState<SessionVolumeStatus | "all">("all");
  const [yearFilter, setYearFilter] = useState<string>("all");

  const years = useMemo(
    () => [...new Set(volumes.map((v) => v.year).filter(Boolean))].sort().reverse(),
    [volumes]
  );

  const activeVolumes = volumes.filter((v) => (showArchive ? v.status === "archived" : v.status !== "archived"));

  const filtered = activeVolumes.filter((v) => {
    if (statusFilter !== "all" && v.status !== statusFilter) return false;
    if (yearFilter !== "all" && v.year !== yearFilter) return false;
    return true;
  });

  const featuredId = volumes.find((v) => v.featured)?.id;

  const gridVolumes = filtered.filter((v) => v.id !== featuredId || showArchive);

  return (
    <section className={showArchive ? "section-padding bg-ink-soft" : "section-padding"}>
      <div className="container-wide">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="label-caps mb-2 text-accent">
              {showArchive ? "Archive" : "The Collection"}
            </p>
            <h2 className="headline-md">
              {showArchive ? "Past Volumes" : "All Volumes"}
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SessionVolumeStatus | "all")}
              className="border border-stone/50 bg-charcoal px-3 py-2 text-xs text-cream"
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
              className="border border-stone/50 bg-charcoal px-3 py-2 text-xs text-cream"
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

        {gridVolumes.length === 0 ? (
          <div className="py-20 text-center">
            <p className="font-display text-2xl text-cream">
              {volumes.length === 0
                ? "The collection is being curated."
                : showArchive
                  ? "No archived volumes yet."
                  : "No volumes match your filters."}
            </p>
            <p className="mt-3 text-sm text-fog">Check back as new productions are announced.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {gridVolumes.map((volume) => (
              <SessionPosterCard key={volume.id} volume={volume} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
