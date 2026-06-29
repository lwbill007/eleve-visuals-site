import type { SessionVolumeDTO } from "@/lib/types";
import { VolumePosterCard } from "./VolumePosterCard";

function Rail({ title, volumes }: { title: string; volumes: SessionVolumeDTO[] }) {
  if (volumes.length === 0) return null;
  return (
    <div className="mb-12 last:mb-0">
      <h3 className="mb-5 text-sm tracking-[0.15em] text-cream-dim uppercase">{title}</h3>
      <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        {volumes.map((v) => (
          <div key={v.id} className="w-44 shrink-0 sm:w-52">
            <VolumePosterCard volume={v} />
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
    <section className="section-padding bg-ink-soft">
      <div className="container-wide">
        <div className="mb-10">
          <p className="label-caps text-accent">Keep Exploring</p>
          <h2 className="headline-md mt-2">More from ÉLEVÉ Sessions</h2>
        </div>
        <Rail title="Recommended for you" volumes={recommended} />
        <Rail title="Coming soon" volumes={comingSoon} />
      </div>
    </section>
  );
}
