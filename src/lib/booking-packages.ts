/**
 * Public booking catalog generated from the approved v0.2 validation config.
 * Inquiry-first: prices educate and qualify; a reviewed proposal remains required.
 */

import {
  APPROVED_PRICING_PACKAGES,
  PRICING_FAMILY_LABELS,
  type PricingFamily,
  type PricingLevel,
} from "./pricing-config";

export type PackageFamily = PricingFamily;

export interface BookingPackage {
  id: string;
  family: PackageFamily;
  level: PricingLevel;
  name: string;
  startingPrice: number;
  billing: "project" | "monthly";
  currency: "USD";
  headline?: string;
  description: string;
  perfectFor: string[];
  experience: string;
  included: string[];
  notIncluded: string[];
  estimatedTimeline: string;
  recommendedAddOnIds: string[];
  exampleDeliverables: string[];
  faq: { q: string; a: string }[];
  clientExpectations: string[];
  projectCategory: string;
  galleryPreviewHint: string;
  videoPreviewHint?: string;
}

export interface BookingAddOn {
  id: string;
  name: string;
  startingPrice: number;
  description: string;
  whyItMatters: string;
  families: PackageFamily[] | "all";
}

export const PACKAGE_FAMILY_LABELS: Record<PackageFamily, string> = PRICING_FAMILY_LABELS;

export const BOOKING_PACKAGES: BookingPackage[] = APPROVED_PRICING_PACKAGES.map((pkg) => ({
  id: pkg.id,
  family: pkg.family,
  level: pkg.level,
  name: pkg.name,
  startingPrice: pkg.price,
  billing: pkg.billing,
  currency: "USD",
  headline:
    pkg.level === "signature"
      ? "More direction and a coherent asset set."
      : pkg.level === "premium"
        ? "A production-led experience."
        : "A focused way to begin.",
  description: pkg.description,
  perfectFor: pkg.perfectFor,
  experience: pkg.experience,
  included: pkg.included,
  notIncluded: pkg.notIncluded,
  estimatedTimeline: pkg.estimatedTimeline,
  recommendedAddOnIds: [],
  exampleDeliverables: pkg.exampleDeliverables,
  faq: pkg.faq,
  clientExpectations: pkg.clientExpectations,
  projectCategory: pkg.projectCategory,
  galleryPreviewHint: pkg.galleryPreviewHint,
  videoPreviewHint: pkg.videoPreviewHint,
}));

/**
 * Add-on prices remain unavailable until their delivery costs are validated.
 * Custom scope is quoted in writing rather than exposing the retired catalog.
 */
export const BOOKING_ADDONS: BookingAddOn[] = [];

export function getPackageById(id: string): BookingPackage | undefined {
  return BOOKING_PACKAGES.find((p) => p.id === id);
}

export function getAddOnById(id: string): BookingAddOn | undefined {
  return BOOKING_ADDONS.find((a) => a.id === id);
}

export function packagesForFamily(family: PackageFamily): BookingPackage[] {
  return BOOKING_PACKAGES.filter((p) => p.family === family);
}

export function addOnsForPackage(pkg: BookingPackage): BookingAddOn[] {
  return BOOKING_ADDONS.filter(
    (a) => a.families === "all" || a.families.includes(pkg.family)
  );
}

export function formatPackagePrice(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function formatPackageRate(pkg: Pick<BookingPackage, "startingPrice" | "billing">): string {
  return formatPackagePrice(pkg.startingPrice) + (pkg.billing === "monthly" ? "/month" : "");
}

export function estimateInquiryValue(packageId: string, addOnIds: string[]): number {
  const pkg = getPackageById(packageId);
  if (!pkg) return 0;
  const addOnTotal = addOnIds.reduce((sum, id) => {
    const addOn = getAddOnById(id);
    return sum + (addOn?.startingPrice ?? 0);
  }, 0);
  return pkg.startingPrice + addOnTotal;
}

/** Map the selected package to the matching public qualification band. */
export function budgetRangeFromPackage(packageId: string, addOnIds: string[] = []): string {
  const value = estimateInquiryValue(packageId, addOnIds);
  if (value >= 3500) return "$3,500+";
  if (value >= 1500) return "$1,500–3,499";
  if (value >= 750) return "$750–1,499";
  if (value >= 250) return "$250–749";
  return "Under $250";
}

export function deliverablesFromPackage(pkg: BookingPackage): string[] {
  const out: string[] = [];
  const blob = [...pkg.included, ...pkg.exampleDeliverables].join(" ").toLowerCase();
  if (/photo|image|portrait|gallery/.test(blob)) out.push("Edited Photography");
  if (/video|reel|film|motion|clip/.test(blob)) out.push("Cinematic Video");
  if (/reel|vertical|social|clip/.test(blob)) out.push("Vertical Social Reels");
  if (/direction|concept|planning|mood/.test(blob)) out.push("Creative Direction");
  if (/color|grading|retouch/.test(blob)) out.push("Color Grading");
  if (/brand|campaign|marketing|website/.test(blob)) out.push("Visual Campaign Assets");
  return out.length > 0 ? out : ["Edited Photography"];
}
