/**
 * Shared budget estimation from free-text booking budget ranges
 * or package starting prices.
 */

import { estimateInquiryValue, getPackageById } from "./booking-packages";

export function estimateBudgetValue(budgetRange: string, packageId?: string, addOnIds?: string[]): number {
  if (packageId) {
    const fromPkg = estimateInquiryValue(packageId, addOnIds ?? []);
    if (fromPkg > 0) return fromPkg;
  }
  if (!budgetRange) {
    const pkg = packageId ? getPackageById(packageId) : undefined;
    return pkg?.startingPrice ?? 0;
  }
  const nums =
    budgetRange.match(/\d[\d,]*/g)?.map((n) => parseInt(n.replace(/,/g, ""), 10)) ?? [];
  if (nums.length >= 2) return Math.round((nums[0] + nums[1]) / 2);
  if (nums.length === 1) return nums[0];
  const lower = budgetRange.toLowerCase();
  if (lower.includes("premium") || lower.includes("bespoke") || lower.includes("legacy")) return 15000;
  if (lower.includes("reserve") || lower.includes("partnership")) return 5000;
  if (lower.includes("prestige") || lower.includes("apex")) return 1200;
  if (lower.includes("signature") || lower.includes("cinema") || lower.includes("ascend")) return 500;
  if (lower.includes("foundations") || lower.includes("motion") || lower.includes("fusion")) return 250;
  if (lower.includes("essential") || lower.includes("starter")) return 1200;
  return 1500;
}
