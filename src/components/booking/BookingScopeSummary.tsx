import {
  budgetRangeFromPackage,
  formatPackageRate,
  type BookingPackage,
} from "@/lib/booking-packages";

export function BookingScopeSummary({
  pkg,
  onChange,
  heading = "Your selected scope",
}: {
  pkg: BookingPackage;
  onChange?: () => void;
  heading?: string;
}) {
  return (
    <aside className="border border-accent/45 bg-gradient-to-br from-accent/10 to-charcoal/20 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.62rem] tracking-[0.15em] text-accent uppercase">{heading}</p>
          <h3 className="font-display mt-2 text-2xl text-cream">{pkg.name}</h3>
          <p className="font-display mt-2 text-3xl text-accent">{formatPackageRate(pkg)}</p>
          <p className="mt-1 text-xs text-fog">
            Qualification band: {budgetRangeFromPackage(pkg.id)}
          </p>
        </div>
        {onChange && (
          <button
            type="button"
            onClick={onChange}
            className="min-h-10 border border-stone/50 px-4 text-xs tracking-[0.12em] text-cream uppercase hover:border-accent hover:text-accent"
          >
            Change package
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-[0.62rem] tracking-[0.15em] text-muted uppercase">Included</p>
          <ul className="mt-3 space-y-2">
            {pkg.included.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed text-cream-dim">
                <span className="text-accent" aria-hidden>✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[0.62rem] tracking-[0.15em] text-muted uppercase">
            Quoted separately
          </p>
          <ul className="mt-3 space-y-2">
            {pkg.notIncluded.map((item) => (
              <li key={item} className="flex gap-2 text-sm leading-relaxed text-fog">
                <span aria-hidden>—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 border-t border-stone/30 pt-4 text-sm text-fog">
            <p>
              <span className="text-cream">Delivery:</span> {pkg.estimatedTimeline}
            </p>
            <p className="mt-2">
              Your inquiry does not create a charge. Any added cost appears in a written proposal
              before you approve or pay anything.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
