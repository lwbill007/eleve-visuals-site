import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCastProfile } from "@/lib/cast-server";
import { CastProfileView } from "@/components/sessions/CastProfileView";
import { CAST_ROLE_LABELS } from "@/lib/cast";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getCastProfile(slug);
  if (!profile) return { title: "Profile Not Found" };

  const role = profile.roles.map((r) => CAST_ROLE_LABELS[r]).join(", ");
  return {
    title: `${profile.name} — ÉLEVÉ Sessions`,
    description: profile.bio?.slice(0, 160) || `${profile.name}, ${role} — part of the ÉLEVÉ Sessions creative network.`,
    openGraph: {
      title: profile.name,
      description: role,
      images: profile.coverPhoto ? [{ url: profile.coverPhoto }] : undefined,
    },
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

  return <CastProfileView profile={profile} />;
}
