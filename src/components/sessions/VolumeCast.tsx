"use client";

import { useEffect, useState } from "react";
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

  if (members.length === 0) return null;

  return (
    <section className="section-padding border-b border-stone/30">
      <div className="container-wide">
        <div className="mb-10 flex items-end justify-between gap-6">
          <div>
            <p className="label-caps text-accent">Official Cast</p>
            <h2 className="headline-md mt-2">The Ensemble</h2>
          </div>
          <p className="hidden text-sm text-muted sm:block">
            {members.length} creative{members.length > 1 ? "s" : ""} · Vol. {volumeNumber}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {members.map((m, i) => (
            <motion.button
              key={m.id}
              type="button"
              onClick={() => setActive(m)}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: Math.min(i * 0.05, 0.4) }}
              className="group relative aspect-[3/4] overflow-hidden bg-charcoal text-left"
            >
              {m.profilePhoto ? (
                <Image
                  src={m.profilePhoto}
                  alt={castDisplayName(m)}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <SessionIcon name="users" className="h-10 w-10 text-stone" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent opacity-90" />
              {m.featured && (
                <span className="absolute top-3 left-3 rounded-full bg-accent/90 px-2 py-0.5 text-[0.6rem] font-medium tracking-[0.12em] text-ink uppercase">
                  Featured
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="line-clamp-2 font-display text-lg leading-tight break-words text-cream">{castDisplayName(m)}</p>
                <p className="line-clamp-1 text-[0.7rem] tracking-[0.12em] text-accent uppercase">
                  {CAST_ROLE_LABELS[m.role]}
                </p>
                <p className="mt-2 max-h-0 overflow-hidden text-xs text-fog opacity-0 transition-all duration-500 group-hover:max-h-16 group-hover:opacity-100">
                  View profile →
                </p>
              </div>
            </motion.button>
          ))}
        </div>
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
                  {active.profilePhoto ? (
                    <Image
                      src={active.profilePhoto}
                      alt={castDisplayName(active)}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <SessionIcon name="users" className="h-14 w-14 text-stone" />
                    </div>
                  )}
                </div>

                <div className="max-h-[80vh] overflow-y-auto p-6 sm:p-8">
                  <p className="label-caps text-accent">{CAST_ROLE_LABELS[active.role]}</p>
                  <h3 className="mt-2 font-display text-3xl text-cream">{castDisplayName(active)}</h3>
                  {active.city && <p className="mt-1 text-sm text-muted">{active.city}</p>}
                  {active.enableProfile && (
                    <Link
                      href={`/sessions/cast/${active.slug}`}
                      className="mt-3 inline-block text-xs tracking-[0.12em] text-accent uppercase hover:text-cream"
                    >
                      View full profile →
                    </Link>
                  )}

                  {active.bio && <p className="mt-5 text-sm leading-relaxed text-fog">{active.bio}</p>}

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
                          <li key={i} className="flex gap-3">
                            <SessionIcon name={awardIcon(a.icon)} className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                            <div>
                              <p className="text-sm text-cream">
                                {a.name}
                                {a.year && <span className="text-muted"> · {a.year}</span>}
                              </p>
                              {(a.category || a.volume) && (
                                <p className="text-xs text-muted">
                                  {[a.category, a.volume].filter(Boolean).join(" · ")}
                                </p>
                              )}
                              {a.reason && <p className="mt-0.5 text-xs text-fog">{a.reason}</p>}
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
                            className="inline-flex min-h-11 items-center rounded-full border border-stone/40 px-4 py-1 text-xs text-cream transition-colors hover:border-accent hover:text-accent"
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
                      <p className="text-sm text-fog">{active.futureCollaborations}</p>
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
