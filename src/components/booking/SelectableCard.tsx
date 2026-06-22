"use client";

import { cn } from "@/lib/utils";

export function SelectableCard({
  label,
  selected,
  onClick,
  className,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border px-4 py-3.5 text-left text-sm transition-all duration-300",
        selected
          ? "border-accent/60 bg-accent/10 text-cream shadow-[0_0_0_1px_rgba(184,168,138,0.2)]"
          : "border-stone/40 bg-charcoal/30 text-fog hover:border-stone/70 hover:bg-charcoal/50",
        className
      )}
      style={{ transitionTimingFunction: "var(--ease-out-expo)" }}
      aria-pressed={selected}
    >
      {label}
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
