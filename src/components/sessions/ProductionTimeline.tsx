import { PRODUCTION_TIMELINE } from "@/lib/sessions-experience";

export function ProductionTimeline() {
  return (
    <section className="section-padding overflow-hidden border-b border-stone/30">
      <div className="container-wide">
        <div className="mb-14 max-w-2xl">
          <p className="label-caps mb-4 text-accent">The Production</p>
          <div className="line-accent mb-6" />
          <h2 className="headline-lg text-balance">From application to legacy</h2>
          <p className="body-lg mt-5">
            Every Volume runs like a real production. Here&rsquo;s the arc from the moment you apply
            to the day your work joins the archive.
          </p>
        </div>

        <div className="relative">
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] lg:grid lg:grid-cols-4 lg:gap-px lg:overflow-hidden lg:bg-stone/30 lg:pb-0 [&::-webkit-scrollbar]:hidden">
            {PRODUCTION_TIMELINE.map((stage) => (
              <div
                key={stage.step}
                className="w-[70%] shrink-0 snap-start border-t border-stone/40 pt-5 xs:w-[55%] sm:w-[40%] md:w-[30%] lg:w-auto lg:min-w-0 lg:border-0 lg:bg-ink lg:p-7"
              >
                <span className="text-[0.65rem] tracking-[0.2em] text-accent">{stage.step}</span>
                <h3 className="mt-5 font-display text-lg text-cream">{stage.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-fog">{stage.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
