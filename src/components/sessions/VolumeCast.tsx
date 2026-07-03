"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SessionIcon, type SessionIconName } from "./SessionIcon";
import { CAST_ROLE_LABELS, castDisplayName } from "@/lib/cast";
import type { CastAppearance, CastMemberDTO } from "@/lib/types";

const AWARD_ICONS = new Set<SessionIconName>([
  "award",
  "star",
  "gem",
  "sparkle",
  "film",
  "camera",
  "tag",
]);

function awardIcon(icon: string): SessionIconName {
  return AWARD_ICONS.has(icon as SessionIconName) ? (icon as SessionIconName) : "award";
}

function instagramUrl(v: string) {
  if (!v) return "";
  return v.startsWith("http") ? v : `https://instagram.com/${v.replace(/^@/, "")}`;
}
function tiktokUrl(v: string) {
  if (!v) return "";
  return v.startsWith("http") ? v : `https://www.tiktok.com/@${v.replace(/^@/, "")}`;
}
function ensureHttp(v: string) {
  if (!v) return "";
  return v.startsWith("http") ? v : `https://${v}`;
}

function SocialLink({ href, label }: { href: string; label: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 items-center rounded-full border border-stone/40 px-4 py-1 text-[0.7rem] tracking-[0.12em] text-fog uppercase transition-colors hover:border-accent hover:text-accent"
    >
      {label}
    </a>
  );
}

function dedupeCastMembers(members: CastMemberDTO[]): CastMemberDTO[] {
  const seen = new Set<string>();
  return members.filter((member) => {
    if (seen.has(member.id)) return false;
    seen.add(member.id);
    return true;
  });
}

function CastCardPhoto({ src, alt }: { src: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-charcoal">
        <SessionIcon name="users" className="h-10 w-10 text-stone sm:h-12 sm:w-12" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-cover transition-transform duration-700 group-hover:scale-105"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
      onError={() => setFailed(true)}
    />
  );
}

const CARD_SURFACE =
  "group relative block w-full min-w-0 overflow-hidden bg-charcoal text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:transition-transform sm:duration-300 sm:hover:scale-[1.01]";

function CastCardFace({ member }: { member: CastMemberDTO }) {
  const name = castDisplayName(member);
  const roleLabel = CAST_ROLE_LABELS[member.role];

  return (
    <div className="relative aspect-[3/4] w-full">
      <CastCardPhoto src={member.profilePhoto} alt={name} />

      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-ink via-ink/50 to-transparent"
        aria-hidden
      />

      {member.featured && (
        <span className="absolute top-2 left-2 z-[2] rounded-full bg-accent px-2.5 py-0.5 text-[0.6rem] font-medium tracking-[0.12em] text-ink uppercase sm:top-3 sm:left-3">
          Featured
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 z-[2] px-3 pt-12 pb-3 sm:px-4 sm:pb-4">
        <p className="line-clamp-2 font-display text-sm leading-snug break-words text-cream sm:text-lg sm:leading-tight">
          {name}
        </p>
        <p className="mt-1 line-clamp-1 text-[0.6rem] tracking-[0.12em] text-accent uppercase sm:text-[0.7rem]">
          {roleLabel}
        </p>
      </div>
    </div>
  );
}

function CastGridCard({
  member,
  index,
  reduce,
  onQuickLook,
}: {
  member: CastMemberDTO;
  index: number;
  reduce: boolean;
  onQuickLook: (member: CastMemberDTO) => void;
}) {
  const name = castDisplayName(member);
  const hasProfile = member.enableProfile && !!member.slug;
  const motionProps = {
    initial: reduce ? false : ({ opacity: 0, y: 16 } as const),
    whileInView: reduce ? undefined : ({ opacity: 1, y: 0 } as const),
    viewport: { once: true, margin: "-40px" as const },
    transition: { duration: 0.45, delay: Math.min(index * 0.04, 0.35) },
  };

  if (hasProfile) {
    return (
      <motion.li {...motionProps} className="min-w-0 list-none">
        <Link
          href={`/sessions/cast/${member.slug}`}
          className={CARD_SURFACE}
          aria-label={`View ${name} profile`}
        >
          <CastCardFace member={member} />
        </Link>
      </motion.li>
    );
  }

  return (
    <motion.li {...motionProps} className="min-w-0 list-none">
      <button
        type="button"
        onClick={() => onQuickLook(member)}
        className={CARD_SURFACE}
        aria-label={`Quick look at ${name}`}
      >
        <CastCardFace member={member} />
      </button>
    </motion.li>
  );
}

export function VolumeCast({
  members,
  appearances,
  volumeNumber,
}: {
  members: CastMemberDTO[];
  appearances: Record<string, CastAppearance[]>;
  volumeNumber: number;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<CastMemberDTO | null>(null);

  const castMembers = useMemo(() => dedupeCastMembers(members), [members]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active]);

  if (castMembers.length === 0) return null;

  return (
    <section className="section-padding overflow-x-clip border-b border-stone/30">
      <div className="container-wide min-w-0">
        <header className="mb-8 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <p className="label-caps text-accent">Official Cast</p>
            <h2 className="headline-md mt-2 text-balance">The Ensemble</h2>
          </div>
          <p className="shrink-0 text-sm text-muted">
            {castMembers.length} creative{castMembers.length > 1 ? "s" : ""} · Vol. {volumeNumber}
          </p>
        </header>

        <ul
          className="grid min-w-0 grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          role="list"
        >
          {castMembers.map((member, index) => (
            <CastGridCard
              key={member.id}
              member={member}
              index={index}
              reduce={!!reduce}
              onQuickLook={setActive}
            />
          ))}
        </ul>
      </div>

      <AnimatePresence>
        {active && (
          <motion.div
            className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-ink/90 p-4 backdrop-blur-sm sm:items-center sm:p-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActive(null)}
          >
            <motion.div
              className="relative my-auto w-full max-w-4xl border border-stone/40 bg-ink-soft"
              initial={reduce ? false : { opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.35 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label="Close profile"
                className="absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-stone/50 bg-ink/60 text-fog hover:text-cream"
              >
                ✕
              </button>

              <div className="grid gap-0 md:grid-cols-2">
                <div className="relative aspect-[3/4] bg-charcoal md:aspect-auto md:min-h-[28rem]">
                  <CastCardPhoto src={active.profilePhoto} alt={castDisplayName(active)} />
                </div>

                <div className="max-h-[80vh] overflow-y-auto p-6 sm:p-8">
                  <p className="label-caps text-accent">{CAST_ROLE_LABELS[active.role]}</p>
                  <h3 className="mt-2 font-display text-2xl break-words text-cream sm:text-3xl">
                    {castDisplayName(active)}
                  </h3>
                  {active.city && <p className="mt-1 text-sm text-muted">{active.city}</p>}
                  {active.enableProfile && active.slug && (
                    <Link
                      href={`/sessions/cast/${active.slug}`}
                      className="mt-3 inline-flex min-h-11 items-center text-xs tracking-[0.12em] text-accent uppercase hover:text-cream"
                    >
                      View full profile →
                    </Link>
                  )}

                  {active.bio && (
                    <p className="mt-5 text-sm leading-relaxed break-words text-fog">{active.bio}</p>
                  )}

                  {(active.instagram || active.tiktok || active.website || active.portfolioLink) && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      <SocialLink href={instagramUrl(active.instagram)} label="Instagram" />
                      <SocialLink href={tiktokUrl(active.tiktok)} label="TikTok" />
                      <SocialLink href={ensureHttp(active.website)} label="Website" />
                      <SocialLink href={ensureHttp(active.portfolioLink)} label="Portfolio" />
                    </div>
                  )}

                  {active.awards.length > 0 && (
                    <div className="mt-7">
                      <p className="label-caps mb-3 text-fog">Awards</p>
                      <ul className="space-y-3">
                        {active.awards.map((a, i) => (
                          <li key={`${a.name}-${a.year}-${i}`} className="flex gap-3">
                            <SessionIcon name={awardIcon(a.icon)} className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                            <div className="min-w-0">
                              <p className="text-sm break-words text-cream">
                                {a.name}
                                {a.year && <span className="text-muted"> · {a.year}</span>}
                              </p>
                              {(a.category || a.volume) && (
                                <p className="text-xs break-words text-muted">
                                  {[a.category, a.volume].filter(Boolean).join(" · ")}
                                </p>
                              )}
                              {a.reason && <p className="mt-0.5 text-xs break-words text-fog">{a.reason}</p>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {active.additionalPhotos.length > 0 && (
                    <div className="mt-7">
                      <p className="label-caps mb-3 text-fog">Gallery</p>
                      <div className="grid grid-cols-3 gap-2">
                        {active.additionalPhotos.map((src, i) => (
                          <div key={`${src}-${i}`} className="relative aspect-square overflow-hidden bg-charcoal">
                            <Image
                              src={src}
                              alt={`${castDisplayName(active)} — ${i + 1}`}
                              fill
                              className="object-cover"
                              sizes="120px"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(appearances[active.slug]?.length ?? 0) > 0 && (
                    <div className="mt-7">
                      <p className="label-caps mb-3 text-fog">Other Volumes</p>
                      <div className="flex flex-wrap gap-2">
                        {appearances[active.slug].map((app) => (
                          <Link
                            key={app.slug}
                            href={`/sessions/${app.slug}`}
                            className="inline-flex min-h-11 max-w-full items-center rounded-full border border-stone/40 px-4 py-1 text-xs break-words text-cream transition-colors hover:border-accent hover:text-accent"
                          >
                            Vol. {app.volumeNumber} — {app.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {active.futureCollaborations && (
                    <div className="mt-7">
                      <p className="label-caps mb-2 text-fog">Future Projects</p>
                      <p className="text-sm break-words text-fog">{active.futureCollaborations}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
