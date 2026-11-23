import { formatVolPrice, volApplyRules, volTierSummary, type VolTier } from "@/lib/vol-tiers";

/**
 * ÉLEVÉ VOL. Portrait Experience prices with the approved rules beside them.
 * Shown to applicants while they apply. Optional choice; never a casting factor.
 */
export function VolPricesPanel({
  tiers,
  deadlineHours,
  value,
  onChange,
}: {
  tiers: readonly VolTier[];
  deadlineHours: number;
  /** Selected tier id, "" for no preference. Omit with onChange for a read-only panel. */
  value?: string;
  onChange?: (tierId: string) => void;
}) {
  const selectable = typeof onChange === "function";
  const rules = volApplyRules(deadlineHours);
  return (
    <fieldset className="space-y-5 border-t border-stone/30 pt-8">
      <legend className="text-xs tracking-[0.2em] text-fog uppercase">Portrait Experiences · prices</legend>

      <ul aria-label="How it works" className="space-y-2 border border-stone/40 p-4 text-sm leading-relaxed text-cream/85 md:p-5">
        {rules.map((rule) => (
          <li key={rule} className="flex gap-3">
            <span className="mt-2 h-1 w-1 shrink-0 bg-accent" aria-hidden />
            <span>{rule}</span>
          </li>
        ))}
      </ul>

      <p className="text-sm leading-relaxed text-fog">
        Optional. Choose one only if you&apos;d like portrait deliverables; you can change your mind after selection or stay
        on Free.{" "}
        <a href="/sessions/experience" target="_blank" rel="noopener" className="underline underline-offset-4 hover:text-cream">
          Full comparison and policies
        </a>
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {selectable && (
          <TierOption
            id=""
            title="No preference yet"
            price=""
            lines={["Decide after selection", "Collaborators: leave this selected"]}
            selected={(value || "") === ""}
            onSelect={() => onChange?.("")}
          />
        )}
        {tiers.map((tier) => (
          <TierOption
            key={tier.id}
            id={tier.id}
            title={tier.name}
            price={formatVolPrice(tier.price)}
            lines={volTierSummary(tier)}
            selected={selectable && value === tier.id}
            onSelect={selectable ? () => onChange?.(tier.id) : undefined}
          />
        ))}
      </div>
    </fieldset>
  );
}

function TierOption({
  id,
  title,
  price,
  lines,
  selected,
  onSelect,
}: {
  id: string;
  title: string;
  price: string;
  lines: readonly string[];
  selected: boolean;
  onSelect?: () => void;
}) {
  const body = (
    <span className="block w-full">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-cream">{title}</span>
        {price && <span className="font-medium text-accent">{price}</span>}
      </span>
      <span className="mt-1 block text-xs leading-relaxed text-muted">{lines.join(" · ")}</span>
    </span>
  );
  if (!onSelect) {
    return <div className="flex min-h-14 items-start border border-stone/40 px-4 py-3 text-sm">{body}</div>;
  }
  return (
    <label
      className={`flex min-h-14 cursor-pointer items-start gap-3 border px-4 py-3 text-sm transition-colors ${
        selected ? "border-cream/70" : "border-stone/40 hover:border-stone"
      }`}
    >
      <input
        type="radio"
        name="experiencePreference"
        value={id}
        checked={selected}
        onChange={onSelect}
        className="mt-1"
      />
      {body}
    </label>
  );
}
