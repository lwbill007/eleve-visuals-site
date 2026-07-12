import { computeNorthStarMetrics } from "../executive/north-star";
import { getOperatorMetrics } from "./business-operator";
import type { FinancialIntelligence } from "../types";

export async function getFinancialIntelligence(): Promise<FinancialIntelligence> {
  const [northStar, metrics] = await Promise.all([computeNorthStarMetrics(), getOperatorMetrics()]);

  const grossRevenue = metrics.revenue.thisMonth;

  return {
    generatedAt: new Date().toISOString(),
    grossRevenue,
    netProfit: 0,
    monthlyRecurringRevenue: 0,
    averageProjectValue: northStar.averageProjectValue,
    revenuePerVisitor: northStar.revenuePerVisitor,
    customerAcquisitionCost: northStar.customerAcquisitionCost,
    returnOnAdSpend: 0,
    cashRunwayMonths: 0,
    monthlyGrowthRate: northStar.growthRate,
    confidence: Math.min(northStar.confidence, 0.45),
    assumptions: [
      "Net profit, MRR, and cash runway: More financial data required (expense ledger not connected)",
      "Do not invent industry margin benchmarks as ÉLEVÉ facts",
      "CAC and ROAS require ad spend integration (not connected)",
      "APV / revenue-per-visitor inherit north-star caveats (may be estimated)",
    ],
  };
}
