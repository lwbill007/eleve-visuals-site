/**
 * Shared budget estimation from free-text booking budget ranges
 * or package starting prices.
 */

export function estimateBudgetValue(budgetRange: string, packageId?: string, addOnIds?: string[]): number {
  void packageId;
  void addOnIds;
  if (!budgetRange) return 0;
  const nums =
    budgetRange.match(/\d[\d,]*/g)?.map((n) => parseInt(n.replace(/,/g, ""), 10)) ?? [];
  if (nums.length >= 2) return Math.round((nums[0] + nums[1]) / 2);
  if (nums.length === 1) return nums[0];
  return 0;
}

/**
 * Single source of truth for "what is this submission worth" — prefers a qualification-stage
 * override (set once a human/AI has actually scoped the project) over the raw budget-range
 * estimate. Every place that values a booking (Dashboard, Pipeline, CRM) should call this
 * instead of re-deriving the value inline, so the same submission can't price out differently
 * on different admin pages.
 */
export function estimateSubmissionValue(data: Record<string, unknown>): number {
  const qualification = data.qualification as { estimatedProjectValue?: number } | undefined;
  if (typeof qualification?.estimatedProjectValue === "number") {
    return qualification.estimatedProjectValue;
  }
  const budgetRange = typeof data.budgetRange === "string" ? data.budgetRange : "";
  const packageId = typeof data.packageId === "string" ? data.packageId : undefined;
  const addOnIds = Array.isArray(data.addOnIds) ? (data.addOnIds as string[]) : undefined;
  return estimateBudgetValue(budgetRange, packageId, addOnIds) || 0;
}
