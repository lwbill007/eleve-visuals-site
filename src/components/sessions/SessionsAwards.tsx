import { AWARD_CATEGORIES } from "@/lib/sessions-experience";
import { SessionIcon } from "./SessionIcon";

export function SessionsAwards() {
  return (
    <section className="section-padding border-b border-stone/30">
      <div className="container-wide">
        <div className="mb-14 max-w-2xl">
          <p className="label-caps mb-4 text-accent">Recognition</p>
          <div className="line-accent mb-6" />
          <h2 className="headline-lg text-balance">Work worth remembering gets remembered</h2>
          <p className="body-lg mt-5">
            Every Volume closes with honors. Standout work is recognized across the series — credited,
            featured, and carried into future productions.
          </p>
        </div>

        <div className="grid gap-px bg-stone/30 sm:grid-cols-2 lg:grid-cols-12">
          {AWARD_CATEGORIES.map((award, i) => (
            <div
              key={award.title}
              className={`group relative overflow-hidden bg-ink p-8 transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-charcoal/60 ${
                i < 2 ? "lg:col-span-6" : "lg:col-span-3"
              }`}
            >
              <div className="pointer-events-none absolute -top-10 -right-10 h-24 w-24 rounded-full bg-accent/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
              <SessionIcon name={award.icon} className="h-8 w-8 text-accent" />
              <h3 className="mt-6 font-display text-2xl text-cream">{award.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-fog">{award.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
