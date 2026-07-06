import { computeNorthStarMetrics } from "../executive/north-star";
import { getOperatorMetrics } from "./business-operator";
import type { FinancialIntelligence } from "../types";

export async function getFinancialIntelligence(): Promise<FinancialIntelligence> {
  const [northStar, metrics] = await Promise.all([computeNorthStarMetrics(), getOperatorMetrics()]);

  const grossRevenue = metrics.revenue.thisMonth;
  const estimatedCosts = Math.round(grossRevenue * 0.35);
  const netProfit = grossRevenue - estimatedCosts;

  return {
    generatedAt: new Date().toISOString(),
    grossRevenue,
    netProfit,
    monthlyRecurringRevenue: northStar.monthlyRecurringClients * northStar.averageProjectValue * 0.15,
    averageProjectValue: northStar.averageProjectValue,
    revenuePerVisitor: northStar.revenuePerVisitor,
    customerAcquisitionCost: northStar.customerAcquisitionCost,
    returnOnAdSpend: 0,
    cashRunwayMonths: grossRevenue > 0 ? Math.max(3, Math.round(netProfit / (estimatedCosts / 12 || 1))) : 0,
    monthlyGrowthRate: northStar.growthRate,
    confidence: northStar.confidence,
    assumptions: [
      "Net profit estimated at 65% margin (studio industry benchmark)",
      "MRR estimated from repeat clients × APV × 15% monthly recurrence",
      "CAC and ROAS require ad spend integration (not connected)",
      "Cash runway is heuristic without expense ledger",
    ],
  };
}
