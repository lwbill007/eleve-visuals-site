"use client";

import Link from "next/link";
import { trackEngagement } from "@/lib/analytics-client";

export function PortfolioBookCta({ slug }: { slug: string }) {
  return (
    <Link
      href="/book"
      onClick={() =>
        trackEngagement({
          event: "cta_click",
          path: `/portfolio/${slug}`,
          label: "book_this_style",
        })
      }
      className="inline-flex min-h-12 items-center bg-cream px-8 text-xs tracking-[0.15em] text-ink uppercase"
    >
      Book Your Experience
    </Link>
  );
}
