"use client";

import { useEffect, useState } from "react";

let activeCount = 0;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function beginUpload(): void {
  activeCount += 1;
  notify();
}

export function endUpload(): void {
  activeCount = Math.max(0, activeCount - 1);
  notify();
}

export function getActiveUploadCount(): number {
  return activeCount;
}

export function subscribeUploads(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** True while any admin upload is in flight — use to block form saves. */
export function useUploadsActive(): boolean {
  const [active, setActive] = useState(() => getActiveUploadCount() > 0);

  useEffect(() => {
    return subscribeUploads(() => setActive(getActiveUploadCount() > 0));
  }, []);

  return active;
}
