import Link from "next/link";
import { VOLUME_INQUIRY_PATHS, volumeInquiryHref } from "@/lib/volume-inquiries";

/**
 * "Not applying as a creative?" Commercial routes for a volume, set apart
 * from the free creative application. Each opens the contact form, tagged with
 * the volume and the interest so it arrives labelled in the admin Inbox.
 */
export function VolumeCommercialPaths({
  slug,
  volumeLabel,
  tiersEnabled = false,
}: {
  slug: string;
  volumeLabel: string;
  /** Link to The Experience when this volume offers VOL. tiers. */
  tiersEnabled?: boolean;
}) {
  return (
    <section
      aria-labelledby={`${slug}-commercial-title`}
      className="section-padding border-t border-stone/30 bg-ink"
    >
      <div className="container-narrow">
        <p className="text-[0.65rem] tracking-[0.28em] text-fog uppercase">{volumeLabel}</p>
        <h2 id={`${slug}-commercial-title`} className="headline-md mt-4">
          Not applying as a creative?
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-fog">
          Applying as a creative is always free. Partnerships, advertising and paid sessions are handled
          separately, so a collaboration is never confused with a booking.
        </p>
        {tiersEnabled ? (
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-fog">
            Selected participants can choose how much of the production they take home, from free to the complete
            editorial experience. Paid only after acceptance.{" "}
            <Link href="/sessions/experience" className="text-cream underline underline-offset-4">
              See The Experience
            </Link>
          </p>
        ) : null}
        <ul className="mt-10 grid gap-px border border-stone/30 bg-stone/30 md:grid-cols-3">
          {VOLUME_INQUIRY_PATHS.map((path) => (
            <li key={path.interest} className="flex flex-col bg-ink p-6">
              <h3 className="text-xs tracking-[0.22em] text-cream uppercase">{path.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-fog">{path.description}</p>
              <Link
                href={volumeInquiryHref(slug, path.interest)}
                className="mt-6 inline-flex min-h-11 items-center text-[0.68rem] tracking-[0.2em] text-cream uppercase underline-offset-8 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
              >
                {path.cta} →
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
