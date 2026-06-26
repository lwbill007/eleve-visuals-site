"use client";

import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { MediaImage } from "./MediaImage";

interface SectionHeaderProps {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  headline,
  subheadline,
  align = "left",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-12 md:mb-16",
        align === "center" && "mx-auto max-w-2xl text-center",
        className
      )}
    >
      {eyebrow && (
        <>
          <p className="label-caps mb-4">{eyebrow}</p>
          <div className={cn("line-accent mb-6", align === "center" && "mx-auto")} />
        </>
      )}
      <h2 className="headline-lg text-balance">{headline}</h2>
      {subheadline && <p className="body-lg mt-5 text-balance">{subheadline}</p>}
    </div>
  );
}

interface PageHeroProps {
  eyebrow?: string;
  headline: string;
  subheadline?: string;
  image?: string | null;
  imageAlt?: string;
  compact?: boolean;
}

export function PageHero({
  eyebrow,
  headline,
  subheadline,
  image,
  imageAlt,
  compact,
}: PageHeroProps) {
  if (image) {
    return (
      <section className="relative flex min-h-[50vh] items-end md:min-h-[60vh]">
        <MediaImage
          src={image}
          alt={imageAlt || headline}
          className="absolute inset-0"
          overlay
          priority
        />
        <div className="grain relative z-10 w-full section-padding pb-12 md:pb-16">
          <div className="container-wide">
            {eyebrow && <p className="label-caps mb-4 text-fog">{eyebrow}</p>}
            <h1 className="headline-xl max-w-4xl">{headline}</h1>
            {subheadline && <p className="body-lg mt-5 max-w-xl">{subheadline}</p>}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "border-b border-stone/30 px-5 pt-28 md:px-8 md:pt-36 lg:px-12 lg:pt-40",
        compact ? "pb-12 md:pb-16" : "pb-16 md:pb-24"
      )}
    >
      <div className="container-wide">
        {eyebrow && (
          <>
            <p className="label-caps mb-4">{eyebrow}</p>
            <div className="line-accent mb-6" />
          </>
        )}
        <h1 className="headline-xl max-w-4xl">{headline}</h1>
        {subheadline && <p className="body-lg mt-5 max-w-2xl">{subheadline}</p>}
      </div>
    </section>
  );
}

interface CTABannerProps {
  headline: string;
  subheadline?: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function CTABanner({
  headline,
  subheadline,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: CTABannerProps) {
  return (
    <section className="section-padding border-t border-stone/30 bg-ink-soft">
      <div className="container-wide text-center">
        <h2 className="headline-md mx-auto max-w-2xl text-balance">{headline}</h2>
        {subheadline && <p className="body-lg mx-auto mt-4 max-w-lg">{subheadline}</p>}
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button variant="primary" href={primaryHref}>
            {primaryLabel}
          </Button>
          {secondaryLabel && secondaryHref && (
            <Button variant="secondary" href={secondaryHref}>
              {secondaryLabel}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

export { MediaImage as CinematicImage };
