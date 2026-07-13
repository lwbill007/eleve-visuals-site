import Image from "next/image";
import Link from "next/link";
import type { PortfolioItemDTO } from "@/lib/types";
import { resolvePortfolioHeroImage } from "@/lib/portfolio-utils";
import { GalleryMasonry } from "@/components/gallery/GalleryMasonry";
import { PortfolioVideoEmbed } from "./PortfolioVideoEmbed";

export function PortfolioDetailView({
  project,
  prev,
  next,
}: {
  project: PortfolioItemDTO;
  prev: PortfolioItemDTO | null;
  next: PortfolioItemDTO | null;
}) {
  const hero = resolvePortfolioHeroImage(project);
  const gallery = project.gallery.filter((src) => src !== hero);

  return (
    <>
      <section className="relative flex min-h-[75vh] items-end">
        {hero ? (
          <Image
            src={hero}
            alt={project.heroImageAlt || project.imageAlt || project.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
        )}
        <div className="cinematic-overlay absolute inset-0 bg-ink/75" />
        <div className="grain relative z-10 w-full section-padding pb-14 pt-28">
          <div className="container-wide">
            <Link href="/portfolio" className="label-caps mb-6 inline-block text-fog hover:text-cream">
              ← All Work
            </Link>
            <p className="label-caps text-accent">{project.category}</p>
            <h1 className="headline-xl mt-3 max-w-4xl">{project.title}</h1>
            {project.subtitle && (
              <p className="mt-4 max-w-2xl font-display text-2xl text-cream-dim md:text-3xl">
                {project.subtitle}
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-4 text-xs tracking-wide text-muted uppercase">
              {project.client && <span>{project.client}</span>}
              {project.year && <span>{project.year}</span>}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding border-b border-stone/30">
        <div className="container-wide grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="label-caps mb-4 text-fog">Overview</h2>
            <div className="space-y-5">
              {project.description.split("\n").filter(Boolean).map((p, i) => (
                <p key={i} className="body-lg text-fog">
                  {p}
                </p>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5">
            {project.deliverables.length > 0 && (
              <div className="border border-stone/40 p-8">
                <h2 className="label-caps mb-4">Deliverables</h2>
                <ul className="space-y-2 text-sm text-fog">
                  {project.deliverables.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-accent">—</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {project.relatedServices.length > 0 && (
              <div className="mt-6 border border-stone/40 p-8">
                <h2 className="label-caps mb-4">Related Services</h2>
                <ul className="space-y-2">
                  {project.relatedServices.map((service) => (
                    <li key={service}>
                      <Link href="/services" className="text-sm text-accent hover:text-cream">
                        {service}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </section>

      {project.creativeProcess && (
        <section className="section-padding border-b border-stone/30 bg-ink-soft">
          <div className="container-wide max-w-3xl">
            <h2 className="label-caps mb-6 text-fog">Creative Process</h2>
            <div className="space-y-5">
              {project.creativeProcess.split("\n").filter(Boolean).map((p, i) => (
                <p key={i} className="body-lg text-fog">
                  {p}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <GalleryMasonry
          items={gallery.map((src, i) => ({
            type: "image" as const,
            src,
            alt: `${project.title} — ${i + 1}`,
          }))}
          label="Gallery"
          columns="narrow"
        />
      )}

      {project.videos.length > 0 && (
        <section className="section-padding border-b border-stone/30">
          <div className="container-wide max-w-4xl space-y-6">
            <h2 className="label-caps text-fog">Film</h2>
            {project.videos.map((url) => (
              <PortfolioVideoEmbed key={url} url={url} />
            ))}
          </div>
        </section>
      )}

      {project.btsGallery.length > 0 && (
        <GalleryMasonry
          items={project.btsGallery.map((src, i) => ({
            type: "image" as const,
            src,
            alt: `${project.title} — behind the scenes ${i + 1}`,
          }))}
          label="Behind the Scenes"
          tone="soft"
          columns="standard"
        />
      )}

      {project.credits.length > 0 && (
        <section className="section-padding border-b border-stone/30">
          <div className="container-wide max-w-2xl">
            <h2 className="label-caps mb-6 text-fog">Credits</h2>
            <dl className="space-y-3">
              {project.credits.map((credit) => (
                <div key={`${credit.role}-${credit.name}`} className="flex justify-between gap-4 border-b border-stone/20 pb-3">
                  <dt className="text-xs tracking-wide text-muted uppercase">{credit.role}</dt>
                  <dd className="text-sm text-cream">{credit.name}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      <section className="section-padding border-b border-stone/30">
        <div className="container-wide max-w-3xl text-center">
          <p className="label-caps text-accent">Book this style</p>
          <h2 className="font-display mt-3 text-3xl text-cream md:text-4xl">
            Want work in this register?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-fog md:text-base">
            Share your vision — we&apos;ll confirm creative direction, investment, and timing in a
            personal reply within 1–2 business days.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/book"
              className="inline-flex min-h-12 items-center bg-cream px-8 text-xs tracking-[0.15em] text-ink uppercase"
            >
              Book Your Experience
            </Link>
            <Link
              href="/sessions"
              className="inline-flex min-h-12 items-center border border-stone/40 px-8 text-xs tracking-[0.15em] text-cream uppercase hover:border-cream/40"
            >
              Explore Sessions
            </Link>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-wide flex flex-col gap-6 border-t border-stone/30 pt-10 md:flex-row md:justify-between">
          {prev ? (
            <Link href={`/portfolio/${prev.slug}`} className="group max-w-sm">
              <p className="label-caps text-muted">Previous</p>
              <p className="mt-2 font-display text-xl text-cream group-hover:text-accent">
                ← {prev.title}
              </p>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link href={`/portfolio/${next.slug}`} className="group max-w-sm text-right md:ml-auto">
              <p className="label-caps text-muted">Next</p>
              <p className="mt-2 font-display text-xl text-cream group-hover:text-accent">
                {next.title} →
              </p>
            </Link>
          ) : null}
        </div>
      </section>
    </>
  );
}
