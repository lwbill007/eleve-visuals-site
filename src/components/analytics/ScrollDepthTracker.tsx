"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { trackEngagement } from "@/lib/analytics-client";

const DEPTHS = [25, 50, 75, 100] as const;

/** Fire scroll-depth engagement events once per page view. */
export function ScrollDepthTracker() {
  const pathname = usePathname();
  const fired = useRef<Set<number>>(new Set());

  useEffect(() => {
    fired.current = new Set();

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = Math.round((window.scrollY / scrollable) * 100);
      for (const d of DEPTHS) {
        if (pct >= d && !fired.current.has(d)) {
          fired.current.add(d);
          trackEngagement({
            event: "scroll_depth",
            path: pathname,
            depth: d,
            label: `${d}%`,
          });
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return null;
}
