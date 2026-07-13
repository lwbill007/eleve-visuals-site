import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortfolioDetailView } from "@/components/portfolio/PortfolioDetailView";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteConfig } from "@/lib/content";
import { getPortfolioAdjacent, getPortfolioItemBySlug } from "@/lib/portfolio";
import { siteResponseTime } from "@/lib/seo/page-metadata";
import {
  buildBreadcrumbSchema,
  buildCreativeWorkSchema,
  buildImageObjectSchemas,
} from "@/lib/seo/structured-data";
import { suggestPortfolioSeo } from "@/lib/seo/portfolio-seo";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPortfolioItemBySlug(slug);
  if (!project) return { title: "Project Not Found" };

  const suggested = suggestPortfolioSeo(project);
  const title = project.seoTitle || suggested.seoTitle;
  const description = project.seoDescription || suggested.seoDescription;
  const image = project.heroImage || project.image || undefined;

  return {
    title,
    description,
    alternates: { canonical: `/portfolio/${project.slug}` },
    openGraph: {
      title: project.title,
      description,
      type: "article",
      url: `/portfolio/${project.slug}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PortfolioProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [project, adjacent, site] = await Promise.all([
    getPortfolioItemBySlug(slug),
    getPortfolioAdjacent(slug),
    getSiteConfig(),
  ]);

  if (!project) notFound();

  const schemas = [
    buildBreadcrumbSchema(site, [
      { name: "Home", path: "/" },
      { name: "Portfolio", path: "/portfolio" },
      { name: project.title, path: `/portfolio/${project.slug}` },
    ]),
    buildCreativeWorkSchema(site, project),
    ...buildImageObjectSchemas(site, project),
  ];

  return (
    <>
      <JsonLd data={schemas} />
      <PortfolioDetailView
        project={project}
        prev={adjacent.prev}
        next={adjacent.next}
        responseTime={siteResponseTime(site)}
      />
    </>
  );
}
