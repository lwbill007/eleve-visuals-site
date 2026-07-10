"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { adminFetch } from "@/lib/admin-fetch";
import type { AIDailyBriefing } from "@/lib/ai/types";

type BriefingContextValue = {
  briefing: AIDailyBriefing | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Ensure briefing is loaded — call from pages that need it. */
  ensureLoaded: () => void;
};

const BriefingContext = createContext<BriefingContextValue | null>(null);

/** Routes that need the daily briefing payload on mount. */
const BRIEFING_ROUTES = new Set(["/admin", "/admin/briefing"]);

export function BriefingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [briefing, setBriefing] = useState<AIDailyBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);
  const skipFetch = pathname === "/admin/login" || pathname?.startsWith("/admin/login/");
  const wantsBriefing =
    !skipFetch &&
    (BRIEFING_ROUTES.has(pathname ?? "") || (pathname ?? "").startsWith("/admin/briefing"));

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/admin/ai/daily-briefing${force ? "?refresh=1" : ""}`);
      if (!res.ok) {
        setBriefing(null);
        setError(`Briefing unavailable (HTTP ${res.status}).`);
        return;
      }
      setBriefing((await res.json()) as AIDailyBriefing);
      setError(null);
      loadedRef.current = true;
    } catch {
      setBriefing(null);
      setError("Could not load briefing — check connectivity and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skipFetch) {
      setLoading(false);
      return;
    }
    if (wantsBriefing && !loadedRef.current) {
      void load();
    }
  }, [load, skipFetch, wantsBriefing]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  const ensureLoaded = useCallback(() => {
    if (!loadedRef.current && !loading && !skipFetch) void load();
  }, [load, loading, skipFetch]);

  return (
    <BriefingContext.Provider value={{ briefing, loading, error, refresh, ensureLoaded }}>
      {children}
    </BriefingContext.Provider>
  );
}

export function useBriefing() {
  const ctx = useContext(BriefingContext);
  if (!ctx) throw new Error("useBriefing must be used within BriefingProvider");
  return ctx;
}

export function useBriefingOptional() {
  return useContext(BriefingContext);
}
