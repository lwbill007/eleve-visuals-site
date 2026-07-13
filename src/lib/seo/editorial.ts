/**
 * Editorial content foundation — quality-first publishing types.
 * Public journal routes and admin can extend this without inventing filler content.
 */

export type EditorialCategory =
  | "behind-the-scenes"
  | "creative-process"
  | "wardrobe-guide"
  | "preparation-guide"
  | "session-story"
  | "client-feature"
  | "educational";

export type EditorialArticleDraft = {
  slug: string;
  title: string;
  excerpt: string;
  category: EditorialCategory;
  /** ISO date when published; null = draft */
  publishedAt: string | null;
  heroImage: string | null;
  heroImageAlt: string;
  body: string;
  relatedPortfolioSlugs: string[];
  relatedSessionSlugs: string[];
  relatedServiceSlugs: string[];
  seoTitle: string;
  seoDescription: string;
};

export type EditorialHubContent = {
  enabled: boolean;
  eyebrow: string;
  headline: string;
  subheadline: string;
  /** Empty by default — editors add only high-quality pieces */
  articles: EditorialArticleDraft[];
};

export const DEFAULT_EDITORIAL_HUB: EditorialHubContent = {
  enabled: false,
  eyebrow: "Journal",
  headline: "Process, preparation, and stories worth publishing.",
  subheadline:
    "Behind-the-scenes notes, wardrobe guides, and session stories — published only when they earn the frame.",
  articles: [],
};

export const EDITORIAL_CATEGORY_LABELS: Record<EditorialCategory, string> = {
  "behind-the-scenes": "Behind the Scenes",
  "creative-process": "Creative Process",
  "wardrobe-guide": "Wardrobe Guide",
  "preparation-guide": "Preparation Guide",
  "session-story": "Session Story",
  "client-feature": "Client Feature",
  educational: "Guide",
};

export function suggestArticleSeo(title: string, excerpt: string): {
  seoTitle: string;
  seoDescription: string;
} {
  const seoTitle = title.length > 60 ? `${title.slice(0, 57)}…` : title;
  const base = excerpt.trim() || title;
  const seoDescription =
    base.length > 155 ? `${base.slice(0, 152).trim()}…` : base;
  return { seoTitle, seoDescription };
}
