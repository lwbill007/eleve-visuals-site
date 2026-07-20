/**
 * Intelligence card — expandable Evidence → Reasoning → Prediction → Outcome → Confidence
 * Reused on Opportunities, Risks, and Command Center. No new pages.
 */

"use client";

import { useState, type ReactNode } from "react";
import { ExecuteButton, type ExecuteTarget } from "@/components/admin/ai/ExecuteButton";
import { cn } from "@/lib/utils";
import type { CostOfIgnore } from "@/lib/ai/platform/cost-of-ignore";

export interface IntelligenceCardModel {
  id: string;
  title: string;
  why: string;
  evidence: string[];
  estimatedRevenue: number;
  confidence: number;
  costOfIgnore: CostOfIgnore;
  /** Expected outcome if acted on */
  expectedOutcome?: string;
  /** Actual outcome when learning closed the loop */
  actualOutcome?: string;
  actualRevenue?: number;
  decisionStatus?: "pending" | "accepted" | "completed" | "rejected";
  learningStatus?: "waiting" | "learned" | "none";
  evidenceCount?: number;
  reasoning?: string;
  prediction?: string;
  priority?: string;
  category?: string;
  severity?: string;
  timeMinutes?: number;
  execute?: ExecuteTarget;
  /** Extra actions (e.g. Acknowledge) */
  secondaryAction?: ReactNode;
  accent?: "opportunity" | "risk";
}

export function IntelligenceCard({ model, onDone }: { model: IntelligenceCardModel; onDone?: () => void }) {
  const [open, setOpen] = useState(false);
  const coi = model.costOfIgnore;
  const evidence = model.evidence ?? [];
  const evidenceCount = model.evidenceCount ?? evidence.length;
  const isRisk = model.accent === "risk";

  return (
    <article className="os-panel rounded-xl border border-stone/20 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {(model.priority || model.severity) && (
            <span
              className={cn(
                "rounded-full border px-1.5 py-0.5 text-[0.5rem] uppercase",
                (model.priority === "critical" || model.severity === "critical") &&
                  "border-red-500/40 text-red-400",
                (model.priority === "high" || model.severity === "high") &&
                  "border-amber-500/40 text-amber-300",
                !["critical", "high"].includes(model.priority ?? model.severity ?? "") &&
                  "border-stone/30 text-muted"
              )}
            >
              {model.priority ?? model.severity}
            </span>
          )}
          {model.category && (
            <span className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">{model.category}</span>
          )}
        </div>
        <p className={cn("font-display text-xl", isRisk ? "text-amber-300" : "text-emerald-400")}>
          {model.estimatedRevenue > 0
            ? `${isRisk ? "−" : "+"}$${model.estimatedRevenue.toLocaleString()}`
            : "—"}
        </p>
      </div>

      <h3 className="mt-3 font-display text-lg text-cream">{model.title}</h3>
      <p className="mt-2 text-sm text-fog">{model.why}</p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-[0.5rem] tracking-[0.12em] text-muted uppercase">
            {isRisk ? "Potential impact" : "If you act"}
          </dt>
          <dd className={cn("mt-0.5 text-sm", isRisk ? "text-amber-200/90" : "text-emerald-400/90")}>
            {model.expectedOutcome ??
              (model.estimatedRevenue > 0
                ? `~$${model.estimatedRevenue.toLocaleString()} ${isRisk ? "at risk" : "opportunity"}`
                : "Advance the recommended fix")}
          </dd>
        </div>
        <div>
          <dt className="text-[0.5rem] tracking-[0.12em] text-muted uppercase">Cost of ignore</dt>
          <dd className="mt-0.5 text-sm text-amber-200/90">
            {coi.estimatedRevenueLoss != null && coi.estimatedRevenueLoss > 0
              ? `−$${coi.estimatedRevenueLoss.toLocaleString()}`
              : "Momentum decays"}
            {coi.estimatedTimeLoss ? (
              <span className="block text-[0.65rem] text-muted">{coi.estimatedTimeLoss}</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-[0.5rem] tracking-[0.12em] text-muted uppercase">Confidence</dt>
          <dd className="mt-0.5 font-display text-lg text-cream">{Math.round(model.confidence * 100)}%</dd>
        </div>
        <div>
          <dt className="text-[0.5rem] tracking-[0.12em] text-muted uppercase">Evidence</dt>
          <dd className="mt-0.5 text-sm text-cream-dim">
            {evidenceCount} signal{evidenceCount === 1 ? "" : "s"}
            {model.decisionStatus ? (
              <span className="text-muted"> · Decision {model.decisionStatus}</span>
            ) : null}
          </dd>
        </div>
      </dl>

      {(model.actualOutcome || model.learningStatus === "learned") && (
        <p className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[0.7rem] text-emerald-200/90">
          Outcome: {model.actualOutcome}
          {model.actualRevenue != null ? ` · $${model.actualRevenue.toLocaleString()}` : ""}
          {model.learningStatus === "learned" ? " · Learning stored" : ""}
        </p>
      )}
      {model.learningStatus === "waiting" && (
        <p className="mt-3 text-[0.65rem] text-muted">Learning · waiting for outcome</p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[0.65rem] tracking-[0.08em] text-muted uppercase hover:text-accent"
        >
          {open ? "Hide reasoning" : "Why · evidence · prediction"}
        </button>
        <div className="flex flex-wrap gap-2">
          {model.secondaryAction}
          {model.execute && <ExecuteButton target={model.execute} onDone={onDone} />}
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t border-stone/15 pt-4 text-[0.7rem]">
          <div>
            <p className="text-[0.5rem] tracking-[0.12em] text-muted uppercase">Evidence</p>
            <ul className="mt-1 space-y-1 text-fog">
              {evidence.length > 0 ? (
                evidence.map((e) => <li key={e}>• {e}</li>)
              ) : (
                <li>• No structured evidence attached</li>
              )}
            </ul>
          </div>
          <div>
            <p className="text-[0.5rem] tracking-[0.12em] text-muted uppercase">Reasoning</p>
            <p className="mt-1 text-cream-dim">{model.reasoning ?? model.why}</p>
          </div>
          <div>
            <p className="text-[0.5rem] tracking-[0.12em] text-muted uppercase">Prediction</p>
            <p className="mt-1 text-cream-dim">
              {model.prediction ??
                model.expectedOutcome ??
                (model.estimatedRevenue > 0
                  ? `Acting captures ~$${model.estimatedRevenue.toLocaleString()}`
                  : "Measurable improvement if executed")}
            </p>
          </div>
          <div>
            <p className="text-[0.5rem] tracking-[0.12em] text-muted uppercase">If ignored</p>
            <p className="mt-1 text-amber-200/80">{coi.reasoning}</p>
            <p className="mt-1 text-muted">Ignore confidence {Math.round(coi.confidence * 100)}%</p>
          </div>
          {model.timeMinutes != null && (
            <p className="text-muted">~{model.timeMinutes} min to execute</p>
          )}
        </div>
      )}
    </article>
  );
}
