import type { SessionVolumeDTO } from "@/lib/types";
import { VolumePosterCard } from "./VolumePosterCard";

function Rail({ title, volumes }: { title: string; volumes: SessionVolumeDTO[] }) {
  if (volumes.length === 0) return null;
  return (
    <div className="mb-12 last:mb-0">
      <h3 className="mb-5 text-[0.7rem] tracking-[0.2em] text-cream-dim uppercase">{title}</h3>
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory [scrollbar-width:none] sm:mx-0 sm:gap-5 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {volumes.map((v) => (
          <div key={v.id} className="w-48 shrink-0 snap-start sm:w-56 md:w-64">
            <VolumePosterCard volume={v} showTheme />
          </div>
        ))}
      </div>
    </div>
  );
}

export function RelatedVolumes({
  recommended,
  comingSoon,
}: {
  recommended: SessionVolumeDTO[];
  comingSoon: SessionVolumeDTO[];
}) {
  if (recommended.length === 0 && comingSoon.length === 0) return null;

  return (
    <section className="section-padding overflow-hidden bg-ink-soft">
      <div className="container-wide min-w-0">
        <header className="mb-10">
          <p className="label-caps text-accent">ÉLEVÉ Sessions</p>
          <h2 className="headline-md mt-2 text-balance">Continue Watching</h2>
          <p className="mt-3 max-w-xl text-sm text-muted">
            More volumes from the ÉLEVÉ Sessions archive.
          </p>
        </header>
        <Rail title="More to Explore" volumes={recommended} />
        <Rail title="Coming Soon" volumes={comingSoon} />
      </div>
    </section>
  );
}
