"use client";

import Link from "next/link";
import { trackEngagement } from "@/lib/analytics-client";

/** Link that records a campaign-tagged cta_click (own analytics + GA4 via the existing pipeline). */
export function SeasonalCtaLink({
  href,
  children,
  className,
  campaign,
  label,
  service,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  campaign: string;
  label: string;
  service?: string;
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() =>
        trackEngagement({
          event: "cta_click",
          label,
          metadata: { campaign, ...(service ? { service } : {}), destination: href },
        })
      }
    >
      {children}
    </Link>
  );
}
