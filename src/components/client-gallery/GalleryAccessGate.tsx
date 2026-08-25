"use client";

import { useState } from "react";

/**
 * The access screen. Deliberately almost empty: a name, a line of type, and one
 * field. It is the first thing a client sees, and it should read as the cover of
 * something made for them rather than as a login form.
 */
export default function GalleryAccessGate({
  slug,
  title,
  clientName,
}: {
  slug: string;
  title: string;
  clientName: string;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !code.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/gallery/${encodeURIComponent(slug)}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (res.ok) {
        // Full reload rather than a router refresh: the session cookie was just
        // set, and the page is a server component that must re-run with it.
        window.location.reload();
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "That code doesn't match this gallery.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6 py-24">
      <div className="w-full max-w-sm text-center">
        <p className="font-body text-[0.6rem] uppercase tracking-[0.42em] text-accent">
          ÉLEVÉ
        </p>

        {clientName ? (
          <h1 className="mt-10 font-display text-3xl font-light tracking-[0.08em] text-cream sm:text-4xl">
            {clientName}
          </h1>
        ) : null}

        <p className="mt-4 font-body text-[0.62rem] uppercase tracking-[0.34em] text-muted">
          {title}
        </p>

        <form onSubmit={submit} className="mt-14">
          <label
            htmlFor="gallery-code"
            className="block font-body text-[0.6rem] uppercase tracking-[0.3em] text-fog"
          >
            Gallery code
          </label>
          <input
            id="gallery-code"
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="one-time-code"
            autoCapitalize="characters"
            spellCheck={false}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "gallery-code-error" : undefined}
            className="mt-5 w-full border-b border-stone bg-transparent pb-3 text-center font-display text-2xl tracking-[0.3em] text-cream outline-none transition-colors placeholder:text-stone focus-visible:border-accent"
            placeholder="XXXX-XXXX"
          />

          {/* aria-live so a screen reader announces the failure without a focus jump. */}
          <p
            id="gallery-code-error"
            role="status"
            aria-live="polite"
            className={`mt-4 min-h-[1.25rem] font-body text-xs tracking-wide ${
              error ? "text-accent" : "text-transparent"
            }`}
          >
            {error || "placeholder"}
          </p>

          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="mt-6 w-full border border-stone px-8 py-4 font-body text-[0.6rem] uppercase tracking-[0.36em] text-cream transition-colors duration-500 ease-[var(--ease-out-expo)] hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Opening" : "Enter"}
          </button>
        </form>

        <p className="mt-12 font-body text-[0.6rem] uppercase tracking-[0.28em] text-stone">
          The code was sent with your gallery link
        </p>
      </div>
    </main>
  );
}
