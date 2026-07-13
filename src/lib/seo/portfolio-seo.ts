/**
 * Portfolio SEO helpers — auto-suggest when fields are empty.
 */

import type { PortfolioItemDTO } from "@/lib/types";

export function suggestPortfolioSeo(
  project: Pick<
    PortfolioItemDTO,
    "title" | "subtitle" | "description" | "category" | "client" | "year"
  >
): { seoTitle: string; seoDescription: string; imageAlt: string } {
  const clientBit = project.client ? ` for ${project.client}` : "";
  const yearBit = project.year ? ` (${project.year})` : "";
  const seoTitle = `${project.title}${clientBit} — ${project.category} Photography${yearBit}`.slice(
    0,
    70
  );

  const story =
    project.subtitle?.trim() ||
    project.description?.split("\n").find(Boolean)?.trim() ||
    `${project.title} — cinematic ${project.category.toLowerCase()} by ÉLEVÉ Visuals.`;
  const seoDescription =
    story.length > 155 ? `${story.slice(0, 152).trim()}…` : story;

  const imageAlt = project.subtitle
    ? `${project.title} — ${project.subtitle}`
    : `${project.title} — ${project.category} photography by ÉLEVÉ Visuals`;

  return { seoTitle, seoDescription, imageAlt };
}
