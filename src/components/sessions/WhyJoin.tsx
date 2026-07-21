import { WHY_JOIN_PILLARS } from "@/lib/sessions-experience";
import { SessionIcon } from "./SessionIcon";

export function WhyJoin() {
  return (
    <section className="section-padding border-b border-stone/30 bg-ink-soft">
      <div className="container-wide">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="label-caps mb-4 text-accent">Why ÉLEVÉ</p>
            <div className="line-accent mb-6" />
            <h2 className="headline-lg text-balance">
              Most shoots end when the camera stops. This is where it begins.
            </h2>
            <p className="body-lg mt-6">
              ÉLEVÉ Sessions exists for creatives who want more than another set of images. Each
              Volume is a fully produced film of its own — a chance to build with people who take
              the craft as seriously as you do, and to leave with work, recognition, and a network
              that compounds over time.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              You don&rsquo;t book a session. You&rsquo;re cast into one — and once you are, you
              belong to the archive for good.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="grid gap-px overflow-hidden border border-stone/30 bg-stone/30 sm:grid-cols-2">
              {WHY_JOIN_PILLARS.map((pillar) => (
                <div
                  key={pillar.title}
                  className="group bg-ink-soft p-7 transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-charcoal/60"
                >
                  <SessionIcon
                    name={pillar.icon}
                    className="h-6 w-6 text-fog transition-colors duration-500 group-hover:text-accent"
                  />
                  <h3 className="mt-5 font-display text-xl text-cream">{pillar.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fog">{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
