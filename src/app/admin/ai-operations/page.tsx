import { AdminShell } from "@/components/admin/AdminShell";
import { getAIHealthSnapshot } from "@/lib/ai/health";
import {
  AI_ARCHITECTURE_MAP,
  AI_DEFINITION_OF_DONE,
  AI_OS_PRINCIPLES,
} from "@/lib/ai/architecture";
import { listTaskSpecs } from "@/lib/ai/tasks/registry";
import { METRIC_OWNERS } from "@/lib/ai/platform/metric-owners";
import { MissingMetricCard } from "@/components/admin/ai/OwnedMetricCard";
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

export default async function AIOperationsPage() {
  let health: Awaited<ReturnType<typeof getAIHealthSnapshot>> | null = null;
  let error = "";
  try {
    health = await getAIHealthSnapshot();
  } catch (cause) {
    error = cause instanceof Error ? cause.message : "AI Operations data could not be loaded.";
  }

  const owner = METRIC_OWNERS.ai_operations;
  const tasks = listTaskSpecs();
  const trustGaps = [
    {
      label: "Hallucination rate",
      reason: "No verified human-labeled hallucination corpus yet",
      required: ["Labeled false claims sample", "Review workflow"],
      confidence: 0 as const,
      unlockAfter: "Unlock after labeled hallucination audits",
      owner,
      unlockHref: "/admin/qa",
    },
    {
      label: "Prediction accuracy",
      reason: "Outcome verification loop exists for opportunities; global accuracy rollup not wired",
      required: ["AILearningOutcome coverage", "PredictionContract verification jobs"],
      confidence: 0 as const,
      unlockAfter: "Unlock after prediction verification rollup",
      owner,
      unlockHref: "/admin/opportunities",
    },
    {
      label: "Recommendation success",
      reason: "Accept rate partially tracked; business-success attribution incomplete",
      required: ["Completed outcomes with measured result", "Success metric per RecommendationContract"],
      confidence: 0 as const,
      unlockAfter: "Unlock after outcome → success metric linkage",
      owner,
      unlockHref: "/admin/opportunities",
    },
    {
      label: "Data freshness",
      reason: "Per-connector freshness scores not aggregated here yet",
      required: ["Connector lastSynced timestamps", "Freshness SLO"],
      confidence: 0 as const,
      unlockAfter: "Unlock after connector freshness registry",
      owner,
      unlockHref: "/admin/qa",
    },
  ];

  return (
    <AdminShell title="AI Operations">
      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <header>
          <p className="text-[0.62rem] tracking-[0.18em] text-accent uppercase">
            Trust · Is the AI trustworthy?
          </p>
          <h2 className="mt-2 font-display text-3xl text-cream">AI Operations</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-fog">
            Determines whether AI is trustworthy — not just available. Live routing, latency, cost
            signals, success rate, cache, and retries. Missing trust metrics stay honest at 0%.
          </p>
        </header>

        <section className="mt-6 rounded-2xl border border-stone/20 bg-charcoal/15 p-5">
          <p className="text-[0.58rem] tracking-[0.14em] text-muted uppercase">
            Non-negotiable principles
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {AI_OS_PRINCIPLES.map((principle) => (
              <div key={principle.id} className="rounded-xl border border-stone/15 bg-ink/30 p-3">
                <p className="text-sm text-cream">{principle.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-fog">{principle.rule}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[0.55rem] tracking-[0.12em] text-muted uppercase">
            Architecture map
          </p>
          <p className="mt-1 text-xs text-fog">{AI_ARCHITECTURE_MAP.join(" → ")}</p>
          <p className="mt-3 text-[0.55rem] tracking-[0.12em] text-muted uppercase">
            Definition of Done ({AI_DEFINITION_OF_DONE.length})
          </p>
          <ul className="mt-1 grid gap-1 text-[0.7rem] text-fog md:grid-cols-2">
            {AI_DEFINITION_OF_DONE.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>

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
              <Metric
                label="Cache hits"
                value={String(health.totals.cachedEvaluations)}
                detail="Evaluation cache"
              />
              <Metric label="Free models" value={String(health.routing.discoveredFreeModels)} />
            </section>

            <section className="mt-6 rounded-2xl border border-stone/20 bg-charcoal/15 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-[0.58rem] tracking-[0.14em] text-muted uppercase">
                    Task registry · centralized routing
                  </p>
                  <h3 className="mt-1 font-display text-2xl text-cream">
                    Policy · {health.routing.policy ?? "prefer_free"}
                  </h3>
                </div>
                <p className="text-xs text-muted">{tasks.length} registered tasks</p>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-stone/15 bg-ink/30 px-3 py-2"
                  >
                    <p className="text-xs text-cream">{task.label}</p>
                    <p className="mt-1 text-[0.6rem] text-muted">
                      {task.structuredOutputRequired ? "JSON · " : ""}
                      {task.visionRequired ? "Vision · " : ""}
                      {task.defaultPolicy.replaceAll("_", " ")} · TTL{" "}
                      {Math.round(task.cacheTtlMs / 60_000)}m
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8">
              <h3 className="font-display text-xl text-cream">Trust metrics still unlocking</h3>
              <p className="mt-1 text-sm text-fog">
                Never invent hallucination or prediction-success rates. Required data listed below.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {trustGaps.map((gap) => (
                  <MissingMetricCard key={gap.label} missing={gap} />
                ))}
              </div>
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
