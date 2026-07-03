"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { CAST_CREDIT_HEADINGS, castDisplayName } from "@/lib/cast";
import { CAST_ROLES, type CastMemberDTO, type CastRole } from "@/lib/types";

export function VolumeCredits({
  members,
  volumeNumber,
  title,
}: {
  members: CastMemberDTO[];
  volumeNumber: number;
  title: string;
}) {
  const reduce = useReducedMotion();

  if (members.length === 0) return null;

  const grouped = CAST_ROLES.map((role) => ({
    role,
    heading: CAST_CREDIT_HEADINGS[role],
    people: members.filter((m) => m.role === role),
  })).filter((g) => g.people.length > 0) as {
    role: CastRole;
    heading: string;
    people: CastMemberDTO[];
  }[];

  return (
    <section className="section-padding overflow-hidden border-b border-stone/30 bg-ink">
      <div className="container-narrow text-center">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <p className="label-caps text-accent">ÉLEVÉ Sessions</p>
          <h2 className="mt-3 font-display text-3xl text-cream sm:text-4xl">
            Vol. {volumeNumber}
          </h2>
          <p className="mt-2 font-display text-xl text-cream-dim sm:text-2xl">{title}</p>
          <div className="mx-auto mt-8 h-px w-16 bg-accent/60" />
        </motion.div>

        <div className="mx-auto mt-14 max-w-md space-y-12 sm:space-y-14">
          {grouped.map((group, gi) => (
            <motion.div
              key={group.role}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: Math.min(gi * 0.06, 0.3) }}
            >
              <p className="text-[0.65rem] tracking-[0.45em] text-fog uppercase">{group.heading}</p>
              <ul className="mt-4 space-y-2">
                {group.people.map((person) => (
                  <li key={person.id} className="font-display text-2xl leading-snug text-cream sm:text-[1.65rem]">
                    {person.enableProfile && person.slug ? (
                      <Link
                        href={`/sessions/cast/${person.slug}`}
                        className="break-words transition-colors hover:text-accent"
                      >
                        {castDisplayName(person)}
                      </Link>
                    ) : (
                      <span className="break-words">{castDisplayName(person)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          whileInView={reduce ? undefined : { opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="mt-16 text-[0.6rem] tracking-[0.5em] text-muted uppercase"
        >
          The End
        </motion.p>
      </div>
    </section>
  );
}
