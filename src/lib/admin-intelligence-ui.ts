export interface VerificationQueuePreviewItem {
  id: string;
  title: string;
}

export function selectBatchVerificationPreview(
  queue: VerificationQueuePreviewItem[],
  limit = 20
): VerificationQueuePreviewItem[] {
  return queue.slice(0, Math.max(0, limit));
}

export function keepStaleOnFailure<T>(current: T, next: T | null): T {
  return next ?? current;
}

export function describeSimulationBasis(confidence: number): string {
  return confidence <= 0
    ? "Unavailable — no measured baseline"
    : "Heuristic scenario strength — not validated forecast accuracy";
}

export function describeEvidenceWeight(type: string): string {
  return type === "metric"
    ? "Source weighting — verify against the named system"
    : "Memory weighting — not independently measured accuracy";
}
