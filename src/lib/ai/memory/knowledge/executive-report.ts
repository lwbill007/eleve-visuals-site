import type { KnowledgeFinding, PlatformIssue } from "./types";
import type { PlatformChange } from "./change-detector";

export interface ExecutiveRecommendation {
  id: string;
  title: string;
  detail: string;
  category: "seo" | "ux" | "conversion" | "brand" | "content" | "performance" | "accessibility";
  priority: number;
  expectedTrafficIncrease: string;
  expectedConversionIncrease: string;
  expectedRevenueImpact: string;
  implementationEffort: "low" | "medium" | "high";
  confidence: number;
  sourcePages: string[];
}

export interface ExecutiveIntelligenceReport {
  generatedAt: string;
  refreshId: string;
  summary: string;
  whatChanged: string[];
  whatImproved: string[];
  whatDeclined: string[];
  seoOpportunities: string[];
  uxProblems: string[];
  conversionBlockers: string[];
  brandInconsistencies: string[];
  missingCTAs: string[];
  missingContent: string[];
  duplicateContent: string[];
  brokenInternalLinks: string[];
  accessibilityIssues: string[];
  performanceConcerns: string[];
  outdatedPages: string[];
  mergeCandidates: string[];
  removeCandidates: string[];
  recommendations: ExecutiveRecommendation[];
  overallHealthScore: number;
}

function rec(
  partial: Omit<ExecutiveRecommendation, "id" | "priority" | "expectedTrafficIncrease" | "expectedConversionIncrease" | "expectedRevenueImpact"> & {
    priority?: number;
    expectedTrafficIncrease?: string;
    expectedConversionIncrease?: string;
    expectedRevenueImpact?: string;
  }
): ExecutiveRecommendation {
  return {
    id: `rec-${stableId(partial.title)}`,
    priority: partial.priority ?? 50,
    expectedTrafficIncrease:
      partial.expectedTrafficIncrease ?? "Unknown — requires before/after measurement",
    expectedConversionIncrease:
      partial.expectedConversionIncrease ?? "Unknown — requires before/after measurement",
    expectedRevenueImpact: partial.expectedRevenueImpact ?? "More financial data required",
    ...partial,
  };
}

function stableId(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export function generateExecutiveIntelligenceReport(input: {
  refreshId: string;
  findings: KnowledgeFinding[];
  changes: PlatformChange[];
  issues: PlatformIssue[];
  mergeDetails: string[];
  pagesScanned: number;
}): ExecutiveIntelligenceReport {
  const { findings, changes, issues, mergeDetails, pagesScanned, refreshId } = input;

  const whatChanged = changes.map((c) => `${c.title} — ${c.page}: ${c.detail}`);
  const whatImproved: string[] = [];
  const whatDeclined = changes
    .filter((c) => c.severity === "high" || c.type === "deleted_page")
    .map((c) => `${c.page}: ${c.title}`);

  const seoOpportunities: string[] = [];
  const uxProblems: string[] = [];
  const conversionBlockers: string[] = [];
  const brandInconsistencies: string[] = [];
  const missingCTAs: string[] = [];
  const missingContent: string[] = [];
  const duplicateContent: string[] = [...mergeDetails];
  const brokenInternalLinks: string[] = [];
  const accessibilityIssues: string[] = [];
  const performanceConcerns: string[] = [];
  const outdatedPages: string[] = [];
  const mergeCandidates: string[] = [];
  const removeCandidates: string[] = [];
  const recommendations: ExecutiveRecommendation[] = [];

  for (const f of findings) {
    const ctas = (f.value.ctas as { label: string; href: string }[]) ?? [];
    if (f.layer === "brand" || f.layer === "creative") {
      if (!ctas.length && f.importance > 70) {
        missingCTAs.push(`${f.sourcePage}: no CTA detected`);
        recommendations.push(
          rec({
            title: `Add CTA on ${f.title}`,
            detail: `${f.sourcePage} drives trust but lacks a conversion path`,
            category: "conversion",
            priority: 78,
            expectedTrafficIncrease: "Unknown — requires before/after measurement",
            expectedConversionIncrease: "Unknown — requires before/after measurement",
            expectedRevenueImpact: "More financial data required",
            implementationEffort: "low",
            confidence: 0.82,
            sourcePages: [f.sourcePage],
          })
        );
      }
    }

    const seo = f.value.seo as { score?: number; issues?: string[] } | undefined;
    if (seo?.issues?.length) {
      for (const issue of seo.issues) {
        seoOpportunities.push(`${f.sourcePage}: ${issue}`);
        recommendations.push(
          rec({
            title: `SEO: ${issue}`,
            detail: `Improve discoverability for ${f.title}`,
            category: "seo",
            priority: 65,
            expectedTrafficIncrease: "Unknown — requires before/after measurement",
            expectedConversionIncrease: "Unknown — requires before/after measurement",
            expectedRevenueImpact: "More financial data required",
            implementationEffort: "low",
            confidence: 0.75,
            sourcePages: [f.sourcePage],
          })
        );
      }
    }

    const imagery = f.value.imagery as { galleryCount?: number; notes?: string[] } | undefined;
    if (imagery?.notes?.includes("Thin gallery")) {
      uxProblems.push(`${f.sourcePage}: thin visual gallery`);
    }

    const branding = f.value.branding as { consistency?: number; notes?: string[] } | undefined;
    if (branding && (branding.consistency ?? 100) < 70) {
      brandInconsistencies.push(`${f.sourcePage}: tone inconsistency (${branding.consistency ?? 0}%)`);
    }
  }

  for (const issue of issues) {
    if (issue.type === "missing_content") missingContent.push(`${issue.page}: ${issue.title}`);
    if (issue.type === "conversion") conversionBlockers.push(`${issue.page}: ${issue.title}`);
    if (issue.type === "ux") uxProblems.push(`${issue.page}: ${issue.title}`);
    if (issue.type === "seo") seoOpportunities.push(`${issue.page}: ${issue.title}`);
    if (issue.type === "duplicate") duplicateContent.push(`${issue.page}: ${issue.title}`);
    if (issue.type === "outdated") outdatedPages.push(`${issue.page}: ${issue.title}`);
    if (issue.type === "branding") brandInconsistencies.push(`${issue.page}: ${issue.title}`);

    if (issue.severity === "high") {
      recommendations.push(
        rec({
          title: issue.title,
          detail: issue.detail,
          category:
            issue.type === "seo"
              ? "seo"
              : issue.type === "conversion"
                ? "conversion"
                : issue.type === "ux"
                  ? "ux"
                  : "content",
          priority: issue.severity === "high" ? 90 : 60,
          expectedTrafficIncrease: "Unknown — requires before/after measurement",
          expectedConversionIncrease: "Unknown — requires before/after measurement",
          expectedRevenueImpact: "More financial data required",
          implementationEffort: issue.type === "missing_content" ? "low" : "medium",
          confidence: 0.85,
          sourcePages: [issue.page],
        })
      );
    }
  }

  for (const c of changes) {
    if (c.type === "deleted_page") removeCandidates.push(c.page);
    if (c.type === "broken_link") brokenInternalLinks.push(`${c.page}: ${c.detail}`);
    if (c.type === "pricing_change") {
      whatChanged.push(`Pricing: ${c.page}`);
      recommendations.push(
        rec({
          title: "Verify pricing consistency",
          detail: `Pricing changed on ${c.page} — ensure CRM and booking form match`,
          category: "conversion",
          priority: 85,
          expectedTrafficIncrease: "N/A",
          expectedConversionIncrease: "Unknown — requires before/after measurement",
          expectedRevenueImpact: "Protects pipeline accuracy — not a revenue lift claim",
          implementationEffort: "low",
          confidence: 0.9,
          sourcePages: [c.page],
        })
      );
    }
  }

  if (pagesScanned > 40 && findings.filter((f) => f.category === "discovered").length > 5) {
    mergeCandidates.push("Multiple thin discovered routes — consider consolidating navigation");
  }

  const highIssues = issues.filter((i) => i.severity === "high").length;
  const overallHealthScore = Math.max(
    35,
    Math.min(
      98,
      92 -
        highIssues * 8 -
        missingCTAs.length * 3 -
        brokenInternalLinks.length * 5 -
        brandInconsistencies.length * 2
    )
  );

  recommendations.sort((a, b) => b.priority - a.priority);

  return {
    generatedAt: new Date().toISOString(),
    refreshId,
    summary: `Scanned ${pagesScanned} routes · ${findings.length} knowledge nodes · health ${overallHealthScore}/100`,
    whatChanged,
    whatImproved,
    whatDeclined,
    seoOpportunities,
    uxProblems,
    conversionBlockers,
    brandInconsistencies,
    missingCTAs,
    missingContent,
    duplicateContent,
    brokenInternalLinks,
    accessibilityIssues,
    performanceConcerns,
    outdatedPages,
    mergeCandidates,
    removeCandidates,
    recommendations: recommendations.slice(0, 20),
    overallHealthScore,
  };
}
