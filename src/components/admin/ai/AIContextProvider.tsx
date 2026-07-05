"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AIContextPayload, AIPageContext } from "@/lib/ai/types";

interface AIContextValue {
  context: AIContextPayload;
  setPageContext: (page: AIPageContext, data?: Record<string, unknown>, title?: string) => void;
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;
}

const AIContext = createContext<AIContextValue | null>(null);

export function AIContextProvider({ children }: { children: React.ReactNode }) {
  const [context, setContext] = useState<AIContextPayload>({ page: "general" });
  const [panelOpen, setPanelOpen] = useState(false);

  const setPageContext = useCallback((page: AIPageContext, data?: Record<string, unknown>, title?: string) => {
    setContext({ page, data, title });
  }, []);

  const value = useMemo(
    () => ({
      context,
      setPageContext,
      panelOpen,
      openPanel: () => setPanelOpen(true),
      closePanel: () => setPanelOpen(false),
      togglePanel: () => setPanelOpen((v) => !v),
    }),
    [context, setPageContext, panelOpen]
  );

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAIContext() {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error("useAIContext must be used within AIContextProvider");
  return ctx;
}

export function useSetAIPage(page: AIPageContext, data?: Record<string, unknown>, title?: string) {
  const { setPageContext } = useAIContext();
  const dataKey = data ? JSON.stringify(data) : "";
  useEffect(() => {
    setPageContext(page, data, title);
  }, [page, title, dataKey, setPageContext, data]);
}
