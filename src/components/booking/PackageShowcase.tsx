"use client";

import { useEffect, useState } from "react";
import {
  BOOKING_PACKAGES,
  PACKAGE_FAMILY_LABELS,
  formatPackageRate,
  type BookingPackage,
  type PackageFamily,
} from "@/lib/booking-packages";
import { cn } from "@/lib/utils";

const FAMILIES: PackageFamily[] = ["portrait", "motion", "partnership"];

const FAMILY_PROMPTS: Record<PackageFamily, string> = {
  portrait: "Portraits, personal brands, editorials, and campaign stills.",
  motion: "Reels, launch content, promotional films, and brand stories.",
  partnership: "A repeatable monthly mix of photography and motion.",
};

export function PackageShowcase({
  selectedId,
  onSelect,
  error,
}: {
  selectedId: string;
  onSelect: (pkg: BookingPackage) => void;
  error?: string;
}) {
  const selectedPkg = BOOKING_PACKAGES.find((pkg) => pkg.id === selectedId);
  const [family, setFamily] = useState<PackageFamily>(selectedPkg?.family ?? "portrait");
  const [detailsId, setDetailsId] = useState<string | null>(selectedId || null);
  const packages = BOOKING_PACKAGES.filter((pkg) => pkg.family === family);

  useEffect(() => {
    if (!selectedPkg) return;
    setFamily(selectedPkg.family);
    setDetailsId(selectedPkg.id);
  }, [selectedPkg]);

  return (
    <div className="space-y-7">
      <div>
        <p className="label-caps text-accent">Step 1 · Choose a clear scope</p>
        <h2 className="font-display mt-2 text-3xl text-cream md:text-4xl">
          What does your budget include?
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fog md:text-base">
          Pick the kind of work first, then compare three defined starting scopes. The package you
          choose sets your budget automatically—there is no second, conflicting budget question.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Choose a service">
        {FAMILIES.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={family === item}
            onClick={() => setFamily(item)}
            className={cn(
              "min-h-20 border px-4 py-3 text-left transition-colors",
              family === item
                ? "border-accent/70 bg-accent/10 text-cream"
                : "border-stone/40 text-fog hover:border-stone/70 hover:text-cream"
            )}
          >
            <span className="block text-xs tracking-[0.13em] uppercase">
              {PACKAGE_FAMILY_LABELS[item]}
            </span>
            <span className="mt-1.5 block text-xs leading-relaxed text-fog">
              {FAMILY_PROMPTS[item]}
            </span>
          </button>
        ))}
      </div>

      {family === "partnership" && (
        <div className="border-l-2 border-accent bg-accent/5 px-5 py-4">
          <p className="text-sm leading-relaxed text-cream-dim">
            Monthly partnerships reserve one production window per month for an initial three-month
            term. Unused time and deliverables do not roll over.
          </p>
        </div>
      )}

      <div className="grid gap-px border border-stone/30 bg-stone/30 sm:grid-cols-3">
        {[
          ["Entry", "Focused scope and the lowest starting budget."],
          ["Signature", "More direction and a broader usable asset set."],
          ["Premium", "Pre-production and a materially deeper production."],
        ].map(([label, description]) => (
          <div key={label} className="bg-ink px-4 py-3">
            <p className="text-xs tracking-[0.12em] text-cream uppercase">{label}</p>
            <p className="mt-1 text-xs leading-relaxed text-fog">{description}</p>
          </div>
        ))}
      </div>

      <div
        id="packageId"
        className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3"
        role="radiogroup"
        aria-label="Packages"
      >
        {packages.map((pkg) => {
          const selected = selectedId === pkg.id;
          const detailsOpen = detailsId === pkg.id;

          return (
            <article
              key={pkg.id}
              className={cn(
                "relative overflow-hidden border bg-charcoal/20",
                selected
                  ? "border-accent shadow-[0_0_0_1px_rgba(184,168,138,0.2)]"
                  : "border-stone/35"
              )}
            >
              {pkg.level === "signature" && (
                <div className="border-b border-accent/25 bg-accent/10 px-5 py-2 text-[0.62rem] tracking-[0.15em] text-accent uppercase">
                  More direction and deliverables
                </div>
              )}

              <div className="p-5 md:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.62rem] tracking-[0.16em] text-muted uppercase">
                      {pkg.level}
                    </p>
                    <h3 className="font-display mt-2 text-2xl text-cream">{pkg.name}</h3>
                  </div>
                  {selected && (
                    <span className="border border-accent/50 px-2 py-1 text-[0.6rem] tracking-[0.12em] text-accent uppercase">
                      Selected
                    </span>
                  )}
                </div>

                <p className="font-display mt-4 text-3xl text-accent">
                  {formatPackageRate(pkg)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Starting scope · additions require written approval
                </p>
                <p className="mt-4 text-sm leading-relaxed text-fog">{pkg.description}</p>

                <div className="mt-6">
                  <p className="text-[0.62rem] tracking-[0.15em] text-muted uppercase">
                    What you receive
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {pkg.included.map((item) => (
                      <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-cream-dim">
                        <span className="text-accent" aria-hidden>✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 border border-stone/30 bg-ink/40 p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[0.6rem] tracking-[0.12em] text-muted uppercase">Delivery</p>
                      <p className="mt-1 text-cream-dim">{pkg.estimatedTimeline}</p>
                    </div>
                    <div>
                      <p className="text-[0.6rem] tracking-[0.12em] text-muted uppercase">Best for</p>
                      <p className="mt-1 text-cream-dim">{pkg.perfectFor.slice(0, 2).join(" · ")}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-[0.62rem] tracking-[0.15em] text-muted uppercase">
                    Quoted separately
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {pkg.notIncluded.map((item) => (
                      <li key={item} className="flex gap-2 text-xs leading-relaxed text-fog">
                        <span aria-hidden>—</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onSelect(pkg)}
                  className={cn(
                    "mt-6 min-h-12 w-full border px-5 text-xs tracking-[0.14em] uppercase transition-colors",
                    selected
                      ? "border-accent bg-accent text-ink"
                      : "border-cream/50 text-cream hover:bg-cream hover:text-ink"
                  )}
                >
                  {selected ? `${pkg.name} selected` : `Choose ${pkg.name}`}
                </button>

                <button
                  type="button"
                  onClick={() => setDetailsId(detailsOpen ? null : pkg.id)}
                  aria-expanded={detailsOpen}
                  className="mt-4 min-h-10 w-full text-xs tracking-[0.1em] text-accent uppercase hover:text-cream"
                >
                  {detailsOpen ? "Hide planning details" : "Planning details and FAQ"}
                </button>

                {detailsOpen && (
                  <div className="mt-4 space-y-5 border-t border-stone/30 pt-5 text-sm leading-relaxed text-fog">
                    <div>
                      <p className="text-cream">How the experience works</p>
                      <p className="mt-1">{pkg.experience}</p>
                    </div>
                    <div>
                      <p className="text-cream">What we need from you</p>
                      <ul className="mt-2 space-y-1.5">
                        {pkg.clientExpectations.map((item) => (
                          <li key={item}>— {item}</li>
                        ))}
                      </ul>
                    </div>
                    {pkg.faq.map((item) => (
                      <div key={item.q}>
                        <p className="text-cream">{item.q}</p>
                        <p className="mt-1">{item.a}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
    </div>
  );
}
