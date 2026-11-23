"use client";

import { useEffect } from "react";
import { trackEngagement } from "@/lib/analytics-client";

/** Records one campaign-tagged landing page view per mount. */
export function SeasonalLandingView({ campaign }: { campaign: string }) {
  useEffect(() => {
    trackEngagement({ event: "section_view", label: "seasonal_landing_view", metadata: { campaign } });
  }, [campaign]);
  return null;
}
