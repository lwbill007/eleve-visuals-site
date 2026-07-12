"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { CLIENT_TIMELINE_STAGES, clientTimelineIndex, normalizeInquiryStatus } from "@/lib/booking-pipeline";
import { cn } from "@/lib/utils";

type BriefPayload = {
  brief: {
    id: string;
    title: string;
    summary: string;
    value: Record<string, unknown>;
    verified: boolean;
  } | null;
  proposal: {
    id: string;
    title: string;
    summary: string;
    value: Record<string, unknown>;
    verified: boolean;
  } | null;
};

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v : undefined;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function BookingProjectWorkspace({
  submissionId,
  status,
  data,
  email,
}: {
  submissionId: string;
  status: string;
  data: Record<string, unknown>;
  email?: string;
}) {
  const [payload, setPayload] = useState<BriefPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch(`/api/admin/ai/booking-brief?id=${encodeURIComponent(submissionId)}`);
      if (!res.ok) throw new Error("Failed to load production intel");
      setPayload((await res.json()) as BriefPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const regenerate = async () => {
    setGenerating(true);
    try {
      const res = await adminFetch("/api/admin/ai/booking-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: submissionId }),
      });
      if (!res.ok) throw new Error("Regenerate failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Regenerate failed");
    } finally {
      setGenerating(false);
    }
  };

  const stage = normalizeInquiryStatus(status);
  const timelineIdx = clientTimelineIndex(status);
  const brief = payload?.brief?.value ?? {};
  const proposal = payload?.proposal?.value ?? {};
  const proposalStatus = asString(proposal.status) || "draft";

  const emailHref = email
    ? `/admin/email?to=${encodeURIComponent(email)}&subject=${encodeURIComponent(
        `ÉLEVÉ Visuals — Project proposal`
      )}&body=${encodeURIComponent(
        [
          `Hi ${(asString(data.fullName) || "there").split(" ")[0]},`,
          "",
          asString(brief.executiveSummary) || payload?.brief?.summary || "",
          "",
          `Suggested package: ${asString(proposal.package) || asString(brief.suggestedPackage) || "TBD"}`,
          `Timeline: ${asString(proposal.timeline) || asString(brief.suggestedTimeline) || "TBD"}`,
          "",
          "Looking forward to creating with you,",
          "Billy · ÉLEVÉ Visuals",
        ].join("\n")
      )}`
    : "/admin/email";

  return (
    <div className="mt-6 space-y-6 border-t border-stone/20 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.55rem] tracking-[0.14em] text-accent uppercase">
          Production workspace
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {email && (
            <Link href={`/admin/crm/${encodeURIComponent(email)}`} className="text-accent hover:underline">
              CRM →
            </Link>
          )}
          <Link href="/admin/pipeline" className="text-muted hover:text-accent hover:underline">
            Pipeline →
          </Link>
          <Link href="/admin/payments" className="text-muted hover:text-accent hover:underline">
            Payments →
          </Link>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <p className="mb-2 text-[0.55rem] tracking-[0.12em] text-muted uppercase">Timeline · {stage}</p>
        <ol className="flex flex-wrap gap-2">
          {CLIENT_TIMELINE_STAGES.map((s, i) => (
            <li
              key={s.id}
              className={cn(
                "rounded border px-2 py-1 text-[0.6rem] tracking-[0.06em] uppercase",
                i <= timelineIdx
                  ? "border-accent/40 text-cream"
                  : "border-stone/20 text-muted"
              )}
            >
              {s.label}
            </li>
          ))}
        </ol>
      </div>

      {/* Client + Vision + Package */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-stone/15 p-4">
          <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">Client</p>
          <p className="mt-1 font-display text-lg text-cream">{asString(data.fullName) || "—"}</p>
          <p className="mt-1 text-xs text-fog">{asString(data.email)}</p>
          <p className="mt-1 text-xs text-fog">{asString(data.phone)}</p>
          {asString(data.businessName) && (
            <p className="mt-1 text-xs text-cream-dim">{asString(data.businessName)}</p>
          )}
        </section>
        <section className="rounded-lg border border-stone/15 p-4">
          <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">Selected experience</p>
          <p className="mt-1 font-display text-lg text-cream">
            {asString((data.qualification as Record<string, unknown> | undefined)?.packageName) ||
              asString(data.packageId) ||
              asString(data.projectCategory) ||
              "—"}
          </p>
          <p className="mt-2 text-xs text-fog">
            Add-ons:{" "}
            {asStringArray((data.qualification as Record<string, unknown> | undefined)?.addOnNames).join(
              ", "
            ) ||
              (Array.isArray(data.addOnIds) && data.addOnIds.length
                ? (data.addOnIds as string[]).join(", ")
                : "None")}
          </p>
        </section>
        <section className="rounded-lg border border-stone/15 p-4">
          <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">Vision</p>
          <p className="mt-2 line-clamp-5 text-xs text-fog">
            {asString(data.feelingPrompt) ||
              asString(data.purpose) ||
              asString(data.projectVision) ||
              "—"}
          </p>
        </section>
      </div>

      {/* Qualification */}
      {(() => {
        const q = data.qualification as Record<string, unknown> | undefined;
        if (!q || typeof q !== "object") return null;
        return (
          <section className="rounded-lg border border-accent/25 bg-accent/[0.04] p-4">
            <p className="text-[0.55rem] tracking-[0.12em] text-accent uppercase">
              Lead qualification · {(asString(q.truthLabel) || "estimated").toUpperCase()}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[0.55rem] text-muted uppercase">Est. value</p>
                <p className="font-display text-xl text-cream">
                  $
                  {typeof q.estimatedProjectValue === "number"
                    ? q.estimatedProjectValue.toLocaleString()
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-[0.55rem] text-muted uppercase">Lead score</p>
                <p className="font-display text-xl text-accent">
                  {typeof q.leadScore === "number" ? q.leadScore : "—"}
                </p>
              </div>
              <div>
                <p className="text-[0.55rem] text-muted uppercase">Close likelihood</p>
                <p className="font-display text-xl text-cream">
                  {typeof q.likelihoodToClose === "number" ? `${q.likelihoodToClose}%` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[0.55rem] text-muted uppercase">Priority</p>
                <p className="font-display text-xl text-cream capitalize">
                  {asString(q.priority) || "—"}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-cream-dim">{asString(q.aiSummary)}</p>
            <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted uppercase">Package</dt>
                <dd className="text-cream">{asString(q.packageName)}</dd>
              </div>
              <div>
                <dt className="text-muted uppercase">Add-ons</dt>
                <dd className="text-cream">
                  {asStringArray(q.addOnNames).join(", ") || "None"}
                </dd>
              </div>
              <div>
                <dt className="text-muted uppercase">Follow-up</dt>
                <dd className="text-cream">{asString(q.idealFollowUpLabel)}</dd>
              </div>
              <div>
                <dt className="text-muted uppercase">CRM segment</dt>
                <dd className="text-cream">{asString(q.crmSegment)}</dd>
              </div>
              <div>
                <dt className="text-muted uppercase">LTV (est.)</dt>
                <dd className="text-cream">
                  $
                  {typeof q.potentialLifetimeValue === "number"
                    ? q.potentialLifetimeValue.toLocaleString()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted uppercase">Recommended package</dt>
                <dd className="text-cream">{asString(q.recommendedPackage)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted uppercase">Recommended add-ons</dt>
                <dd className="text-cream">
                  {asStringArray(q.recommendedAddOns).join(" · ") || "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted uppercase">Suggested questions</dt>
                <dd className="text-fog">
                  {asStringArray(q.suggestedQuestions).join(" · ") || "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted uppercase">Upsell opportunities</dt>
                <dd className="text-emerald-300/80">
                  {asStringArray(q.upsellOpportunities).join(" · ") || "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted uppercase">Risks / incomplete</dt>
                <dd className="text-amber-200/80">
                  {[...asStringArray(q.risks), ...asStringArray(q.incompleteSignals)]
                    .slice(0, 5)
                    .join(" · ") || "—"}
                </dd>
              </div>
            </dl>
          </section>
        );
      })()}

      {/* Files */}
      <section className="rounded-lg border border-stone/15 p-4">
        <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">Files & inspiration</p>
        <ul className="mt-2 space-y-1 text-xs text-fog">
          {(["pinterestLink", "moodBoardUrl", "driveLink", "inspirationInstagram"] as const).map(
            (key) =>
              asString(data[key]) ? (
                <li key={key}>
                  <a
                    href={asString(data[key])!.startsWith("http") ? asString(data[key])! : undefined}
                    className="text-accent hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {key.replace(/([A-Z])/g, " $1")}: {asString(data[key])}
                  </a>
                </li>
              ) : null
          )}
          {!asString(data.pinterestLink) &&
            !asString(data.moodBoardUrl) &&
            !asString(data.driveLink) && (
              <li className="text-muted">No links attached</li>
            )}
        </ul>
      </section>

      {loading ? (
        <p className="text-xs text-muted">Loading production intel…</p>
      ) : error ? (
        <p className="text-xs text-amber-300">{error}</p>
      ) : (
        <>
          <section className="rounded-lg border border-accent/20 bg-accent/[0.03] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[0.55rem] tracking-[0.12em] text-accent uppercase">
                Creative brief · {(asString(brief.truthLabel) || "estimated").toUpperCase()}
              </p>
              <button
                type="button"
                onClick={() => void regenerate()}
                disabled={generating}
                className="text-[0.6rem] tracking-[0.08em] text-muted uppercase hover:text-accent disabled:opacity-40"
              >
                {generating ? "Generating…" : payload?.brief ? "Regenerate" : "Generate brief"}
              </button>
            </div>
            {payload?.brief ? (
              <div className="mt-3 space-y-3 text-xs">
                <p className="text-cream">{asString(brief.executiveSummary) || payload.brief.summary}</p>
                <pre className="whitespace-pre-wrap text-fog">
                  {asString(brief.creativeBrief) || "—"}
                </pre>
                <dl className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <dt className="text-muted uppercase">Package</dt>
                    <dd className="text-cream">{asString(brief.suggestedPackage)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted uppercase">Hours (est.)</dt>
                    <dd className="text-cream">{String(brief.estimatedProductionHours ?? "—")}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted uppercase">Sales notes</dt>
                    <dd className="text-cream-dim">{asString(brief.salesNotes)}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted uppercase">Follow-up</dt>
                    <dd className="text-cream-dim">{asString(brief.recommendedFollowUp)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted uppercase">Risks</dt>
                    <dd className="text-amber-200/80">
                      {asStringArray(brief.potentialRisks).join(" · ") || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted uppercase">Upsells</dt>
                    <dd className="text-emerald-300/80">
                      {asStringArray(brief.upsellOpportunities).join(" · ") || "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="mt-2 text-xs text-fog">
                No brief yet — generate to create Creative Brief + proposal draft.
              </p>
            )}
          </section>

          <section className="rounded-lg border border-stone/15 p-4">
            <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">
              Proposal draft · {proposalStatus} · human approval required
            </p>
            {payload?.proposal ? (
              <div className="mt-3 space-y-2 text-xs">
                <p className="text-cream">{asString(proposal.package)}</p>
                <p className="text-fog">{asString(proposal.timeline)}</p>
                <p className="text-emerald-400/90">
                  Investment signal ~$
                  {typeof proposal.estimatedInvestment === "number"
                    ? proposal.estimatedInvestment.toLocaleString()
                    : "—"}{" "}
                  (estimated)
                </p>
                <p className="text-muted">{asString(proposal.notes)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={emailHref}
                    className="rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-[0.6rem] tracking-[0.1em] text-accent uppercase hover:bg-accent/20"
                  >
                    Review &amp; send via Email →
                  </Link>
                  <span className="self-center text-[0.6rem] text-muted">
                    Never auto-sends — open Email to approve outbound.
                  </span>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-xs text-fog">Generate brief to create a proposal draft.</p>
            )}
          </section>
        </>
      )}

      {/* Tasks checklist */}
      <section className="rounded-lg border border-stone/15 p-4">
        <p className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">Tasks</p>
        <ul className="mt-2 space-y-1 text-xs text-fog">
          <li>□ Reply within 24h</li>
          <li>□ Confirm discovery call</li>
          <li>□ Review &amp; send proposal (human approval)</li>
          <li>□ Collect deposit / link payment</li>
          <li>□ Advance pipeline stage</li>
        </ul>
      </section>
    </div>
  );
}
