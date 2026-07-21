"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[public-site-error]", error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center bg-ink px-5 py-32">
      <div className="mx-auto max-w-xl text-center">
        <p className="label-caps text-accent">ÉLEVÉ Visuals</p>
        <h1 className="headline-lg mt-4">This page missed its mark.</h1>
        <p className="mt-5 text-fog">
          The site is temporarily unavailable. Your information has not been submitted.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="min-h-12 bg-cream px-7 text-xs tracking-[0.15em] text-ink uppercase"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center border border-stone/60 px-7 text-xs tracking-[0.15em] uppercase"
          >
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
