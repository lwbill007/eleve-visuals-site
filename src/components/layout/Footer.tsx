import Link from "next/link";
import { NAVIGATION } from "@/lib/types";
import type { NavigationConfig, SiteConfig } from "@/lib/types";

interface FooterProps {
  siteConfig: SiteConfig;
  navigation?: NavigationConfig;
}

export function Footer({ siteConfig, navigation }: FooterProps) {
  const year = new Date().getFullYear();
  const footerLinks = navigation?.footerLinks?.length
    ? navigation.footerLinks
    : NAVIGATION;
  const footerText = navigation?.footerText || siteConfig.tagline;
  const copyright = siteConfig.copyrightText || `© ${year} ${siteConfig.name}. All rights reserved.`;

  return (
    <footer className="border-t border-stone/30 bg-ink-soft">
      <div className="section-padding pb-10">
        <div className="container-wide">
          <div className="grid gap-12 md:grid-cols-12 md:gap-8">
            <div className="md:col-span-5">
              <Link href="/" className="font-display text-2xl text-cream">
                ÉLEVÉ
                <span className="ml-1 text-xs font-body tracking-[0.3em] text-fog uppercase">
                  Visuals
                </span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-fog">{footerText}</p>
              <p className="mt-3 text-xs tracking-wide text-muted uppercase">
                {siteConfig.location}
              </p>
            </div>

            <div className="md:col-span-3">
              <p className="label-caps mb-4">Navigate</p>
              <ul className="space-y-1">
                {footerLinks.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="inline-flex min-h-11 items-center text-sm text-fog transition-colors hover:text-cream"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/book"
                    className="inline-flex min-h-11 items-center text-sm text-fog transition-colors hover:text-cream"
                  >
                    Book a Shoot
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4">
              <p className="label-caps mb-4">Connect</p>
              <ul className="space-y-1">
                <li>
                  <a
                    href={`mailto:${siteConfig.email}`}
                    className="inline-flex min-h-11 items-center text-sm text-fog transition-colors hover:text-cream break-all"
                  >
                    {siteConfig.email}
                  </a>
                </li>
                <li>
                  <a
                    href={siteConfig.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-sm text-fog transition-colors hover:text-cream"
                  >
                    @{siteConfig.instagram}
                  </a>
                </li>
              </ul>

              <div className="mt-8 border border-stone/40 p-5">
                <p className="text-sm text-cream-dim">Ready to start a project?</p>
                <Link
                  href="/book"
                  className="mt-2 inline-flex min-h-11 items-center text-xs tracking-[0.2em] text-accent uppercase link-underline"
                >
                  Request a booking →
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-stone/20 pt-8 md:flex-row md:items-center">
            <p className="text-xs text-muted">{copyright}</p>
            <p className="text-xs text-muted">
              Photography & film by {siteConfig.creator}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
