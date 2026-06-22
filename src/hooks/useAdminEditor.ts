"use client";

import { useCallback, useEffect, useRef } from "react";

/** Warn before closing tab when there are unsaved edits. */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}

/** Debounced autosave — calls save when dirty, reports status via callback. */
export function useAutosave(
  dirty: boolean,
  save: () => Promise<boolean>,
  options?: { delayMs?: number; enabled?: boolean }
) {
  const delayMs = options?.delayMs ?? 8000;
  const enabled = options?.enabled !== false;
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!dirty || !enabled) return;
    const timer = setTimeout(() => {
      void saveRef.current();
    }, delayMs);
    return () => clearTimeout(timer);
  }, [dirty, delayMs, enabled, save]);
}

/** Track dirty state by comparing serialized snapshots. */
export function useDirtyTracker<T>(savedSnapshot: string, current: T): boolean {
  const currentSnapshot = JSON.stringify(current);
  return currentSnapshot !== savedSnapshot;
}

export function useConfirmNavigation(dirty: boolean) {
  return useCallback(() => {
    if (!dirty) return true;
    return window.confirm("You have unsaved changes. Leave without saving?");
  }, [dirty]);
}
