"use client";

import {
  addOnsForPackage,
  formatPackagePrice,
  getPackageById,
  type BookingAddOn,
} from "@/lib/booking-packages";
import { cn } from "@/lib/utils";

export function AddonMarketplace({
  packageId,
  selectedIds,
  onChange,
}: {
  packageId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const pkg = getPackageById(packageId);
  const addons: BookingAddOn[] = pkg ? addOnsForPackage(pkg) : [];

  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    );
  };

  if (!pkg) {
    return (
      <p className="text-sm text-fog">Select an experience first to customize add-ons.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="label-caps text-accent">Customize Your Experience</p>
        <h2 className="font-display mt-2 text-3xl text-cream md:text-4xl">
          Elevate {pkg.name}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fog md:text-base">
          Optional enhancements. Every add-on exists to protect quality, timeline, or creative
          range—not to pad an invoice.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {addons.map((addon) => {
          const on = selectedIds.includes(addon.id);
          const recommended = pkg.recommendedAddOnIds.includes(addon.id);
          return (
            <button
              key={addon.id}
              type="button"
              onClick={() => toggle(addon.id)}
              aria-pressed={on}
              className={cn(
                "relative border p-4 text-left transition-colors md:p-5",
                on
                  ? "border-accent/60 bg-accent/10"
                  : "border-stone/35 bg-charcoal/20 hover:border-stone/60"
              )}
            >
              {recommended && (
                <span className="label-caps absolute top-3 right-3 text-[0.55rem] text-accent">
                  Recommended
                </span>
              )}
              <div className="flex items-start justify-between gap-3 pr-16">
                <p className="font-display text-lg text-cream">{addon.name}</p>
                <p className="shrink-0 text-sm text-accent">
                  +{formatPackagePrice(addon.startingPrice)}
                </p>
              </div>
              <p className="mt-2 text-sm text-fog">{addon.description}</p>
              <p className="mt-3 text-xs leading-relaxed text-cream-dim">
                <span className="text-muted">Why it matters — </span>
                {addon.whyItMatters}
              </p>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-muted">
        You can continue without add-ons. We&apos;ll refine recommendations during consultation.
      </p>
    </div>
  );
}
