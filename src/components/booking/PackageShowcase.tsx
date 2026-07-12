"use client";

import { useEffect, useState } from "react";
import {
  BOOKING_ADDONS,
  BOOKING_PACKAGES,
  PACKAGE_FAMILY_LABELS,
  formatPackagePrice,
  type BookingPackage,
  type PackageFamily,
} from "@/lib/booking-packages";
import { cn } from "@/lib/utils";

const FAMILIES: PackageFamily[] = ["portrait", "motion", "hybrid", "partnership"];

function PreviewFrame({
  pkg,
  selected,
}: {
  pkg: BookingPackage;
  selected: boolean;
}) {
  const isMotion = pkg.family === "motion" || Boolean(pkg.videoPreviewHint);
  const isPartner = pkg.family === "partnership";

  return (
    <div
      className={cn(
        "relative aspect-[16/10] overflow-hidden border-b",
        selected ? "border-accent/40" : "border-stone/30"
      )}
    >
      <div
        className={cn(
          "absolute inset-0",
          isPartner
            ? "bg-[radial-gradient(ellipse_at_center,rgba(184,168,138,0.22)_0%,transparent_65%),linear-gradient(145deg,#1a1a1a,#0a0a0a)]"
            : isMotion
              ? "bg-[linear-gradient(135deg,#111_0%,#1a1a1a_40%,#0a0a0a_100%)]"
              : "bg-[linear-gradient(160deg,#1a1a1a_0%,#111_50%,#0a0a0a_100%)]"
        )}
      />
      <div className="grain absolute inset-0 opacity-40" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(184,168,138,0.12)_0%,transparent_50%)]" />

      {isMotion && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center border border-accent/40 bg-ink/40 text-accent backdrop-blur-sm">
            ▶
          </span>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-4 pt-10">
        <p className="text-[0.6rem] tracking-[0.14em] text-accent uppercase">
          {isMotion ? "Video preview" : isPartner ? "Partnership" : "Gallery preview"}
        </p>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-cream-dim">
          {pkg.videoPreviewHint || pkg.galleryPreviewHint}
        </p>
      </div>
    </div>
  );
}

export function PackageShowcase({
  selectedId,
  onSelect,
  error,
}: {
  selectedId: string;
  onSelect: (pkg: BookingPackage) => void;
  error?: string;
}) {
  const selectedPkg = BOOKING_PACKAGES.find((p) => p.id === selectedId);
  const [family, setFamily] = useState<PackageFamily>(selectedPkg?.family ?? "portrait");
  const [expandedId, setExpandedId] = useState<string | null>(selectedId || null);
  const packages = BOOKING_PACKAGES.filter((p) => p.family === family);

  useEffect(() => {
    if (selectedPkg) {
      setFamily(selectedPkg.family);
      setExpandedId(selectedPkg.id);
    }
  }, [selectedPkg]);

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
        <div className="border border-accent/30 bg-gradient-to-r from-accent/10 to-transparent px-5 py-4">
          <p className="font-display text-xl text-cream">Creative access—not hourly bookings.</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fog">
            Reserve and Legacy sell dedicated creative capacity. You invest in ongoing production
            whenever your business needs it—strategy, planning, photography, and motion included.
          </p>
        </div>
      )}

      <div
        className={cn(
          "grid gap-5",
          family === "partnership" ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"
        )}
      >
        {packages.map((pkg) => {
          const selected = selectedId === pkg.id;
          const expanded = expandedId === pkg.id || selected;
          const recAddons = BOOKING_ADDONS.filter((a) => pkg.recommendedAddOnIds.includes(a.id));

          return (
            <article
              key={pkg.id}
              className={cn(
                "group relative flex flex-col overflow-hidden border bg-charcoal/25 transition-all duration-500",
                selected
                  ? "border-accent/70 shadow-[0_0_0_1px_rgba(184,168,138,0.25)]"
                  : "border-stone/35 hover:border-stone/60",
                family === "partnership" && "md:min-h-[28rem]"
              )}
              style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
            >
              {pkg.popular && (
                <span className="absolute top-3 left-3 z-10 label-caps bg-ink/80 px-2 py-1 text-[0.6rem] text-accent backdrop-blur-sm">
                  Most chosen
                </span>
              )}

              <PreviewFrame pkg={pkg} selected={selected} />

              <button
                type="button"
                onClick={() => {
                  onSelect(pkg);
                  setExpandedId(pkg.id);
                }}
                className="flex flex-1 flex-col p-5 text-left md:p-6"
                aria-pressed={selected}
              >
                <p className="font-display text-2xl text-cream">{pkg.name}</p>
                {pkg.headline && (
                  <p className="mt-1 text-sm text-accent">{pkg.headline}</p>
                )}
                <p className="mt-3 font-display text-2xl text-accent">
                  From {formatPackagePrice(pkg.startingPrice)}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-fog">{pkg.description}</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-[0.6rem] tracking-[0.12em] text-muted uppercase">Perfect for</p>
                    <ul className="mt-1.5 space-y-1">
                      {pkg.perfectFor.map((item) => (
                        <li key={item} className="text-sm text-cream-dim">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[0.6rem] tracking-[0.12em] text-muted uppercase">Timeline</p>
                    <p className="mt-1.5 text-sm text-cream-dim">{pkg.estimatedTimeline}</p>
                    <p className="mt-3 text-[0.6rem] tracking-[0.12em] text-muted uppercase">
                      Example deliverables
                    </p>
                    <p className="mt-1.5 text-sm text-cream-dim">
                      {pkg.exampleDeliverables.join(" · ")}
                    </p>
                  </div>
                </div>
              </button>

              <div className="border-t border-stone/30 px-5 py-3 md:px-6">
                <button
                  type="button"
                  className="text-xs tracking-[0.1em] text-accent uppercase hover:text-cream"
                  onClick={() => setExpandedId(expanded && !selected ? null : pkg.id)}
                  aria-expanded={expanded}
                >
                  {expanded ? "Hide full experience" : "Experience · Included · FAQ · Expectations"}
                </button>

                {expanded && (
                  <div className="mt-4 space-y-5 text-sm text-cream-dim">
                    <div>
                      <p className="label-caps text-muted">Experience</p>
                      <p className="mt-1 leading-relaxed">{pkg.experience}</p>
                    </div>
                    <div>
                      <p className="label-caps text-muted">Included</p>
                      <ul className="mt-2 space-y-1.5">
                        {pkg.included.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {recAddons.length > 0 && (
                      <div>
                        <p className="label-caps text-muted">Recommended add-ons</p>
                        <ul className="mt-2 space-y-2">
                          {recAddons.map((a) => (
                            <li key={a.id}>
                              <span className="text-cream">{a.name}</span>
                              <span className="text-fog"> — {a.whyItMatters}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <p className="label-caps text-muted">Client expectations</p>
                      <ul className="mt-2 space-y-1">
                        {pkg.clientExpectations.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    {pkg.faq.map((f) => (
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
