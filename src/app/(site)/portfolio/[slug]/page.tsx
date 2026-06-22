import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortfolioDetailView } from "@/components/portfolio/PortfolioDetailView";
import { getPortfolioAdjacent, getPortfolioItemBySlug } from "@/lib/portfolio";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPortfolioItemBySlug(slug);
  if (!project) return { title: "Project Not Found" };

  return {
    title: project.seoTitle || `${project.title} — Portfolio`,
    description:
      project.seoDescription || project.subtitle || project.description.slice(0, 160),
    openGraph: {
      title: project.title,
      description: project.subtitle || project.description.slice(0, 160),
      images: project.heroImage || project.image ? [{ url: project.heroImage || project.image! }] : undefined,
    },
  };
}

export default async function PortfolioProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [project, adjacent] = await Promise.all([
    getPortfolioItemBySlug(slug),
    getPortfolioAdjacent(slug),
  ]);

  if (!project) notFound();

  return (
    <PortfolioDetailView project={project} prev={adjacent.prev} next={adjacent.next} />
  );
}
