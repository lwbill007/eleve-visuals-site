import Image from "next/image";
import Link from "next/link";
import { SessionIcon, type SessionIconName } from "./SessionIcon";
import { CAST_ROLE_LABELS } from "@/lib/cast";
import type { CastProfile } from "@/lib/cast-server";

const AWARD_ICONS = new Set<SessionIconName>(["award", "star", "gem", "sparkle", "film", "camera", "tag"]);
function awardIcon(icon: string): SessionIconName {
  return AWARD_ICONS.has(icon as SessionIconName) ? (icon as SessionIconName) : "award";
}

function instagramUrl(v: string) {
  return v.startsWith("http") ? v : `https://instagram.com/${v.replace(/^@/, "")}`;
}
function tiktokUrl(v: string) {
  return v.startsWith("http") ? v : `https://www.tiktok.com/@${v.replace(/^@/, "")}`;
}
function ensureHttp(v: string) {
  return v.startsWith("http") ? v : `https://${v}`;
}

function Social({ href, label }: { href: string; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-full border border-stone/40 px-4 py-1.5 text-xs tracking-[0.12em] text-fog uppercase transition-colors hover:border-accent hover:text-accent"
    >
      {label}
    </a>
  );
}

export function CastProfileView({ profile }: { profile: CastProfile }) {
  const roleLabel = profile.roles.map((r) => CAST_ROLE_LABELS[r]).join(" · ");

  return (
    <>
      <section className="relative flex min-h-[60vh] items-end">
        {profile.coverPhoto ? (
          <Image src={profile.coverPhoto} alt={profile.name} fill priority className="object-cover" sizes="100vw" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/20" />
        <div className="relative z-10 w-full section-padding pb-14 pt-28">
          <div className="container-wide">
            <Link href="/alumni" className="label-caps mb-6 inline-block text-fog hover:text-cream">
              ← Alumni
            </Link>
            <p className="label-caps text-accent">{roleLabel}</p>
            <h1 className="headline-xl mt-2">{profile.name}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted">
              {profile.city && <span>{profile.city}</span>}
              {profile.isAlumni && (
                <span className="rounded-full border border-accent/50 px-3 py-0.5 text-[0.65rem] tracking-[0.12em] text-accent uppercase">
                  Alumni
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding border-b border-stone/30">
        <div className="container-wide grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {profile.bio && (
              <div className="space-y-5">
                {profile.bio.split("\n").filter(Boolean).map((p, i) => (
                  <p key={i} className="body-lg text-fog">{p}</p>
                ))}
              </div>
            )}
            {profile.futureCollaborations && (
              <div className="mt-10">
                <h2 className="label-caps mb-3 text-fog">Future Projects</h2>
                <p className="text-sm text-fog">{profile.futureCollaborations}</p>
              </div>
            )}
          </div>
          <div className="lg:col-span-5">
            {(profile.instagram || profile.tiktok || profile.website || profile.portfolioLink) && (
              <div className="mb-8 flex flex-wrap gap-2">
                <Social href={profile.instagram ? instagramUrl(profile.instagram) : ""} label="Instagram" />
                <Social href={profile.tiktok ? tiktokUrl(profile.tiktok) : ""} label="TikTok" />
                <Social href={profile.website ? ensureHttp(profile.website) : ""} label="Website" />
                <Social href={profile.portfolioLink ? ensureHttp(profile.portfolioLink) : ""} label="Portfolio" />
              </div>
            )}
            {profile.awards.length > 0 && (
              <div className="border border-stone/40 p-6">
                <h2 className="label-caps mb-4">Awards</h2>
                <ul className="space-y-4">
                  {profile.awards.map((a, i) => (
                    <li key={i} className="flex gap-3">
                      <SessionIcon name={awardIcon(a.icon)} className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                      <div>
                        <p className="text-sm text-cream">
                          {a.name}
                          {a.year && <span className="text-muted"> · {a.year}</span>}
                        </p>
                        {(a.category || a.volume) && (
                          <p className="text-xs text-muted">{[a.category, a.volume].filter(Boolean).join(" · ")}</p>
                        )}
                        {a.reason && <p className="mt-0.5 text-xs text-fog">{a.reason}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {profile.volumes.length > 0 && (
        <section className="section-padding border-b border-stone/30 bg-ink-soft">
          <div className="container-wide">
            <h2 className="label-caps mb-8 text-fog">Volumes</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {profile.volumes.map((v) => (
                <Link key={`${v.slug}-${v.role}`} href={`/sessions/${v.slug}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden bg-charcoal">
                    {v.poster ? (
                      <Image
                        src={v.poster}
                        alt={v.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/90 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="text-[0.65rem] tracking-[0.12em] text-accent uppercase">Vol. {v.volumeNumber}</p>
                      <p className="font-display text-sm text-cream">{v.title}</p>
                      <p className="text-[0.65rem] text-muted">{CAST_ROLE_LABELS[v.role]}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {profile.photos.length > 0 && (
        <section className="section-padding">
          <div className="container-wide">
            <h2 className="label-caps mb-8 text-fog">Gallery</h2>
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
              {profile.photos.map((src, i) => (
                <div key={`${src}-${i}`} className="relative mb-4 aspect-[4/5] break-inside-avoid overflow-hidden bg-charcoal">
                  <Image
                    src={src}
                    alt={`${profile.name} — ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
