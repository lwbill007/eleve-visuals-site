import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortfolioDetailView } from "@/components/portfolio/PortfolioDetailView";
import { JsonLd } from "@/components/seo/JsonLd";
import { getSiteConfig } from "@/lib/content";
import { getPortfolioAdjacent, getPortfolioItemBySlug } from "@/lib/portfolio";
import {
  buildBreadcrumbSchema,
  buildCreativeWorkSchema,
  buildImageObjectSchemas,
} from "@/lib/seo/structured-data";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPortfolioItemBySlug(slug);
  if (!project) return { title: "Project Not Found" };

  const title = project.seoTitle || `${project.title} — Portfolio`;
  const description =
    project.seoDescription || project.subtitle || project.description.slice(0, 160);
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
      <PortfolioDetailView project={project} prev={adjacent.prev} next={adjacent.next} />
    </>
  );
}
