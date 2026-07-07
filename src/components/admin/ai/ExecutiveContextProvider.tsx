"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import type { ExecutiveContext } from "@/lib/ai/platform/executive-context";

interface ExecutiveContextValue {
  context: ExecutiveContext | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const Ctx = createContext<ExecutiveContextValue | null>(null);

export function ExecutiveContextProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<ExecutiveContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((refresh = false) => {
    setLoading(true);
    adminFetch(`/api/admin/ai/executive-context${refresh ? "?refresh=1" : ""}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((c: ExecutiveContext) => {
        setContext(c);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const value = useMemo(
    () => ({ context, loading, error, refresh: () => load(true) }),
    [context, loading, error, load]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Non-throwing accessor — safe on pages that may render outside the provider. */
export function useExecutiveContext(): ExecutiveContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return { context: null, loading: false, error: null, refresh: () => {} };
  }
  return ctx;
}
