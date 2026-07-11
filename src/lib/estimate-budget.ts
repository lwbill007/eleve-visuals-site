/**
 * Shared budget estimation from free-text booking budget ranges.
 * Used by pipeline, CRM, financial sync, and booking intelligence.
 */

export function estimateBudgetValue(budgetRange: string): number {
  if (!budgetRange) return 0;
  const nums =
    budgetRange.match(/\d[\d,]*/g)?.map((n) => parseInt(n.replace(/,/g, ""), 10)) ?? [];
  if (nums.length >= 2) return Math.round((nums[0] + nums[1]) / 2);
  if (nums.length === 1) return nums[0];
  const lower = budgetRange.toLowerCase();
  if (lower.includes("premium") || lower.includes("bespoke")) return 3500;
  if (lower.includes("standard") || lower.includes("signature")) return 2000;
  if (lower.includes("essential") || lower.includes("starter")) return 1200;
  return 1500;
}
