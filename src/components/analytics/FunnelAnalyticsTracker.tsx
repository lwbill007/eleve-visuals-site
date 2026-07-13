"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { setExperimentVariant, trackFunnel, type FunnelLabel } from "@/lib/analytics-client";

function funnelForPath(path: string): FunnelLabel | null {
  if (path === "/") return "homepage_loaded";
  if (path === "/portfolio" || path.startsWith("/portfolio/")) return "portfolio_viewed";
  if (path === "/sessions" || (path.startsWith("/sessions/") && !path.includes("/apply"))) {
    return "session_viewed";
  }
  if (path === "/book") return "booking_started";
  return null;
}

/**
 * Named funnel stages on public route changes.
 * Pageviews remain in AnalyticsTracker — this only adds conversion stages.
 */
export function FunnelAnalyticsTracker({
  experimentVariant,
}: {
  experimentVariant?: string | null;
}) {
  const pathname = usePathname();
  const last = useRef<string>("");

  useEffect(() => {
    if (experimentVariant) setExperimentVariant(experimentVariant);
  }, [experimentVariant]);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (last.current === pathname) return;
    last.current = pathname;

    const stage = funnelForPath(pathname);
    if (stage) trackFunnel(stage, { path: pathname });
  }, [pathname]);

  return null;
}
