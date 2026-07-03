import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getAlumniDirectory } from "@/lib/cast-server";
import { SessionIcon } from "@/components/sessions/SessionIcon";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Alumni — ÉLEVÉ Sessions",
  description:
    "The growing creative network behind ÉLEVÉ Sessions — photographers, models, stylists, and artists cast across every Volume.",
};

export default async function AlumniPage() {
  const alumni = await getAlumniDirectory();

  return (
    <>
      <section className="relative section-padding pt-32 pb-16">
        <div className="container-wide">
          <p className="label-caps text-accent">The Network</p>
          <h1 className="headline-xl mt-3 max-w-3xl">ÉLEVÉ Alumni</h1>
          <p className="body-lg mt-5 max-w-2xl text-fog">
            Every creative cast into a Volume becomes part of the ÉLEVÉ circle — a growing roster of
            photographers, models, stylists, and artists who keep building together.
          </p>
        </div>
      </section>

      <section className="section-padding pt-0">
        <div className="container-wide">
          {alumni.length === 0 ? (
            <div className="border border-stone/40 bg-charcoal/20 p-10 text-center">
              <SessionIcon name="users" className="mx-auto h-10 w-10 text-stone" />
              <p className="mt-4 font-display text-2xl text-cream-dim">The roster is being assembled.</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-fog">
                As each Volume wraps, its cast joins the alumni network here.
              </p>
              <Link
                href="/sessions"
                className="mt-6 inline-block border border-cream/40 px-6 py-3 text-xs tracking-[0.15em] text-cream uppercase hover:border-accent hover:text-accent"
              >
                Explore the Volumes
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {alumni.map((person) => {
                const card = (
                  <div className="group relative aspect-[3/4] overflow-hidden bg-charcoal">
                    {person.image ? (
                      <Image
                        src={person.image}
                        alt={person.name}
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
                    {person.featured && (
                      <span className="absolute top-3 left-3 rounded-full bg-accent/90 px-2 py-0.5 text-[0.6rem] font-medium tracking-[0.12em] text-ink uppercase">
                        Featured
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="line-clamp-2 font-display text-lg leading-tight break-words text-cream">{person.name}</p>
                      <p className="line-clamp-1 text-[0.7rem] tracking-[0.12em] text-accent uppercase">{person.role}</p>
                      <p className="mt-1 line-clamp-1 text-[0.65rem] tracking-wide break-words text-muted">{person.volumes.join(" · ")}</p>
                      {person.profileEnabled && (
                        <p className="mt-2 text-xs text-fog sm:opacity-80">
                          View profile →
                        </p>
                      )}
                    </div>
                  </div>
                );

                return person.profileEnabled && person.slug ? (
                  <Link key={person.slug} href={`/sessions/cast/${person.slug}`} className="block">
                    {card}
                  </Link>
                ) : (
                  <div key={`${person.name}-${person.volumes.join()}`}>{card}</div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
