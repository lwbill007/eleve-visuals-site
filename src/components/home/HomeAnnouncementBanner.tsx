"use client";

import Link from "next/link";
import type { HomepageBanner } from "@/lib/types";
import { trackEngagement } from "@/lib/analytics-client";

export function HomeAnnouncementBanner({ banner }: { banner: HomepageBanner | null }) {
  if (!banner?.enabled || !banner.text?.trim()) return null;

  const inner = (
    <span className="text-xs tracking-[0.14em] text-cream uppercase md:text-[0.7rem]">
      {banner.text}
    </span>
  );

  return (
    <div
      className="relative border-b border-stone/40 bg-charcoal/80"
      role="region"
      aria-label="Announcement"
    >
      {banner.image ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url(${banner.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          aria-hidden
        />
      ) : null}
      <div className="relative container-wide flex min-h-10 items-center justify-center px-4 py-2.5 text-center">
        {banner.href ? (
          <Link
            href={banner.href}
            className="hover:text-accent focus-visible:outline-none"
            onClick={() =>
              trackEngagement({
                event: "cta_click",
                path: "/",
                label: "homepage_banner",
              })
            }
          >
            {inner}
          </Link>
        ) : (
          inner
        )}
      </div>
    </div>
  );
}
