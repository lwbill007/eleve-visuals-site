import Link from "next/link";
import { SessionIcon, type SessionIconName } from "./SessionIcon";
import type { CastAward } from "@/lib/types";

export interface VolumeAwardEntry extends CastAward {
  winnerName: string;
  winnerSlug: string;
  winnerEnabled: boolean;
}

const AWARD_ICONS = new Set<SessionIconName>(["award", "star", "gem", "sparkle", "film", "camera", "tag"]);
function awardIcon(icon: string): SessionIconName {
  return AWARD_ICONS.has(icon as SessionIconName) ? (icon as SessionIconName) : "award";
}

export function VolumeAwards({ awards }: { awards: VolumeAwardEntry[] }) {
  if (awards.length === 0) return null;

  return (
    <section className="section-padding border-b border-stone/30 bg-ink-soft">
      <div className="container-wide">
        <div className="mb-10 text-center">
          <p className="label-caps text-accent">Recognition</p>
          <h2 className="headline-md mt-2">Awards & Honors</h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {awards.map((award, i) => (
            <div key={i} className="group border border-stone/40 bg-charcoal/30 p-7 transition-colors hover:border-accent/50">
              <SessionIcon name={awardIcon(award.icon)} className="h-8 w-8 text-accent" />
              <p className="mt-5 font-display text-xl text-cream">{award.name}</p>
              {(award.category || award.year) && (
                <p className="mt-1 text-xs tracking-[0.12em] text-muted uppercase">
                  {[award.category, award.year].filter(Boolean).join(" · ")}
                </p>
              )}
              {award.reason && <p className="mt-3 text-sm leading-relaxed text-fog">{award.reason}</p>}
              {award.winnerName && (
                <div className="mt-5 border-t border-stone/20 pt-4">
                  <p className="text-[0.65rem] tracking-[0.15em] text-muted uppercase">Awarded to</p>
                  {award.winnerEnabled && award.winnerSlug ? (
                    <Link href={`/sessions/cast/${award.winnerSlug}`} className="text-sm text-cream hover:text-accent">
                      {award.winnerName} →
                    </Link>
                  ) : (
                    <p className="text-sm text-cream">{award.winnerName}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
