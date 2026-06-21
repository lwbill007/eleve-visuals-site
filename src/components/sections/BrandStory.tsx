import { SectionHeader } from "@/components/ui/Section";
import type { BrandStory } from "@/lib/types";

interface BrandStoryProps {
  brandStory: BrandStory;
}

export function BrandStorySection({ brandStory }: BrandStoryProps) {
  return (
    <section className="section-padding">
      <div className="container-wide">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <SectionHeader eyebrow={brandStory.eyebrow} headline={brandStory.headline} />
            <div className="space-y-5">
              {brandStory.body.map((paragraph, i) => (
                <p key={i} className="body-lg">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {brandStory.stats.length > 0 && (
            <div className="flex flex-col justify-center lg:col-span-5">
              <div className="border border-stone/40 p-8 md:p-10">
                <div className="space-y-8">
                  {brandStory.stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="border-b border-stone/20 pb-6 last:border-0 last:pb-0"
                    >
                      <p className="font-display text-4xl text-cream md:text-5xl">{stat.value}</p>
                      <p className="mt-1 text-xs tracking-[0.15em] text-muted uppercase">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
