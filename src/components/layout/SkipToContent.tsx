/** Skip link for keyboard / screen reader users — first focusable in document. */
export function SkipToContent({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-cream focus:px-4 focus:py-3 focus:text-sm focus:text-ink focus:outline-none"
    >
      Skip to content
    </a>
  );
}
