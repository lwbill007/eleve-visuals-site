"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  options?: { delayMs?: number; enabled?: boolean; changeKey?: string }
) {
  const delayMs = options?.delayMs ?? 8000;
  const enabled = options?.enabled !== false;
  const changeKey = options?.changeKey;
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!dirty || !enabled) return;
    const timer = setTimeout(() => {
      void saveRef.current();
    }, delayMs);
    return () => clearTimeout(timer);
  }, [changeKey, dirty, delayMs, enabled]);
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

export type AdminEditorStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export function resolveAdminSaveCompletion(input: {
  requestId: number;
  latestRequestId: number;
  ok: boolean;
  submittedSnapshot: string;
  currentSnapshot: string;
}): { status: AdminEditorStatus; savedSnapshot?: string } | null {
  if (input.requestId !== input.latestRequestId) return null;
  if (!input.ok) return { status: "error" };
  return {
    savedSnapshot: input.submittedSnapshot,
    status: input.currentSnapshot === input.submittedSnapshot ? "saved" : "dirty",
  };
}

/**
 * Owns the saved snapshot and ignores stale save completions. A save only marks
 * the exact submitted value as saved, so edits made while a request is in flight
 * remain dirty.
 */
export function useAdminEditor<T>(
  value: T,
  persist: (value: T) => Promise<boolean>,
  options?: { autosave?: boolean; autosaveDelayMs?: number }
) {
  const currentSnapshot = JSON.stringify(value);
  const [savedSnapshot, setSavedSnapshot] = useState(currentSnapshot);
  const [status, setStatus] = useState<AdminEditorStatus>("idle");
  const requestIdRef = useRef(0);
  const valueRef = useRef(value);
  const persistRef = useRef(persist);
  valueRef.current = value;
  persistRef.current = persist;

  const dirty = currentSnapshot !== savedSnapshot;
  const displayStatus: AdminEditorStatus =
    status === "saving" || status === "error" ? status : dirty ? "dirty" : status;
  useUnsavedChangesWarning(dirty);

  const markSaved = useCallback((nextValue: T) => {
    setSavedSnapshot(JSON.stringify(nextValue));
    setStatus("saved");
  }, []);

  const reset = useCallback((nextValue: T) => {
    requestIdRef.current += 1;
    setSavedSnapshot(JSON.stringify(nextValue));
    setStatus("idle");
  }, []);

  const save = useCallback(async () => {
    const submittedValue = valueRef.current;
    const submittedSnapshot = JSON.stringify(submittedValue);
    const requestId = ++requestIdRef.current;
    setStatus("saving");

    let ok = false;
    try {
      ok = await persistRef.current(submittedValue);
    } catch {
      ok = false;
    }

    const completion = resolveAdminSaveCompletion({
      requestId,
      latestRequestId: requestIdRef.current,
      ok,
      submittedSnapshot,
      currentSnapshot: JSON.stringify(valueRef.current),
    });
    if (!completion) return false;
    if (!completion.savedSnapshot) {
      setStatus(completion.status);
      return false;
    }

    setSavedSnapshot(completion.savedSnapshot);
    setStatus(completion.status);
    return true;
  }, []);

  useAutosave(dirty && status !== "saving", save, {
    enabled: options?.autosave === true,
    delayMs: options?.autosaveDelayMs,
    changeKey: currentSnapshot,
  });

  return {
    dirty,
    saving: displayStatus === "saving",
    status: displayStatus,
    save,
    markSaved,
    reset,
    savedSnapshot,
  };
}
