import type { HomepageProcessStep } from "@/lib/types";

export function ExperienceTimeline({ stages }: { stages: HomepageProcessStep[] }) {
  if (stages.length === 0) return null;

  return (
    <section className="section-padding">
      <div className="container-wide max-w-4xl">
        <div className="relative">
          <div className="absolute top-0 bottom-0 left-[27px] hidden w-px bg-stone/30 sm:block" />
          <ol className="space-y-12">
            {stages.map((stage) => (
              <li key={`${stage.step}-${stage.title}`} className="relative sm:pl-20">
                <span className="absolute top-0 left-0 hidden h-14 w-14 items-center justify-center border border-stone/40 bg-ink font-display text-xl text-accent sm:flex">
                  {stage.step}
                </span>
                <p className="font-display text-2xl text-accent sm:hidden">{stage.step}</p>
                <h3 className="mt-2 font-display text-2xl text-cream sm:mt-0">{stage.title}</h3>
                <p className="body-lg mt-3 max-w-xl text-fog">{stage.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
