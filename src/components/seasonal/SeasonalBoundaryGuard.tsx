"use client";

import { useEffect } from "react";

/**
 * Stale-page guard for scheduled campaigns. Pages are cached for up to ~60 s;
 * if this page was rendered before a scheduled start/end and is viewed after
 * it, reload once so an expired campaign never stays on screen.
 */
export function SeasonalBoundaryGuard({ at }: { at: number }) {
  useEffect(() => {
    const key = `eleve-season-reloaded-${at}`;
    const reloadOnce = () => {
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch {
        return;
      }
      window.location.reload();
    };
    const wait = at - Date.now();
    if (wait <= 0) {
      reloadOnce();
      return;
    }
    if (wait > 2_147_000_000) return; // beyond setTimeout range
    const timer = window.setTimeout(reloadOnce, wait + 5_000);
    return () => window.clearTimeout(timer);
  }, [at]);
  return null;
}
