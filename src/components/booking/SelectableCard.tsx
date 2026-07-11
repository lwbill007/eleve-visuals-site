"use client";

import { cn } from "@/lib/utils";

export function SelectableCard({
  label,
  description,
  selected,
  onClick,
  className,
  large,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  className?: string;
  large?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex text-left transition-all duration-300",
        large
          ? "min-h-[7.5rem] flex-col justify-end border px-5 py-5"
          : "min-h-12 items-center border px-4 py-3 text-sm break-words",
        selected
          ? "border-accent/60 bg-accent/10 text-cream shadow-[0_0_0_1px_rgba(184,168,138,0.2)]"
          : "border-stone/40 bg-charcoal/30 text-fog hover:border-stone/70 hover:bg-charcoal/50",
        className
      )}
      style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
      aria-pressed={selected}
    >
      <span className={cn(large && "font-display text-xl text-cream")}>{label}</span>
      {description && (
        <span className="mt-2 text-xs leading-relaxed text-muted">{description}</span>
      )}
    </button>
  );
}

export function SelectableGrid({
  options,
  selected,
  onToggle,
  multi = false,
  columns = "sm:grid-cols-2 lg:grid-cols-3",
}: {
  options: string[];
  selected: string | string[];
  onToggle: (value: string) => void;
  multi?: boolean;
  columns?: string;
}) {
  const isSelected = (option: string) =>
    multi
      ? Array.isArray(selected) && selected.includes(option)
      : selected === option;

  return (
    <div className={cn("grid gap-3", columns)}>
      {options.map((option) => (
        <SelectableCard
          key={option}
          label={option}
          selected={isSelected(option)}
          onClick={() => onToggle(option)}
        />
      ))}
    </div>
  );
}

export function CategoryGrid({
  options,
  selected,
  onSelect,
}: {
  options: { id: string; label: string; description: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((opt) => (
        <SelectableCard
          key={opt.id}
          large
          label={opt.label}
          description={opt.description}
          selected={selected === opt.id}
          onClick={() => onSelect(opt.id)}
        />
      ))}
    </div>
  );
}
