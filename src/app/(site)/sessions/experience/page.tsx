import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/ui/Section";
import { getAllSessionVolumes } from "@/lib/session-volumes";
import { buildPageMetadata } from "@/lib/seo/page-metadata";
import {
  VOL_ALWAYS_INCLUDED,
  VOL_FINISHING_LEVELS,
  VOL_NEVER_INCLUDED,
  volPolicies,
  VOL_TIERS,
  formatVolPrice,
  offeredVolTiers,
  volComparisonRows,
} from "@/lib/vol-tiers";
import type { SessionVolumeDTO } from "@/lib/types";

export const revalidate = 60;

/** Hidden until at least one public volume switches tiers on in admin. */
async function getTierVolume(): Promise<SessionVolumeDTO | null> {
  const volumes = await getAllSessionVolumes();
  const withTiers = volumes.filter((v) => v.applicationSettings.tiersEnabled);
  return (
    withTiers.find((v) => v.status === "applications_open") ??
    withTiers.sort((a, b) => b.volumeNumber - a.volumeNumber)[0] ??
    null
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const [volume, base] = await Promise.all([
    getTierVolume(),
    buildPageMetadata({
      title: "ÉLEVÉ VOL. Portrait Experiences",
      description:
        "Ways to take part in an ÉLEVÉ VOL. production, from free creative participation to the complete editorial experience. Selection always comes first.",
      path: "/sessions/experience",
    }),
  ]);
  return volume ? base : { ...base, robots: { index: false, follow: false } };
}

export default async function VolExperiencePage() {
  const volume = await getTierVolume();
  if (!volume) notFound();

  const tiers = offeredVolTiers(volume.applicationSettings.tiersOffered);
  const rows = volComparisonRows(tiers);
  const applyOpen = volume.status === "applications_open";

  return (
    <>
      <PageHero
        eyebrow={`ÉLEVÉ VOL. · Vol. ${volume.volumeNumber} — ${volume.title}`}
        headline="Portrait Experiences"
        subheadline="Everyone applies free and is cast on the concept alone. If you're selected, choose how much of the production you take home."
        compact
      />

      <section className="section-padding bg-ink" aria-labelledby="tiers-title">
        <div className="container-wide">
          <h2 id="tiers-title" className="sr-only">
            Experiences
          </h2>
          <ul className="grid gap-px border border-stone/30 bg-stone/30 sm:grid-cols-2 lg:grid-cols-5">
            {tiers.map((tier) => (
              <li key={tier.id} className="flex flex-col bg-ink p-6">
                <p className="text-[0.6rem] tracking-[0.28em] text-fog uppercase">
                  {String(VOL_TIERS.indexOf(tier) + 1).padStart(2, "0")} · {tier.tagline}
                </p>
                <h3 className="mt-4 font-display text-3xl text-cream">{tier.name}</h3>
                <p className="mt-2 text-2xl text-cream">{formatVolPrice(tier.price)}</p>
                <dl className="mt-6 space-y-1.5 border-t border-stone/30 pt-4 text-sm">
                  {[
                    ["Edited photos", tier.finalPhotos],
                    ["Retouched", tier.cleanRetouches + tier.signatureRetouches],
                    ["Delivery (business days)", tier.deliveryBusinessDays],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-3">
                      <dt className="text-[0.6rem] tracking-[0.16em] text-muted uppercase">{label}</dt>
                      <dd className="text-cream">{value}</dd>
                    </div>
                  ))}
                </dl>
                <ul className="mt-6 flex-1 space-y-2 text-sm leading-relaxed text-fog">
                  <li>{tier.onSet}</li>
                  {tier.signatureRetouches > 0 && (
                    <li>
                      {tier.signatureRetouches} signature retouch{tier.signatureRetouches > 1 ? "es" : ""}
                    </li>
                  )}
                  {tier.layouts > 0 && (
                    <li>
                      {tier.layouts} editorial layout{tier.layouts > 1 ? "s" : ""}
                    </li>
                  )}
                  {tier.prints > 0 && <li>One 8×10 print</li>}
                  {tier.correctionRequests > 0 && <li>One consolidated correction request</li>}
                  {tier.priority && <li>Priority editing</li>}
                  {tier.maxLooks > 1 && <li>Up to {tier.maxLooks} looks, when the production allows</li>}
                </ul>
              </li>
            ))}
          </ul>

          <div className="mt-16 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <caption className="mb-4 text-left text-xs tracking-[0.2em] text-fog uppercase">Full comparison</caption>
              <thead>
                <tr className="border-b border-stone/40">
                  <th scope="col" className="py-3 pr-4 font-normal text-muted">
                    &nbsp;
                  </th>
                  {tiers.map((tier) => (
                    <th key={tier.id} scope="col" className="px-3 py-3 font-normal text-cream">
                      {tier.name}
                      <span className="block text-xs text-fog">{formatVolPrice(tier.price)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-b border-stone/20">
                    <th scope="row" className="py-3 pr-4 font-normal text-fog">
                      {row.label}
                    </th>
                    {row.values.map((value, i) => (
                      <td key={tiers[i].id} className="px-3 py-3 text-cream">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section-padding border-t border-stone/30 bg-ink" aria-labelledby="finishing-title">
        <div className="container-wide grid gap-12 md:grid-cols-2">
          <div>
            <h2 id="finishing-title" className="headline-md">
              Finishing levels
            </h2>
            <dl className="mt-8 space-y-5">
              {VOL_FINISHING_LEVELS.map((level) => (
                <div key={level.name}>
                  <dt className="text-xs tracking-[0.2em] text-cream uppercase">{level.name}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-fog">{level.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="space-y-10">
            <div>
              <h2 className="headline-md">Every experience includes</h2>
              <ul className="mt-6 space-y-2 text-sm leading-relaxed text-fog">
                {VOL_ALWAYS_INCLUDED.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="headline-md">No experience includes</h2>
              <ul className="mt-6 space-y-2 text-sm leading-relaxed text-fog">
                {VOL_NEVER_INCLUDED.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding border-t border-stone/30 bg-ink" aria-labelledby="policies-title">
        <div className="container-narrow">
          <h2 id="policies-title" className="headline-md">
            How it works
          </h2>
          <dl className="mt-8 space-y-6">
            {volPolicies(volume.applicationSettings.paymentDeadlineHours).map((policy) => (
              <div key={policy.title}>
                <dt className="text-xs tracking-[0.2em] text-cream uppercase">{policy.title}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-fog">{policy.body}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-10 text-sm leading-relaxed text-fog">
            Photographers, stylists, makeup artists and other collaborators don&apos;t choose an experience. They take
            part under a collaborator agreement with credits and role-specific deliverables.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            {applyOpen ? (
              <Link
                href={`/sessions/${volume.slug}/apply`}
                className="inline-flex min-h-12 items-center justify-center bg-cream px-8 text-xs tracking-[0.15em] text-ink uppercase"
              >
                Apply free for Vol. {volume.volumeNumber}
              </Link>
            ) : null}
            <Link
              href={`/sessions/${volume.slug}`}
              className="inline-flex min-h-12 items-center justify-center border border-stone/50 px-8 text-xs tracking-[0.15em] text-fog uppercase hover:text-cream"
            >
              About {volume.title}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
