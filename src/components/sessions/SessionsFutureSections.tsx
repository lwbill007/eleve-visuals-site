"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { SessionIcon, type SessionIconName } from "./SessionIcon";

/**
 * Future-ready, componentized sections for the ÉLEVÉ Sessions experience.
 * Each sub-section renders nothing until content is supplied, so the page
 * stays clean today and these can be wired to real data later without
 * touching the layout.
 */

export interface AlumniProfile {
  name: string;
  role: string;
  image?: string | null;
  volume?: string;
}

export interface VaultItem {
  title: string;
  image?: string | null;
  href?: string;
  meta?: string;
}

export interface AwardItem {
  title: string;
  org?: string;
  year?: string;
}

export interface SessionsFutureContent {
  alumni?: AlumniProfile[];
  vault?: VaultItem[];
  awards?: AwardItem[];
  participants?: AlumniProfile[];
}

function FutureHeader({
  eyebrow,
  headline,
  icon,
}: {
  eyebrow: string;
  headline: string;
  icon: SessionIconName;
}) {
  return (
    <div className="mb-12 flex items-start gap-4">
      <SessionIcon name={icon} className="mt-1 h-6 w-6 text-accent" />
      <div>
        <p className="label-caps mb-2 text-accent">{eyebrow}</p>
        <h2 className="headline-md">{headline}</h2>
      </div>
    </div>
  );
}

function profileGrid(profiles: AlumniProfile[]) {
  return (
    <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
      {profiles.map((p, i) => (
        <motion.figure
          key={`${p.name}-${i}`}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: (i % 4) * 0.06 }}
          className="group"
        >
          <div className="relative aspect-[3/4] overflow-hidden bg-charcoal">
            {p.image ? (
              <Image
                src={p.image}
                alt={p.name}
                fill
                loading="lazy"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
            )}
          </div>
          <figcaption className="mt-3">
            <p className="text-sm text-cream">{p.name}</p>
            <p className="text-xs text-fog">{p.role}</p>
            {p.volume && <p className="mt-0.5 text-[0.65rem] tracking-wide text-muted">{p.volume}</p>}
          </figcaption>
        </motion.figure>
      ))}
    </div>
  );
}

export function SessionsFutureSections({ content }: { content?: SessionsFutureContent }) {
  const { alumni = [], vault = [], awards = [], participants = [] } = content ?? {};

  if (!alumni.length && !vault.length && !awards.length && !participants.length) {
    return null;
  }

  return (
    <>
      {alumni.length > 0 && (
        <section className="section-padding border-b border-stone/30">
          <div className="container-wide">
            <FutureHeader eyebrow="The Circle" headline="Alumni" icon="users" />
            {profileGrid(alumni)}
          </div>
        </section>
      )}

      {vault.length > 0 && (
        <section className="section-padding border-b border-stone/30 bg-ink-soft">
          <div className="container-wide">
            <FutureHeader eyebrow="Archive Access" headline="The Vault" icon="vault" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {vault.map((item, i) => {
                const inner = (
                  <div className="group relative aspect-square overflow-hidden bg-charcoal">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        loading="lazy"
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink to-transparent p-4">
                      <p className="text-sm text-cream">{item.title}</p>
                      {item.meta && <p className="text-xs text-fog">{item.meta}</p>}
                    </div>
                  </div>
                );
                return item.href ? (
                  <Link key={`${item.title}-${i}`} href={item.href}>
                    {inner}
                  </Link>
                ) : (
                  <div key={`${item.title}-${i}`}>{inner}</div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {awards.length > 0 && (
        <section className="section-padding border-b border-stone/30">
          <div className="container-wide">
            <FutureHeader eyebrow="Recognition" headline="Awards" icon="award" />
            <ul className="divide-y divide-stone/30 border-y border-stone/30">
              {awards.map((a, i) => (
                <li key={`${a.title}-${i}`} className="flex items-baseline justify-between gap-6 py-5">
                  <span className="text-sm text-cream md:text-base">{a.title}</span>
                  <span className="shrink-0 text-xs tracking-wide text-fog">
                    {[a.org, a.year].filter(Boolean).join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {participants.length > 0 && (
        <section className="section-padding border-b border-stone/30 bg-ink-soft">
          <div className="container-wide">
            <FutureHeader eyebrow="The Cast" headline="Participant Profiles" icon="star" />
            {profileGrid(participants)}
          </div>
        </section>
      )}
    </>
  );
}
