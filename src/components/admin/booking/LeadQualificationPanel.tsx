"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { buildLeadIntel, type RiskLevel } from "@/lib/booking-lead-intel";
import { gradeTone } from "@/lib/booking-command";
import { cn } from "@/lib/utils";
import { AIAuditPanel } from "./AIAuditPanel";

function priorityTone(p: string) {
  if (p === "urgent") return "border-red-400/50 text-red-300 bg-red-400/10";
  if (p === "high") return "border-amber-400/45 text-amber-200 bg-amber-400/10";
  if (p === "medium") return "border-accent/40 text-accent bg-accent/10";
  return "border-stone/40 text-muted bg-charcoal/20";
}

function riskTone(level: RiskLevel) {
  if (level === "High") return "border-red-400/40 text-red-300";
  if (level === "Medium") return "border-amber-400/40 text-amber-200";
  return "border-emerald-400/35 text-emerald-300";
}

function upsellTone(p: string) {
  if (p === "High") return "text-red-300";
  if (p === "Medium") return "text-amber-200";
  return "text-fog";
}

function Card({
  title,
  eyebrow,
  children,
  className,
  defaultOpen = true,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-stone/25 bg-charcoal/25",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.02]"
      >
        <div>
          {eyebrow && (
            <p className="label-caps text-[0.55rem] text-muted">{eyebrow}</p>
          )}
          <h3 className="font-display text-lg text-cream">{title}</h3>
        </div>
        <span className="text-[0.65rem] tracking-[0.12em] text-muted uppercase">
          {open ? "Hide" : "Expand"}
        </span>
      </button>
      {open && <div className="border-t border-stone/20 px-4 py-4">{children}</div>}
    </section>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-stone/15 py-2 last:border-0">
      <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">{label}</p>
      <p className="mt-0.5 text-sm leading-snug text-cream-dim">{value}</p>
    </div>
  );
}

/** AI + sales intelligence sections (5–14). Metrics live once here — not in header. */
export function LeadQualificationPanel({
  data,
  email,
  submissionId,
  hideMetricsInHeader = false,
}: {
  data: Record<string, unknown>;
  email?: string;
  submissionId?: string;
  /** When true, metrics only appear in Lead Intelligence (page header shows actions only). */
  hideMetricsInHeader?: boolean;
}) {
  void hideMetricsInHeader;
  const intel = useMemo(() => buildLeadIntel(data), [data]);
  const mail = email || (typeof data.email === "string" ? data.email : "");
  const missing = intel.missingAssets.filter((a) => a.missing);
  const bi = intel.bookingIntelligence;
  const m = intel.metrics;

  const requestFilesHref = mail
    ? `/admin/email?to=${encodeURIComponent(mail)}&subject=${encodeURIComponent(
        "ÉLEVÉ — Visual references & brand assets"
      )}&body=${encodeURIComponent(
        "To move your proposal forward, please share:\n• Moodboard / inspiration\n• Brand guidelines\n• Logo files\n• Usage requirements\n\nA Drive or Pinterest link works perfectly."
      )}`
    : "/admin/email";

  return (
    <div className="space-y-4">
      <Card title="AI Executive Summary" eyebrow="Insight" defaultOpen>
        <p className="text-sm leading-relaxed text-cream-dim">{intel.executiveSummary}</p>
        <p className="mt-3 text-[0.6rem] tracking-[0.1em] text-muted uppercase">
          Confidence {intel.confidence}%
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Lead Intelligence" eyebrow="Business metrics">
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["Estimated Value", `$${m.estimatedProjectValue.toLocaleString()}`],
                ["Est. Lifetime Value", `$${bi.estimatedLifetimeValue.toLocaleString()}`],
                ["Lead Score", `${m.leadScore}`],
                ["Opportunity Grade", bi.opportunityGrade],
                ["Close Probability", `${m.likelihoodToClose}%`],
                ["Priority", m.priority],
                ["Portfolio Impact", bi.portfolioImpact],
                ["Partnership Potential", bi.partnershipPotential],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="border border-stone/20 bg-black/20 px-3 py-2.5">
                <p className="text-[0.55rem] tracking-[0.1em] text-muted uppercase">{label}</p>
                <p
                  className={cn(
                    "mt-1 text-sm text-cream",
                    label === "Opportunity Grade" && gradeTone(bi.opportunityGrade)
                  )}
                >
                  {value}
                </p>
              </div>
            ))}
          </div>
          <span
            className={cn(
              "mt-3 inline-flex border px-2 py-0.5 text-[0.6rem] tracking-[0.1em] uppercase",
              priorityTone(m.priority)
            )}
          >
            {m.priority} priority
          </span>
        </Card>

        <Card title="Why AI Generated This Score" eyebrow="Explainable">
          <ul className="space-y-1.5">
            {intel.scoreReasons.map((r) => (
              <li
                key={r}
                className="flex gap-2 text-sm text-cream-dim before:mt-2 before:h-1 before:w-1 before:shrink-0 before:rounded-full before:bg-accent before:content-['']"
              >
                {r}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Creative Brief" eyebrow="Structured">
          <Line label="Project Vision" value={intel.brief.projectVision} />
          <Line label="Desired Emotion" value={intel.brief.desiredEmotion} />
          <Line label="Primary Goal" value={intel.brief.primaryGoal} />
          <Line label="Target Audience" value={intel.brief.targetAudience} />
          <Line label="Story" value={intel.brief.story} />
          <Line label="Creative Inspiration" value={intel.brief.creativeInspiration} />
          <Line label="Success Definition" value={intel.brief.successDefinition} />
          <div className="mt-3 border border-accent/20 bg-accent/5 p-3">
            <p className="text-[0.55rem] tracking-[0.12em] text-accent uppercase">
              AI Creative Direction
            </p>
            <p className="mt-1 text-sm leading-relaxed text-cream-dim">
              {intel.brief.creativeDirection}
            </p>
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-[0.65rem] tracking-[0.1em] text-muted uppercase">
              Production recommendations
            </summary>
            <div className="mt-2">
              {(
                [
                  ["Photography Style", intel.creative.photographyStyle],
                  ["Video Style", intel.creative.videoStyle],
                  ["Color Palette", intel.creative.colorPalette],
                  ["Lighting Style", intel.creative.lightingStyle],
                  ["Lens Suggestions", intel.creative.lensSuggestions],
                  ["Camera Movement", intel.creative.cameraMovement],
                  ["Editing Style", intel.creative.editingStyle],
                  ["Music Direction", intel.creative.musicDirection],
                  ["Wardrobe", intel.creative.wardrobeSuggestions],
                  ["Location Ideas", intel.creative.locationIdeas],
                  ["Complexity", intel.creative.productionComplexity],
                ] as const
              ).map(([label, value]) => (
                <Line key={label} label={label} value={value} />
              ))}
            </div>
          </details>
        </Card>

        <div className="space-y-4">
          <Card title="Missing Information" eyebrow="Outstanding">
            {missing.length === 0 ? (
              <p className="text-sm text-emerald-300/90">
                Core brief assets are on file. Review before proposal.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {missing.map((a) => (
                  <li key={a.label} className="text-sm text-amber-100/90">
                    ⚠ {a.label}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={requestFilesHref}
                className="border border-accent/40 bg-accent/10 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-accent uppercase hover:bg-accent/20"
              >
                Request Files
              </Link>
              <Link
                href={
                  mail
                    ? `/admin/email?to=${encodeURIComponent(mail)}&subject=${encodeURIComponent(
                        "ÉLEVÉ — Share your upload link"
                      )}`
                    : "/admin/email"
                }
                className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase hover:text-cream"
              >
                Upload Link
              </Link>
              <Link
                href={
                  mail
                    ? `/admin/email?to=${encodeURIComponent(mail)}&subject=${encodeURIComponent(
                        "ÉLEVÉ — Moodboard request"
                      )}`
                    : "/admin/email"
                }
                className="border border-stone/40 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-fog uppercase hover:text-cream"
              >
                Generate Moodboard
              </Link>
            </div>
          </Card>

          <Card title="Discovery Questions" eyebrow="Personalized">
            <ol className="space-y-2">
              {intel.suggestedQuestions.map((q, i) => (
                <li key={q} className="flex gap-3 text-sm text-cream-dim">
                  <span className="font-display text-accent">{i + 1}</span>
                  <span>{q}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Sales Strategy" eyebrow="Next move">
          <Line label="Recommended Next Step" value={intel.salesStrategy.recommendedNextStep} />
          <Line label="Meeting Type" value={intel.salesStrategy.meetingType} />
          <Line label="Estimated Length" value={intel.salesStrategy.estimatedLength} />
          <Line label="Sales Strategy" value={intel.salesStrategy.salesStrategy} />
          <Line
            label="Confidence Level"
            value={`${intel.salesStrategy.confidenceLevel}%`}
          />
          <Line
            label="Business Opportunity"
            value={intel.salesStrategy.businessOpportunitySummary}
          />
        </Card>

        <Card title="Risk Assessment" eyebrow="Operations">
          <div className="grid gap-2 sm:grid-cols-2">
            {intel.risks.map((r) => (
              <div key={r.category} className={cn("border px-3 py-2.5", riskTone(r.level))}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[0.65rem] tracking-[0.1em] uppercase">{r.category}</p>
                  <span className="text-[0.6rem] tracking-[0.08em] uppercase">{r.level}</span>
                </div>
                <p className="mt-1 text-xs text-cream-dim">{r.note}</p>
                <p className="mt-1 text-[0.7rem] text-fog">{r.recommendation}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Smart Recommendations" eyebrow="Relevant only">
        <div className="grid gap-3 md:grid-cols-2">
          {intel.upsells.length === 0 ? (
            <p className="text-sm text-muted">
              No additional recommendations — scope already aligns with the selected experience.
            </p>
          ) : (
            intel.upsells.map((u) => (
              <div key={u.name} className="border border-stone/25 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-display text-lg text-cream">{u.name}</h4>
                  <span
                    className={cn(
                      "text-[0.6rem] tracking-[0.1em] uppercase",
                      upsellTone(u.priority)
                    )}
                  >
                    {u.priority}
                  </span>
                </div>
                <p className="mt-2 text-[0.55rem] tracking-[0.1em] text-muted uppercase">
                  Why it matters
                </p>
                <p className="text-sm text-cream-dim">{u.reason}</p>
                <p className="mt-2 text-[0.55rem] tracking-[0.1em] text-muted uppercase">
                  Expected impact
                </p>
                <p className="text-sm text-cream-dim">{u.impact}</p>
                <p className="mt-3 text-sm text-accent">
                  Est. +${u.estimatedValue.toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card title="Proposal Center" eyebrow="Human approval">
        <Line label="Proposal Status" value={intel.proposal.status} />
        <Line label="Investment Estimate" value={intel.proposal.investmentEstimate} />
        <Line label="Approval Status" value={intel.proposal.approvalStatus} />
        <Line label="Discovery Requirement" value={intel.proposal.discoveryRequirement} />
        <Line label="Next Step" value={intel.proposal.nextStep} />
        {mail && (
          <Link
            href={`/admin/email?to=${encodeURIComponent(mail)}&subject=${encodeURIComponent(
              "ÉLEVÉ Visuals — Project proposal"
            )}&body=${encodeURIComponent(
              [
                "Proposal draft placeholder — complete discovery before sending.",
                "",
                intel.executiveSummary,
                "",
                `Next: ${intel.proposal.nextStep}`,
                "",
                "Billy · ÉLEVÉ Visuals",
              ].join("\n")
            )}`}
            className="mt-3 inline-flex border border-accent/40 bg-accent/10 px-3 py-1.5 text-[0.65rem] tracking-[0.1em] text-accent uppercase hover:bg-accent/20"
          >
            Generate Proposal
          </Link>
        )}
      </Card>

      {submissionId && (
        <AIAuditPanel submissionId={submissionId} data={data} email={mail} />
      )}
    </div>
  );
}
