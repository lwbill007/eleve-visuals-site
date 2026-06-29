import type { VolumeTestimonial } from "@/lib/types";

export function VolumeTestimonials({ testimonials }: { testimonials: VolumeTestimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <section className="section-padding border-b border-stone/30">
      <div className="container-wide">
        <div className="mb-12 max-w-2xl">
          <p className="label-caps text-accent">In Their Words</p>
          <h2 className="headline-md mt-2">Voices from the production</h2>
        </div>

        <div className="space-y-14">
          {testimonials.map((t, i) => (
            <figure
              key={i}
              className={`max-w-4xl ${i % 2 === 1 ? "ml-auto text-right" : ""}`}
            >
              <blockquote className="font-display text-2xl leading-snug text-cream-dim text-balance md:text-4xl">
                <span className="text-accent">&ldquo;</span>
                {t.quote}
                <span className="text-accent">&rdquo;</span>
              </blockquote>
              {(t.name || t.role) && (
                <figcaption className={`mt-6 flex items-center gap-3 text-sm ${i % 2 === 1 ? "justify-end" : ""}`}>
                  <span className="h-px w-8 bg-accent" />
                  <span className="text-cream">{t.name}</span>
                  {t.role && <span className="text-muted">· {t.role}</span>}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
