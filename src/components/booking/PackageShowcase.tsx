"use client";

import { useState } from "react";
import {
  BOOKING_PACKAGES,
  PACKAGE_FAMILY_LABELS,
  formatPackagePrice,
  type BookingPackage,
  type PackageFamily,
} from "@/lib/booking-packages";
import { cn } from "@/lib/utils";

const FAMILIES: PackageFamily[] = ["portrait", "motion", "hybrid", "partnership"];

export function PackageShowcase({
  selectedId,
  onSelect,
  error,
}: {
  selectedId: string;
  onSelect: (pkg: BookingPackage) => void;
  error?: string;
}) {
  const [family, setFamily] = useState<PackageFamily>("portrait");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const packages = BOOKING_PACKAGES.filter((p) => p.family === family);

  return (
    <div className="space-y-8">
      <div>
        <p className="label-caps text-accent">Choose Your Experience</p>
        <h2 className="font-display mt-2 text-3xl text-cream md:text-4xl">
          How should we create together?
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fog md:text-base">
          Every experience is designed as a creative partnership—not a commodity session.
          Starting prices guide the conversation; your proposal is tailored after consultation.
        </p>
      </div>

      <div
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Experience families"
      >
        {FAMILIES.map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={family === f}
            onClick={() => setFamily(f)}
            className={cn(
              "shrink-0 border px-4 py-2.5 text-xs tracking-[0.14em] uppercase transition-colors",
              family === f
                ? "border-accent/60 bg-accent/10 text-accent"
                : "border-stone/40 text-fog hover:border-stone/70 hover:text-cream"
            )}
          >
            {PACKAGE_FAMILY_LABELS[f]}
          </button>
        ))}
      </div>

      {family === "partnership" && (
        <p className="border border-accent/25 bg-accent/5 px-4 py-3 text-sm text-cream-dim">
          Creative Partnerships sell access—not hours on a calendar. Ideal when you want ÉLEVÉ as
          your private creative department.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {packages.map((pkg) => {
          const selected = selectedId === pkg.id;
          const expanded = expandedId === pkg.id;
          return (
            <article
              key={pkg.id}
              className={cn(
                "group relative flex flex-col border bg-charcoal/30 transition-colors",
                selected
                  ? "border-accent/70 bg-accent/5"
                  : "border-stone/35 hover:border-stone/60"
              )}
            >
              {pkg.popular && (
                <span className="absolute top-3 right-3 label-caps bg-accent/15 px-2 py-1 text-[0.6rem] text-accent">
                  Most chosen
                </span>
              )}
              <button
                type="button"
                onClick={() => onSelect(pkg)}
                className="flex flex-1 flex-col p-5 text-left md:p-6"
                aria-pressed={selected}
              >
                <p className="font-display text-xl text-cream md:text-2xl">{pkg.name}</p>
                {pkg.headline && (
                  <p className="mt-1 text-sm text-accent">{pkg.headline}</p>
                )}
                <p className="mt-3 font-display text-2xl text-accent">
                  From {formatPackagePrice(pkg.startingPrice)}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-fog">{pkg.description}</p>
                <p className="mt-4 text-[0.65rem] tracking-[0.12em] text-muted uppercase">
                  Perfect for
                </p>
                <p className="mt-1 text-sm text-cream-dim">{pkg.perfectFor.slice(0, 4).join(" · ")}</p>
                <p className="mt-4 text-[0.65rem] tracking-[0.12em] text-muted uppercase">
                  Timeline
                </p>
                <p className="mt-1 text-sm text-cream-dim">{pkg.estimatedTimeline}</p>
              </button>

              <div className="border-t border-stone/30 px-5 py-3 md:px-6">
                <button
                  type="button"
                  className="text-xs tracking-[0.1em] text-accent uppercase hover:text-cream"
                  onClick={() => setExpandedId(expanded ? null : pkg.id)}
                  aria-expanded={expanded}
                >
                  {expanded ? "Hide details" : "Experience · Included · FAQ"}
                </button>
                {expanded && (
                  <div className="mt-4 space-y-4 text-sm text-cream-dim">
                    <div>
                      <p className="label-caps text-muted">Experience</p>
                      <p className="mt-1 leading-relaxed">{pkg.experience}</p>
                    </div>
                    <div>
                      <p className="label-caps text-muted">Included</p>
                      <ul className="mt-2 space-y-1">
                        {pkg.included.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="label-caps text-muted">Example deliverables</p>
                      <p className="mt-1">{pkg.exampleDeliverables.join(" · ")}</p>
                    </div>
                    <div>
                      <p className="label-caps text-muted">Gallery preview</p>
                      <p className="mt-1 italic text-fog">{pkg.galleryPreviewHint}</p>
                      {pkg.videoPreviewHint && (
                        <p className="mt-1 italic text-fog">{pkg.videoPreviewHint}</p>
                      )}
                    </div>
                    <div>
                      <p className="label-caps text-muted">Client expectations</p>
                      <ul className="mt-2 space-y-1">
                        {pkg.clientExpectations.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    {pkg.faq.slice(0, 2).map((f) => (
                      <div key={f.q}>
                        <p className="text-cream">{f.q}</p>
                        <p className="mt-1 text-fog">{f.a}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
