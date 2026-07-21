export interface ProofStat {
  value: string;
  label: string;
}

function Stat({ stat }: { stat: ProofStat }) {
  return (
    <div className="text-center">
      <p className="font-display text-4xl text-cream md:text-6xl">{stat.value}</p>
      <p className="label-caps mt-3 text-[0.55rem] text-muted">{stat.label}</p>
    </div>
  );
}

export function SessionsSocialProof({ stats }: { stats: ProofStat[] }) {
  const visible = stats.filter((s) => s.value && s.label);
  if (visible.length === 0) return null;

  return (
    <section className="border-b border-stone/30 bg-ink">
      <div className="container-wide section-padding py-16 md:py-24">
        <div className="grid grid-cols-2 gap-y-12 md:grid-cols-4 md:gap-8">
          {visible.map((stat) => (
            <Stat key={stat.label} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
