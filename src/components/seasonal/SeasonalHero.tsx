import { getImageProps } from "next/image";
import type { SeasonalCampaign } from "@/lib/seasonal/schema";
import { SeasonalCtaLink } from "./SeasonalCtaLink";
import { seasonStyle, splitHeadline } from "./style";

/**
 * Campaign hero. Typographic by default (no imagery required); when approved
 * images are set in admin it art-directs a desktop and a mobile crop.
 */
export function SeasonalHero({
  campaign,
  placement,
  showAnnouncement = false,
}: {
  campaign: SeasonalCampaign;
  placement: "home" | "landing";
  /** Render the campaign announcement inside the hero, clear of the fixed header. */
  showAnnouncement?: boolean;
}) {
  const desktop = campaign.heroImageDesktop;
  const mobile = campaign.heroImageMobile ?? desktop;
  const hasImage = Boolean(desktop || mobile);
  const alt = campaign.heroImageAlt || "";
  const [lineOne, lineTwo] = splitHeadline(campaign.headline);
  const trackPrefix = placement === "home" ? "seasonal_hero" : "seasonal_landing_hero";
  const announcement =
    showAnnouncement && campaign.announcement.enabled && campaign.announcement.text.trim()
      ? campaign.announcement
      : null;
  const announcementClass =
    "season-rise mb-10 inline-flex max-w-full items-center gap-3 border border-[color-mix(in_srgb,var(--season-gold)_45%,transparent)] px-4 py-2 text-[0.6rem] tracking-[0.22em] uppercase text-[color-mix(in_srgb,var(--season-cream)_85%,transparent)] md:text-[0.66rem]";

  let picture: React.ReactNode = null;
  if (hasImage) {
    const common = { alt, fill: true, priority: true, quality: 82 } as const;
    const desktopProps = desktop
      ? getImageProps({ ...common, src: desktop, sizes: "(min-width: 768px) 60vw, 100vw" }).props
      : null;
    const mobileProps = mobile ? getImageProps({ ...common, src: mobile, sizes: "100vw" }).props : null;
    const fallback = desktopProps ?? mobileProps!;
    picture = (
      <picture>
        {desktopProps ? <source media="(min-width: 768px)" srcSet={desktopProps.srcSet} sizes={desktopProps.sizes} /> : null}
        {mobileProps ? <source srcSet={mobileProps.srcSet} sizes={mobileProps.sizes} /> : null}
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img {...fallback} className="h-full w-full object-cover object-center saturate-[0.85]" />
      </picture>
    );
  }

  return (
    <section
      data-season={campaign.id}
      style={seasonStyle(campaign)}
      aria-labelledby={`${campaign.id}-hero-title`}
      className="grain relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[var(--season-onyx)] text-[var(--season-cream)]"
    >
      <div className="season-glow pointer-events-none absolute inset-0 -z-10" aria-hidden />

      {hasImage ? (
        <div
          className="absolute inset-x-0 top-0 -z-10 h-[62svh] overflow-hidden md:inset-y-0 md:left-auto md:h-auto md:w-[58%]"
          aria-hidden={alt ? undefined : true}
        >
          {picture}
          {campaign.heroVideo ? (
            <video
              src={campaign.heroVideo}
              poster={desktop ?? undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-hidden
              className="absolute inset-0 h-full w-full object-cover saturate-[0.85] motion-reduce:hidden"
            />
          ) : null}
          <div
            className="absolute inset-0 bg-gradient-to-t from-[var(--season-onyx)] via-[color-mix(in_srgb,var(--season-onyx)_35%,transparent)] to-transparent md:bg-gradient-to-r md:via-[color-mix(in_srgb,var(--season-onyx)_20%,transparent)]"
            aria-hidden
          />
        </div>
      ) : null}

      <div
        className={
          "relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 pb-14 md:justify-center md:px-8 md:pb-24 lg:px-12 " +
          (hasImage ? "justify-end pt-[52svh] md:pt-32" : "justify-center pt-28 md:pt-32")
        }
      >
        <div className={hasImage ? "max-w-xl" : "max-w-4xl"}>
          {announcement ? (
            announcement.href ? (
              <SeasonalCtaLink
                href={announcement.href}
                campaign={campaign.trackingId}
                label="seasonal_announcement"
                className={`${announcementClass} transition-colors duration-500 hover:border-[var(--season-gold)] hover:text-[var(--season-gold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--season-gold)]`}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--season-gold)]" aria-hidden />
                <span>{announcement.text}</span>
              </SeasonalCtaLink>
            ) : (
              <p className={announcementClass}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--season-gold)]" aria-hidden />
                <span>{announcement.text}</span>
              </p>
            )
          ) : null}
          <p className="season-rise flex items-center gap-4 text-[0.62rem] tracking-[0.34em] uppercase text-[var(--season-gold)] md:text-[0.7rem]">
            <span className="font-display text-sm tracking-[0.2em] text-[var(--season-cream)] normal-case md:text-base">ÉLEVÉ</span>
            <span className="season-rule h-px w-10 md:w-16" aria-hidden />
            <span>{campaign.subtitle || campaign.name}</span>
          </p>

          <h1
            id={`${campaign.id}-hero-title`}
            className="season-rise mt-8 font-display leading-[0.92] tracking-[-0.01em] [animation-delay:120ms]"
            style={{ fontSize: "clamp(3rem, min(9.5vw, 15svh), 8.75rem)" }}
          >
            <span className="block">{lineOne}</span>
            {lineTwo ? <span className="block italic text-[var(--season-gold)]">{lineTwo}</span> : null}
          </h1>

          {campaign.description ? (
            <p className="season-rise mt-8 max-w-lg text-base leading-relaxed text-[color-mix(in_srgb,var(--season-cream)_82%,transparent)] [animation-delay:240ms] md:text-lg">
              {campaign.description}
            </p>
          ) : null}

          <div className="season-rise mt-10 flex flex-col gap-3 [animation-delay:360ms] sm:flex-row sm:flex-wrap">
            <SeasonalCtaLink
              href={campaign.primaryCta.href}
              campaign={campaign.trackingId}
              label={`${trackPrefix}_primary`}
              className="inline-flex min-h-12 items-center justify-center bg-[var(--season-gold)] px-8 text-[0.68rem] font-medium tracking-[0.24em] text-[var(--season-onyx)] uppercase transition-colors duration-500 hover:bg-[var(--season-cream)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--season-gold)]"
            >
              {campaign.primaryCta.label}
            </SeasonalCtaLink>
            <SeasonalCtaLink
              href={campaign.secondaryCta.href}
              campaign={campaign.trackingId}
              label={`${trackPrefix}_secondary`}
              className="inline-flex min-h-12 items-center justify-center border border-[color-mix(in_srgb,var(--season-cream)_40%,transparent)] px-8 text-[0.68rem] font-medium tracking-[0.24em] uppercase transition-colors duration-500 hover:border-[var(--season-gold)] hover:text-[var(--season-gold)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--season-gold)]"
            >
              {campaign.secondaryCta.label}
            </SeasonalCtaLink>
          </div>
        </div>

        <div className="season-rise mt-14 flex items-end justify-between gap-6 border-t border-[color-mix(in_srgb,var(--season-cream)_14%,transparent)] pt-5 text-[0.62rem] tracking-[0.28em] uppercase text-[color-mix(in_srgb,var(--season-cream)_62%,transparent)] [animation-delay:480ms]">
          <span>{campaign.secondaryLine}</span>
          <span className="hidden text-right sm:block">Visuals that move with intention.</span>
        </div>
      </div>
    </section>
  );
}
