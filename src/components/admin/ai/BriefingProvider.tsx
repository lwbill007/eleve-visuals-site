"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { adminFetch } from "@/lib/admin-fetch";
import type { AIDailyBriefing } from "@/lib/ai/types";

type BriefingContextValue = {
  briefing: AIDailyBriefing | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const BriefingContext = createContext<BriefingContextValue | null>(null);

export function BriefingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [briefing, setBriefing] = useState<AIDailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const skipFetch = pathname === "/admin/login" || pathname?.startsWith("/admin/login/");

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
    void load();
  }, [load, skipFetch]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return (
    <BriefingContext.Provider value={{ briefing, loading, error, refresh }}>
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
