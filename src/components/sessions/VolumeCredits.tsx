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
    <section className="section-padding border-b border-stone/30 bg-ink">
      <div className="container-narrow text-center">
        <p className="label-caps text-accent">ÉLEVÉ Sessions</p>
        <h2 className="headline-md mt-2 mb-3">Vol. {volumeNumber} — {title}</h2>
        <p className="mb-14 text-sm tracking-[0.15em] text-muted uppercase">Full Credits</p>

        <div className="mx-auto max-w-lg space-y-10">
          {grouped.map((group) => (
            <div key={group.role}>
              <p className="text-[0.7rem] tracking-[0.3em] text-fog uppercase">{group.heading}</p>
              <ul className="mt-3 space-y-1">
                {group.people.map((person) => (
                  <li key={person.id} className="font-display text-xl text-cream">
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
