/** Shown only to a signed-in admin in preview mode; never to visitors. */
export function SeasonalPreviewBar({ mode, name }: { mode: "default" | "campaign"; name: string | null }) {
  return (
    <div
      role="status"
      className="fixed right-3 bottom-3 z-[70] flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-3 rounded-full border border-accent/60 bg-ink/95 px-4 py-2 text-xs text-cream shadow-lg backdrop-blur"
    >
      <span>
        Admin preview · {mode === "campaign" ? `${name ?? "Campaign"} (draft)` : "Default ÉLEVÉ"} · not public
      </span>
      <a href="/api/admin/seasonal/preview?exit=1&path=/admin/seasonal" className="text-accent underline underline-offset-4">
        End preview
      </a>
    </div>
  );
}
