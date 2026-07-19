import { AdminShell } from "@/components/admin/AdminShell";
import { getAIHealthSnapshot } from "@/lib/ai/health";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-stone/20 bg-charcoal/20 p-4">
      <p className="text-[0.58rem] tracking-[0.14em] text-muted uppercase">{label}</p>
      <p className="mt-2 font-display text-3xl text-cream">{value}</p>
      {detail && <p className="mt-2 text-xs text-muted">{detail}</p>}
    </div>
  );
}

function Rate({ value }: { value: number }) {
  const tone = value >= 95 ? "bg-emerald-400" : value >= 80 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone/30">
      <div className={cn("h-full rounded-full", tone)} style={{ width: `${value}%` }} />
    </div>
  );
}

export default async function AIHealthPage() {
  let health: Awaited<ReturnType<typeof getAIHealthSnapshot>> | null = null;
  let error = "";
  try {
    health = await getAIHealthSnapshot();
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "AI health data could not be loaded.";
  }

  return (
    <AdminShell title="AI Health">
      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <header>
          <p className="text-[0.62rem] tracking-[0.18em] text-accent uppercase">
            Provider operations
          </p>
          <h2 className="mt-2 font-display text-3xl text-cream">AI orchestration health</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fog">
            Live model routing, reliability, latency, structured-output health, vision success,
            retries, and evaluation cache usage. Metrics cover the last seven days.
          </p>
        </header>

        {!health ? (
          <div className="mt-8 rounded-xl border border-red-400/30 bg-red-400/5 p-5 text-sm text-red-200">
            {error}
          </div>
        ) : (
          <>
            <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
              <Metric label="Success rate" value={`${health.totals.successRate}%`} />
              <Metric label="Failure rate" value={`${health.totals.failureRate}%`} />
              <Metric label="Avg latency" value={`${health.totals.averageLatencyMs}ms`} />
              <Metric label="JSON success" value={`${health.totals.jsonParseSuccessRate}%`} />
              <Metric label="Vision success" value={`${health.totals.visionSuccessRate}%`} />
              <Metric label="Retries" value={String(health.totals.retries)} />
              <Metric label="Cached evaluations" value={String(health.totals.cachedEvaluations)} />
              <Metric label="Free models found" value={String(health.routing.discoveredFreeModels)} />
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-stone/20 bg-charcoal/15 p-5">
                <p className="text-[0.58rem] tracking-[0.14em] text-muted uppercase">Providers</p>
                <div className="mt-4 space-y-3">
                  {health.providers.map((provider) => (
                    <div key={provider.id} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm capitalize text-cream">{provider.id}</p>
                        <p className="text-xs text-muted">{provider.model}</p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1 text-[0.58rem] uppercase",
                          provider.configured
                            ? "border-emerald-400/40 text-emerald-300"
                            : "border-stone/30 text-muted"
                        )}
                      >
                        {provider.configured ? "configured" : "offline"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-stone/20 bg-charcoal/15 p-5">
                <p className="text-[0.58rem] tracking-[0.14em] text-muted uppercase">
                  Active runtime
                </p>
                <p className="mt-4 text-sm text-cream">
                  {health.activeModel || "No successful request in window"}
                </p>
                <p className="mt-2 text-xs text-muted">
                  Last successful model: {health.lastSuccessfulModel || "None"}
                </p>
                <p className="mt-2 text-xs text-muted">
                  Tokens: {health.totals.promptTokens.toLocaleString()} prompt ·{" "}
                  {health.totals.completionTokens.toLocaleString()} completion
                </p>
              </div>

              <div className="rounded-2xl border border-stone/20 bg-charcoal/15 p-5">
                <p className="text-[0.58rem] tracking-[0.14em] text-muted uppercase">
                  Last provider error
                </p>
                {health.lastProviderError ? (
                  <>
                    <p className="mt-4 text-sm text-red-200">{health.lastProviderError.model}</p>
                    <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-fog">
                      {health.lastProviderError.error}
                    </p>
                    <p className="mt-2 text-[0.6rem] text-muted">
                      {new Date(health.lastProviderError.at).toLocaleString()}
                    </p>
                  </>
                ) : (
                  <p className="mt-4 text-sm text-emerald-300">No provider errors recorded.</p>
                )}
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-stone/20 bg-charcoal/15 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[0.58rem] tracking-[0.14em] text-muted uppercase">
                    Model reliability
                  </p>
                  <h3 className="mt-1 font-display text-2xl text-cream">Observed performance</h3>
                </div>
                <p className="text-xs text-muted">{health.totals.requests} attempts in window</p>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {health.models.length ? (
                  health.models.map((model) => (
                    <article key={model.model} className="rounded-xl border border-stone/20 p-4">
                      <p className="truncate text-sm text-cream">{model.model}</p>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-muted">Success</span>
                        <span className="text-fog">{model.successRate}%</span>
                      </div>
                      <Rate value={model.successRate} />
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-sm text-cream">{model.averageLatencyMs}ms</p>
                          <p className="text-[0.55rem] text-muted uppercase">Latency</p>
                        </div>
                        <div>
                          <p className="text-sm text-cream">{model.retries}</p>
                          <p className="text-[0.55rem] text-muted uppercase">Retries</p>
                        </div>
                        <div>
                          <p className="text-sm text-cream">{model.requests}</p>
                          <p className="text-[0.55rem] text-muted uppercase">Attempts</p>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-muted">No AI requests have been recorded yet.</p>
                )}
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-stone/20 bg-charcoal/15 p-5">
              <p className="text-[0.58rem] tracking-[0.14em] text-muted uppercase">
                Current fallback order
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {Object.entries(health.routing.taskRoutes).map(([task, models]) => (
                  <div key={task} className="rounded-xl border border-stone/20 p-4">
                    <p className="text-xs tracking-[0.1em] text-accent uppercase">
                      {task.replaceAll("_", " ")}
                    </p>
                    <ol className="mt-3 space-y-2">
                      {models.map((model, index) => (
                        <li key={model.id} className="flex items-center gap-2 text-xs">
                          <span className="w-4 text-muted">{index + 1}</span>
                          <span className="min-w-0 flex-1 truncate text-fog">{model.id}</span>
                          <span className="text-[0.55rem] text-muted">
                            {model.vision ? "vision " : ""}
                            {model.structuredOutputs ? "schema" : model.jsonMode ? "json" : ""}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-2xl border border-stone/20 bg-charcoal/15 p-5">
              <p className="text-[0.58rem] tracking-[0.14em] text-muted uppercase">
                Recent retry history
              </p>
              <div className="mt-4 space-y-2">
                {health.retryHistory.length ? (
                  health.retryHistory.map((retry, index) => (
                    <div
                      key={`${retry.at}-${retry.model}-${index}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-stone/15 px-3 py-2 text-xs"
                    >
                      <span className="text-muted">{new Date(retry.at).toLocaleString()}</span>
                      <span className="text-fog">{retry.model}</span>
                      <span className="text-accent">{retry.task.replaceAll("_", " ")}</span>
                      <span className="text-muted">{retry.latencyMs}ms</span>
                      {retry.error && <span className="w-full truncate text-red-300">{retry.error}</span>}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">No retries recorded.</p>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </AdminShell>
  );
}
