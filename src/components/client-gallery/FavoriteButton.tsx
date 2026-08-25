"use client";

/**
 * A favourite toggle that works on a phone.
 *
 * Always visible rather than hover-revealed: hover does not exist on touch, and
 * a control that only appears on hover is a control most clients never find.
 * It only fades *further* in on hover on pointer devices.
 */
export default function FavoriteButton({
  active,
  label,
  onToggle,
  size = "sm",
}: {
  active: boolean;
  label: string;
  onToggle: () => void;
  size?: "sm" | "lg";
}) {
  const dimension = size === "lg" ? "h-12 w-12" : "h-10 w-10";
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      aria-pressed={active}
      aria-label={active ? `Remove ${label} from favourites` : `Add ${label} to favourites`}
      className={`${dimension} grid place-items-center rounded-full backdrop-blur-sm transition-all duration-500 ease-[var(--ease-out-expo)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        active
          ? "bg-ink/70 text-accent opacity-100"
          : "bg-ink/40 text-cream/70 opacity-70 hover:bg-ink/70 hover:text-cream hover:opacity-100"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className={size === "lg" ? "h-6 w-6" : "h-5 w-5"}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.4}
      >
        <path d="M12 20.5 4.3 13a4.6 4.6 0 0 1 6.5-6.5l1.2 1.2 1.2-1.2A4.6 4.6 0 0 1 19.7 13Z" />
      </svg>
    </button>
  );
}
