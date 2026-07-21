import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCastProfile, getProfileSlugs } from "@/lib/cast-server";
import { CastProfileView } from "@/components/sessions/CastProfileView";
import { CAST_ROLE_LABELS } from "@/lib/cast";
import { JsonLd } from "@/components/seo/JsonLd";

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const slugs = await getProfileSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getCastProfile(slug);
  if (!profile) return { title: "Profile Not Found" };

  const role = profile.roles.map((r) => CAST_ROLE_LABELS[r]).join(", ");
  const canonical = `/sessions/cast/${profile.slug}`;
  return {
    title: `${profile.name} — ÉLEVÉ Sessions`,
    description: profile.bio?.slice(0, 160) || `${profile.name}, ${role} — part of the ÉLEVÉ Sessions creative network.`,
    openGraph: {
      title: profile.name,
      description: role,
      images: profile.coverPhoto ? [{ url: profile.coverPhoto }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${profile.name} — ÉLEVÉ Sessions`,
      description: profile.bio?.slice(0, 160) || role,
      images: profile.coverPhoto ? [profile.coverPhoto] : undefined,
    },
    alternates: { canonical },
  };
}

export default async function CastProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getCastProfile(slug);
  if (!profile) notFound();

  const base =
    process.env.CANONICAL_SITE_URL?.replace(/\/$/, "") ||
    "https://www.eleve-visuals.com";
  const instagram = profile.instagram
    ? profile.instagram.startsWith("http")
      ? profile.instagram
      : `https://www.instagram.com/${profile.instagram.replace(/^@/, "")}`
    : null;
  const sameAs = [instagram, profile.tiktok, profile.website, profile.portfolioLink].filter(
    (value): value is string => Boolean(value && /^https:\/\//i.test(value))
  );

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          "@id": `${base}/sessions/cast/${profile.slug}#person`,
          name: profile.name,
          description: profile.bio || undefined,
          image: profile.coverPhoto || undefined,
          homeLocation: profile.city || undefined,
          sameAs,
          url: `${base}/sessions/cast/${profile.slug}`,
        }}
      />
      <CastProfileView profile={profile} />
    </>
  );
}
