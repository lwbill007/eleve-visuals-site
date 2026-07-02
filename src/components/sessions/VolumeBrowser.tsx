"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { SessionVolumeDTO } from "@/lib/types";
import { VOLUME_CATEGORIES } from "@/lib/sessions-experience";
import { VolumePosterCard } from "./VolumePosterCard";

interface Group {
  id: string;
  label: string;
  blurb: string;
  items: SessionVolumeDTO[];
}

function Rail({ group }: { group: Group }) {
  const scroller = useRef<HTMLDivElement>(null);

  function scrollBy(dir: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  }

  return (
    <div className="mb-14 last:mb-0">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl text-cream md:text-3xl">{group.label}</h3>
          <p className="mt-1 text-xs tracking-wide text-fog">{group.blurb}</p>
        </div>
        <div className="hidden gap-2 md:flex">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            aria-label={`Scroll ${group.label} left`}
            className="flex h-10 w-10 items-center justify-center border border-stone/50 text-fog transition-colors hover:border-cream/40 hover:text-cream"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            aria-label={`Scroll ${group.label} right`}
            className="flex h-10 w-10 items-center justify-center border border-stone/50 text-fog transition-colors hover:border-cream/40 hover:text-cream"
          >
            ›
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:-mx-8 md:px-8 lg:-mx-12 lg:px-12 [&::-webkit-scrollbar]:hidden"
      >
        {group.items.map((v) => (
          <div
            key={v.id}
            className="w-[58%] shrink-0 snap-start xs:w-[44%] sm:w-[34%] md:w-[27%] lg:w-[20%]"
          >
            <VolumePosterCard volume={v} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function VolumeBrowser({ volumes }: { volumes: SessionVolumeDTO[] }) {
  const groups = useMemo<Group[]>(
    () =>
      VOLUME_CATEGORIES.map((c) => ({
        id: c.id,
        label: c.label,
        blurb: c.blurb,
        items: volumes.filter((v) => c.statuses.includes(v.status)),
      })).filter((g) => g.items.length > 0),
    [volumes]
  );

  const [active, setActive] = useState<string>("all");

  if (volumes.length === 0) {
    return (
      <section id="browse" className="section-padding border-b border-stone/30">
        <div className="container-wide py-10 text-center">
          <h2 className="headline-md">The collection is being curated.</h2>
          <p className="mt-3 text-sm text-fog">Check back as new productions are announced.</p>
        </div>
      </section>
    );
  }

  const tabs = [{ id: "all", label: "All" }, ...groups.map((g) => ({ id: g.id, label: g.label }))];
  const activeGroup = groups.find((g) => g.id === active);

  return (
    <section id="browse" className="section-padding overflow-hidden border-b border-stone/30">
      <div className="container-wide">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="label-caps mb-3 text-accent">The Collection</p>
            <h2 className="headline-lg">Browse the Volumes</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActive(t.id)}
                className={`inline-flex min-h-11 items-center border px-4 py-2 text-[0.65rem] tracking-[0.18em] uppercase transition-colors duration-300 ${
                  active === t.id
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-stone/50 text-fog hover:border-cream/40 hover:text-cream"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {active === "all" ? (
          <div>
            {groups.map((g) => (
              <Rail key={g.id} group={g} />
            ))}
          </div>
        ) : activeGroup ? (
          <motion.div
            key={activeGroup.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-5"
          >
            {activeGroup.items.map((v) => (
              <VolumePosterCard key={v.id} volume={v} />
            ))}
          </motion.div>
        ) : null}
      </div>
    </section>
  );
}
