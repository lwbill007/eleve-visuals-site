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
