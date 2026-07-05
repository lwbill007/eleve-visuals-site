"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import type { AIDailyBriefing } from "@/lib/ai/types";

type BriefingContextValue = {
  briefing: AIDailyBriefing | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

const BriefingContext = createContext<BriefingContextValue | null>(null);

export function BriefingProvider({ children }: { children: React.ReactNode }) {
  const [briefing, setBriefing] = useState<AIDailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/admin/ai/daily-briefing${force ? "?refresh=1" : ""}`);
      if (res.ok) setBriefing((await res.json()) as AIDailyBriefing);
    } catch {
      setBriefing(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load(true);
  }, [load]);

  return (
    <BriefingContext.Provider value={{ briefing, loading, refresh }}>
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
