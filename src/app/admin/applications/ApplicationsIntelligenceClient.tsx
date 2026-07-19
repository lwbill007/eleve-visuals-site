"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminToast } from "@/components/admin/AdminToast";
import { WorkspaceEmpty, WorkspaceLoading } from "@/components/admin/os/WorkspaceFrame";
import { adminFetch } from "@/lib/admin-fetch";
import type { SessionApplicationRank } from "@/lib/ai/types";
import {
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUSES,
  SESSION_APPLICATION_ROLES,
  type ApplicationStatus,
  type SessionVolumeDTO,
} from "@/lib/types";
import { cn } from "@/lib/utils";

interface ApplicationRow {
  id: string;
  data: Record<string, unknown>;
  status: ApplicationStatus;
  notes: string;
  read: boolean;
  starred: boolean;
  createdAt: string;
}

type Tier = SessionApplicationRank["tier"];

const tierTone: Record<Tier, string> = {
  Exceptional: "border-fuchsia-300/40 bg-fuchsia-300/10 text-fuchsia-200",
  Elite: "border-accent/50 bg-accent/10 text-accent",
  Excellent: "border-emerald-400/35 bg-emerald-400/10 text-emerald-300",
  Strong: "border-sky-400/35 bg-sky-400/10 text-sky-300",
  Good: "border-stone/40 bg-stone/20 text-cream-dim",
  Average: "border-amber-400/35 bg-amber-400/10 text-amber-300",
  "Needs Review": "border-red-400/35 bg-red-400/10 text-red-300",
};

function asImages(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function categoryRate(candidate: SessionApplicationRank, key: SessionApplicationRank["categories"][number]["key"]) {
  const category = candidate.categories.find((item) => item.key === key);
  return category?.maxScore ? (category.score / category.maxScore) * 100 : 0;
}

function delta(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

function MetricCard({
  label,
  value,
  change,
  detail,
}: {
  label: string;
  value: string;
  change?: number;
  detail?: string;
}) {
  return (
    <div className="group rounded-xl border border-stone/20 bg-charcoal/20 p-3.5 transition-colors hover:border-accent/30">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.56rem] tracking-[0.14em] text-muted uppercase">{label}</p>
        {typeof change === "number" && (
          <span className={cn("text-[0.62rem]", change >= 0 ? "text-emerald-400" : "text-red-400")}>
            {change >= 0 ? "↗" : "↘"} {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-[1.75rem] leading-none text-cream">{value}</p>
      {detail && <p className="mt-2 truncate text-[0.62rem] text-muted">{detail}</p>}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 90 ? "#b8a88a" : score >= 80 ? "#6ee7b7" : score >= 75 ? "#fbbf24" : "#f87171";
  return (
    <div
      className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full"
      style={{ background: `conic-gradient(${color} ${score * 3.6}deg, rgba(255,255,255,.08) 0deg)` }}
      aria-label={`Overall score ${score}`}
    >
      <div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-ink">
        <div className="text-center">
          <p className="font-display text-2xl leading-none text-cream">{score.toFixed(1)}</p>
          <p className="mt-1 text-[0.48rem] tracking-widest text-muted uppercase">Score</p>
        </div>
      </div>
    </div>
  );
}

function ProbabilityBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-stone/40">
      <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
    </div>
  );
}

export default function ApplicationsIntelligenceClient() {
  const searchParams = useSearchParams();
  const { toast } = useAdminToast();
  const searchRef = useRef<HTMLInputElement>(null);
  const focusHandled = useRef(false);
  const [items, setItems] = useState<ApplicationRow[]>([]);
  const [ranked, setRanked] = useState<SessionApplicationRank[]>([]);
  const [volumes, setVolumes] = useState<SessionVolumeDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [volume, setVolume] = useState(searchParams.get("volumeId") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [role, setRole] = useState("");
  const [tier, setTier] = useState("");
  const [minimumScore, setMinimumScore] = useState(0);
  const [minimumConfidence, setMinimumConfidence] = useState(0);
  const [risk, setRisk] = useState("");
  const [verifiedPortfolio, setVerifiedPortfolio] = useState(false);
  const [available, setAvailable] = useState(false);
  const [advanced, setAdvanced] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const focusId = searchParams.get("focus");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    const suffix = volume ? `?volumeId=${encodeURIComponent(volume)}` : "";
    const [itemsResponse, rankResponse] = await Promise.all([
      adminFetch(`/api/admin/submissions?type=session${volume ? `&volumeId=${encodeURIComponent(volume)}` : ""}`),
      adminFetch(`/api/admin/ai/sessions/rank${suffix}`),
    ]);
    if (itemsResponse.ok) setItems((await itemsResponse.json()) as ApplicationRow[]);
    if (rankResponse.ok) {
      const payload = (await rankResponse.json()) as { ranked?: SessionApplicationRank[] };
      setRanked(payload.ranked ?? []);
    } else {
      toast("Hiring intelligence could not be loaded.", "error");
    }
    setLoading(false);
    setRefreshing(false);
  }, [toast, volume]);

  useEffect(() => {
    adminFetch("/api/admin/session-volumes")
      .then((response) => (response.ok ? response.json() : []))
      .then(setVolumes);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!focusId || focusHandled.current || loading) return;
    const target = ranked.find((item) => item.id === focusId);
    if (!target) return;
    focusHandled.current = true;
    setDetailId(focusId);
    const row = items.find((item) => item.id === focusId);
    if (row && !row.read) {
      void adminFetch("/api/admin/submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: focusId, read: true }),
      }).then((response) => {
        if (response.ok) void load(true);
      });
    }
  }, [focusId, items, loading, load, ranked]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setDetailId(null);
        setCompareOpen(false);
        setFilterOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return ranked.filter((candidate) => {
      const haystack = `${candidate.name} ${candidate.roles.join(" ")} ${candidate.badges.join(" ")} ${candidate.summary} ${candidate.strengths.join(" ")} ${candidate.dataQuality.location}`.toLowerCase();
      if (query) {
        const naturalMatches =
          (query.includes("best photographer") && candidate.roles.some((value) => value.toLowerCase().includes("photographer"))) ||
          (query.includes("highest business value") && categoryRate(candidate, "businessValue") >= 75) ||
          (query.includes("luxury") && categoryRate(candidate, "brandAlignment") >= 75) ||
          (query.includes("versatile") && categoryRate(candidate, "versatility") >= 70) ||
          (query.includes("highest confidence") && candidate.confidence >= 85) ||
          (query.includes("creative director") && candidate.roles.some((value) => value.toLowerCase().includes("director"))) ||
          haystack.includes(query);
        if (!naturalMatches) return false;
      }
      if (role && !candidate.roles.includes(role)) return false;
      if (statusFilter && candidate.status !== statusFilter) return false;
      if (tier && candidate.tier !== tier) return false;
      if (candidate.score < minimumScore || candidate.confidence < minimumConfidence) return false;
      if (risk && candidate.riskLevel !== risk) return false;
      if (verifiedPortfolio && candidate.dataQuality.portfolio !== "verified") return false;
      if (available && candidate.dataQuality.availability !== "confirmed") return false;
      if (advanced.includes("Luxury experience") && categoryRate(candidate, "brandAlignment") < 75) return false;
      if (advanced.includes("Commercial experience") && categoryRate(candidate, "businessValue") < 70) return false;
      if (advanced.includes("Editorial experience") && !haystack.includes("editorial")) return false;
      if (advanced.includes("Social presence") && candidate.dataQuality.social === "missing") return false;
      if (advanced.includes("Marketing reach") && categoryRate(candidate, "marketingImpact") < 65) return false;
      return true;
    });
  }, [advanced, available, minimumConfidence, minimumScore, ranked, risk, role, search, statusFilter, tier, verifiedPortfolio]);

  const overview = useMemo(() => {
    const now = Date.now();
    const current = ranked.filter((item) => now - new Date(item.createdAt).getTime() <= 30 * 86400000);
    const previous = ranked.filter((item) => {
      const age = now - new Date(item.createdAt).getTime();
      return age > 30 * 86400000 && age <= 60 * 86400000;
    });
    const values = (cohort: SessionApplicationRank[]) => ({
      score: average(cohort.map((item) => item.score)),
      confidence: average(cohort.map((item) => item.confidence)),
      brand: average(cohort.map((item) => categoryRate(item, "brandAlignment"))),
      reliability: average(cohort.map((item) => categoryRate(item, "reliability"))),
    });
    return { current, previous, currentValues: values(current), previousValues: values(previous) };
  }, [ranked]);

  const insights = useMemo(() => {
    if (!ranked.length) return [];
    const strongPortfolio = ranked.filter((item) => categoryRate(item, "portfolioQuality") >= 80).length;
    const premium = ranked.filter((item) => categoryRate(item, "brandAlignment") >= 85 && item.confidence >= 65).length;
    const longTerm = ranked.filter(
      (item) => (item.predictions.find((prediction) => prediction.key === "repeatBookings")?.probability ?? 0) >= 70
    ).length;
    const highRisk = ranked.filter((item) => item.riskLevel === "high").length;
    const scoreDelta = delta(overview.currentValues.score, overview.previousValues.score);
    return [
      {
        tone: "opportunity",
        title: `${strongPortfolio} candidate${strongPortfolio === 1 ? "" : "s"} clear the premium portfolio threshold`,
        detail: `${premium} combine strong luxury alignment with enough evidence for a confident review.`,
      },
      {
        tone: scoreDelta >= 0 ? "trend" : "risk",
        title: `Applicant quality is ${scoreDelta >= 0 ? "up" : "down"} ${Math.abs(scoreDelta)}% versus the prior 30-day cohort`,
        detail: "Scores compare only evidence-supported categories; missing information affects confidence separately.",
      },
      {
        tone: "opportunity",
        title: `${longTerm} profile${longTerm === 1 ? "" : "s"} show long-term collaboration potential`,
        detail: "Repeat-booking probabilities are directional ranges, not guarantees.",
      },
      {
        tone: highRisk ? "risk" : "trend",
        title: highRisk ? `${highRisk} high-risk application${highRisk === 1 ? "" : "s"} need evidence before action` : "No high-risk profiles in this cohort",
        detail: "Risk flags low evidence coverage, unconfirmed logistics, or weak reliability signals.",
      },
    ];
  }, [overview, ranked]);

  async function updateStatus(id: string, status: ApplicationStatus) {
    const sendsEmail = ["shortlisted", "interview", "accepted", "waitlisted", "declined"].includes(status);
    if (sendsEmail && !confirm(`Mark this applicant as ${APPLICATION_STATUS_LABELS[status]}? A status email may be sent.`)) return;
    const response = await adminFetch("/api/admin/submissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!response.ok) return toast("Status update failed.", "error");
    toast(`Marked ${APPLICATION_STATUS_LABELS[status]}.`);
    void load(true);
  }

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      else toast("Compare up to four candidates.");
      return next;
    });
  }

  function resetFilters() {
    setRole("");
    setStatusFilter("");
    setTier("");
    setMinimumScore(0);
    setMinimumConfidence(0);
    setRisk("");
    setVerifiedPortfolio(false);
    setAvailable(false);
    setAdvanced([]);
  }

  const detail = detailId ? ranked.find((item) => item.id === detailId) ?? null : null;
  const compareCandidates = ranked.filter((item) => selected.has(item.id));
  const activeFilters = [
    role,
    statusFilter,
    tier,
    minimumScore,
    minimumConfidence,
    risk,
    verifiedPortfolio,
    available,
    ...advanced,
  ].filter(Boolean).length;

  return (
    <AdminShell title="Applications Intelligence">
      <main className="relative min-h-screen overflow-hidden bg-ink px-4 py-6 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_35%_0%,rgba(184,168,138,.11),transparent_58%)]" />
        <div className="relative mx-auto max-w-[1600px]">
          <header className="flex flex-col gap-5 border-b border-stone/20 pb-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[0.6rem] tracking-[0.2em] text-accent uppercase">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                Executive talent intelligence · Live
              </div>
              <h2 className="max-w-3xl font-display text-4xl leading-none text-cream sm:text-5xl">
                Decide who creates the most value.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fog">
                Evidence-weighted rankings, confidence, risk, and opportunity—separated so every decision remains auditable.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={volume}
                onChange={(event) => setVolume(event.target.value)}
                className="min-h-10 w-auto rounded-lg border-stone/30 bg-charcoal/70 px-3 py-2 text-xs"
                aria-label="Application cycle"
              >
                <option value="">All application cycles</option>
                {volumes.map((item) => (
                  <option key={item.id} value={item.id}>Vol. {item.volumeNumber} — {item.title}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void load(true)}
                disabled={refreshing}
                className="min-h-10 rounded-lg border border-stone/30 px-3 text-xs text-fog transition-colors hover:border-accent/40 hover:text-cream disabled:opacity-50"
              >
                {refreshing ? "Recalculating…" : "↻ Refresh intelligence"}
              </button>
            </div>
          </header>

          {loading ? (
            <div className="mt-8"><WorkspaceLoading rows={9} /></div>
          ) : ranked.length === 0 ? (
            <div className="mt-8">
              <WorkspaceEmpty title="No applications to analyze" detail="Applications will be ranked as soon as a candidate submits evidence." />
            </div>
          ) : (
            <>
              <section className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-5 xl:grid-cols-10" aria-label="Executive overview">
                <MetricCard label="Applications" value={String(ranked.length)} change={delta(overview.current.length, overview.previous.length)} />
                <MetricCard label="Avg score" value={average(ranked.map((item) => item.score)).toFixed(1)} change={delta(overview.currentValues.score, overview.previousValues.score)} />
                <MetricCard label="Elite+" value={String(ranked.filter((item) => item.score >= 94).length)} detail="94 or above" />
                <MetricCard label="New" value={String(ranked.filter((item) => item.status === "pending_review").length)} detail="Awaiting review" />
                <MetricCard label="High risk" value={String(ranked.filter((item) => item.riskLevel === "high").length)} detail="Evidence gap" />
                <MetricCard label="Interviews" value={String(ranked.filter((item) => item.recommendation === "Invite to Interview").length)} detail="AI recommended" />
                <MetricCard label="Confidence" value={`${Math.round(average(ranked.map((item) => item.confidence)))}%`} change={delta(overview.currentValues.confidence, overview.previousValues.confidence)} />
                <MetricCard
                  label="Verified revenue"
                  value={
                    ranked.some((item) => item.expectedValue.basis === "verified")
                      ? formatMoney(ranked.reduce((sum, item) => sum + item.expectedValue.amount, 0))
                      : "—"
                  }
                  detail={ranked.some((item) => item.expectedValue.basis === "verified") ? "Settled payments only" : "Insufficient historical data"}
                />
                <MetricCard label="Brand fit" value={`${Math.round(average(ranked.map((item) => categoryRate(item, "brandAlignment"))))}%`} change={delta(overview.currentValues.brand, overview.previousValues.brand)} />
                <MetricCard label="Reliability" value={`${Math.round(average(ranked.map((item) => categoryRate(item, "reliability"))))}%`} change={delta(overview.currentValues.reliability, overview.previousValues.reliability)} />
              </section>

              <section className="mt-6 rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/[0.07] to-transparent p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[0.58rem] tracking-[0.18em] text-accent uppercase">✦ AI executive brief</p>
                    <h3 className="mt-1 text-xl text-cream">What deserves attention now</h3>
                  </div>
                  <p className="hidden text-[0.62rem] text-muted sm:block">Evidence model v2.0 · Human decision required</p>
                </div>
                <div className="mt-4 grid gap-2 lg:grid-cols-4">
                  {insights.map((insight) => (
                    <article key={insight.title} className="rounded-xl border border-stone/20 bg-ink/50 p-3.5">
                      <div className={cn("mb-2 h-1 w-7 rounded-full", insight.tone === "risk" ? "bg-amber-400" : insight.tone === "opportunity" ? "bg-emerald-400" : "bg-accent")} />
                      <p className="text-sm leading-snug text-cream">{insight.title}</p>
                      <p className="mt-2 text-[0.68rem] leading-relaxed text-muted">{insight.detail}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="sticky top-[65px] z-20 mt-6 rounded-xl border border-stone/20 bg-ink/90 p-3 backdrop-blur-xl">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                  <div className="relative min-w-0 flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">⌕</span>
                    <input
                      ref={searchRef}
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder='Ask: “Best photographers” or “Highest business value”'
                      className="min-h-11 rounded-lg border-stone/30 bg-charcoal/60 py-2.5 pl-9 pr-12 text-sm"
                    />
                    <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-stone/30 px-1.5 py-0.5 text-[0.55rem] text-muted">/</kbd>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setFilterOpen(!filterOpen)} className={cn("min-h-11 rounded-lg border px-3 text-xs", filterOpen || activeFilters ? "border-accent/40 bg-accent/10 text-accent" : "border-stone/30 text-fog")}>
                      Filters {activeFilters ? `· ${activeFilters}` : ""}
                    </button>
                    <button type="button" onClick={() => setCompareOpen(true)} disabled={selected.size < 2} className="min-h-11 rounded-lg border border-stone/30 px-3 text-xs text-fog disabled:opacity-35">
                      Compare {selected.size ? `· ${selected.size}` : ""}
                    </button>
                  </div>
                </div>
                {filterOpen && (
                  <div className="mt-3 grid gap-3 border-t border-stone/20 pt-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                    <select value={role} onChange={(event) => setRole(event.target.value)} className="min-h-10 rounded-lg py-2 text-xs">
                      <option value="">All roles</option>
                      {SESSION_APPLICATION_ROLES.map((item) => <option key={item}>{item}</option>)}
                    </select>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-10 rounded-lg py-2 text-xs">
                      <option value="">All statuses</option>
                      {APPLICATION_STATUSES.map((status) => (
                        <option key={status} value={status}>{APPLICATION_STATUS_LABELS[status]}</option>
                      ))}
                    </select>
                    <select value={tier} onChange={(event) => setTier(event.target.value)} className="min-h-10 rounded-lg py-2 text-xs">
                      <option value="">All tiers</option>
                      {Object.keys(tierTone).map((item) => <option key={item}>{item}</option>)}
                    </select>
                    <select value={minimumScore} onChange={(event) => setMinimumScore(Number(event.target.value))} className="min-h-10 rounded-lg py-2 text-xs">
                      <option value="0">Any score</option><option value="75">75+ Average</option><option value="85">85+ Strong</option><option value="90">90+ Excellent</option><option value="94">94+ Elite</option>
                    </select>
                    <select value={minimumConfidence} onChange={(event) => setMinimumConfidence(Number(event.target.value))} className="min-h-10 rounded-lg py-2 text-xs">
                      <option value="0">Any confidence</option><option value="60">60%+ confidence</option><option value="80">80%+ confidence</option><option value="90">90%+ confidence</option>
                    </select>
                    <select value={risk} onChange={(event) => setRisk(event.target.value)} className="min-h-10 rounded-lg py-2 text-xs">
                      <option value="">Any risk</option><option value="low">Low risk</option><option value="medium">Medium risk</option><option value="high">High risk</option>
                    </select>
                    <label className="flex min-h-10 items-center gap-2 rounded-lg border border-stone/30 px-3 text-xs text-fog"><input type="checkbox" checked={verifiedPortfolio} onChange={(event) => setVerifiedPortfolio(event.target.checked)} /> Verified portfolio</label>
                    <label className="flex min-h-10 items-center gap-2 rounded-lg border border-stone/30 px-3 text-xs text-fog"><input type="checkbox" checked={available} onChange={(event) => setAvailable(event.target.checked)} /> Available</label>
                    <div className="flex flex-wrap gap-1.5 sm:col-span-2 lg:col-span-4 xl:col-span-6">
                      {["Luxury experience", "Commercial experience", "Editorial experience", "Marketing reach", "Social presence"].map((item) => (
                        <button key={item} type="button" onClick={() => setAdvanced((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} className={cn("rounded-full border px-2.5 py-1.5 text-[0.62rem]", advanced.includes(item) ? "border-accent/40 bg-accent/10 text-accent" : "border-stone/30 text-muted")}>{item}</button>
                      ))}
                    </div>
                    <button type="button" onClick={resetFilters} className="text-left text-[0.65rem] text-muted hover:text-cream xl:text-right">Reset filters</button>
                  </div>
                )}
              </section>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-muted"><span className="text-cream">{filtered.length}</span> candidates · ranked by evidence-weighted score</p>
                <p className="text-[0.6rem] text-muted">98–100 is intentionally rare</p>
              </div>

              <section className="mt-3 space-y-3" aria-label="Ranked applicants">
                {filtered.map((candidate, index) => {
                  const item = itemById.get(candidate.id);
                  const images = asImages(item?.data.portfolioImages);
                  const photo = images[0];
                  return (
                    <article key={candidate.id} className="group overflow-hidden rounded-2xl border border-stone/20 bg-charcoal/15 transition-all hover:border-accent/30 hover:bg-charcoal/25">
                      <div className="flex flex-col gap-4 p-4 sm:p-5 xl:flex-row xl:items-center">
                        <div className="flex min-w-0 items-center gap-3 xl:w-[28%]">
                          <button type="button" onClick={() => toggleSelected(candidate.id)} className={cn("grid h-6 w-6 shrink-0 place-items-center rounded border text-xs", selected.has(candidate.id) ? "border-accent bg-accent text-ink" : "border-stone/40 text-transparent")} aria-label={`Select ${candidate.name} for comparison`}>✓</button>
                          <span className="w-6 shrink-0 text-center font-display text-lg text-muted">#{index + 1}</span>
                          <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-stone/40">
                            {photo ? <Image src={photo} alt="" fill sizes="56px" className="object-cover" /> : <div className="grid h-full place-items-center font-display text-xl text-muted">{candidate.name.charAt(0)}</div>}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="truncate text-base text-cream">{candidate.name}</h3>
                              <span className={cn("rounded-full border px-2 py-0.5 text-[0.53rem] tracking-wider uppercase", tierTone[candidate.tier])}>{candidate.tier}</span>
                            </div>
                            <p className="mt-1 truncate text-xs text-fog">{candidate.roles.join(" · ") || "Role not specified"}</p>
                            <p className="mt-1 text-[0.62rem] text-muted">{candidate.dataQuality.location} · {new Date(candidate.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 xl:w-[16%]">
                          <ScoreRing score={candidate.score} />
                          <div>
                            <p className="text-[0.55rem] tracking-wider text-muted uppercase">Confidence</p>
                            <p className="mt-1 text-lg text-cream">{candidate.confidence}%</p>
                            <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-stone/40"><div className="h-full bg-fog" style={{ width: `${candidate.confidence}%` }} /></div>
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap gap-1.5">
                            {candidate.badges.slice(0, 3).map((badge) => <span key={badge} className="rounded-full border border-stone/30 px-2 py-1 text-[0.56rem] text-fog">{badge}</span>)}
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-fog">{candidate.summary}</p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.62rem]">
                            <span className="text-emerald-300">↑ {candidate.strengths.slice(0, 3).join(" · ")}</span>
                            <span className={candidate.riskLevel === "high" ? "text-red-300" : candidate.riskLevel === "medium" ? "text-amber-300" : "text-muted"}>Risk · {candidate.riskLevel}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 border-t border-stone/20 pt-3 sm:grid-cols-4 xl:w-[26%] xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                          <div><p className="text-[0.52rem] tracking-wider text-muted uppercase">Decision</p><p className="mt-1 text-xs text-accent">{candidate.recommendation}</p></div>
                          <div>
                            <p className="text-[0.52rem] tracking-wider text-muted uppercase">Verified revenue</p>
                            {candidate.expectedValue.basis === "verified" ? (
                              <p className="mt-1 text-sm text-cream">{formatMoney(candidate.expectedValue.amount)}</p>
                            ) : (
                              <p className="mt-1 text-[0.62rem] leading-snug text-muted">Insufficient historical data</p>
                            )}
                          </div>
                          <div><p className="text-[0.52rem] tracking-wider text-muted uppercase">Portfolio</p><p className="mt-1 text-xs capitalize text-fog">{candidate.dataQuality.portfolio}</p></div>
                          <div><p className="text-[0.52rem] tracking-wider text-muted uppercase">Availability</p><p className="mt-1 text-xs capitalize text-fog">{candidate.dataQuality.availability}</p></div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1 border-t border-stone/15 bg-ink/30 px-4 py-2">
                        <button type="button" onClick={() => setDetailId(candidate.id)} className="rounded-lg bg-cream px-3 py-2 text-[0.62rem] tracking-wider text-ink uppercase">Review</button>
                        <button type="button" onClick={() => toggleSelected(candidate.id)} className="rounded-lg px-3 py-2 text-[0.62rem] text-fog hover:text-cream">Compare</button>
                        <a href={`mailto:${candidate.email}`} className="rounded-lg px-3 py-2 text-[0.62rem] text-fog hover:text-cream">Message</a>
                        <button type="button" onClick={() => void updateStatus(candidate.id, "shortlisted")} className="rounded-lg px-3 py-2 text-[0.62rem] text-fog hover:text-cream">Shortlist</button>
                        <button type="button" onClick={() => void updateStatus(candidate.id, "withdrawn")} className="rounded-lg px-3 py-2 text-[0.62rem] text-muted hover:text-cream">Archive</button>
                        <button type="button" onClick={() => void updateStatus(candidate.id, "declined")} className="rounded-lg px-3 py-2 text-[0.62rem] text-red-300/70 hover:text-red-300">Reject</button>
                      </div>
                    </article>
                  );
                })}
              </section>
            </>
          )}
        </div>
      </main>

      {detail && (
        <div className="fixed inset-0 z-[70] flex justify-end bg-ink/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${detail.name} intelligence report`}>
          <button type="button" className="absolute inset-0 cursor-default" onClick={() => setDetailId(null)} aria-label="Close report" />
          <aside className="relative h-full w-full max-w-3xl overflow-y-auto border-l border-stone/20 bg-ink p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[0.6rem] tracking-[0.18em] text-accent uppercase">Candidate intelligence report</p><h2 className="mt-1 text-3xl text-cream">{detail.name}</h2><p className="mt-1 text-sm text-fog">{detail.roles.join(" · ")}</p></div>
              <button type="button" onClick={() => setDetailId(null)} className="grid h-10 w-10 place-items-center rounded-full border border-stone/30 text-fog">×</button>
            </div>

            <section className="mt-6 grid gap-3 rounded-2xl border border-accent/25 bg-accent/[0.05] p-4 sm:grid-cols-[auto_1fr]">
              <ScoreRing score={detail.score} />
              <div>
                <div className="flex flex-wrap items-center gap-2"><span className={cn("rounded-full border px-2 py-1 text-[0.58rem] uppercase", tierTone[detail.tier])}>{detail.tier}</span><span className="text-xs text-fog">{detail.confidence}% confidence</span></div>
                <p className="mt-3 text-[0.58rem] tracking-wider text-muted uppercase">Recommended decision</p>
                <p className="mt-1 text-lg text-accent">{detail.recommendation}</p>
                <p className="mt-1 text-sm leading-relaxed text-fog">{detail.summary}</p>
                <p className="mt-3 text-xs text-amber-200"><span className="text-muted">Potential risk:</span> {detail.weakness}</p>
                <p className="mt-2 text-xs text-cream-dim"><span className="text-muted">Suggested next step:</span> {detail.recommendedProject} portfolio interview and paid test.</p>
              </div>
            </section>

            <section className="mt-6 rounded-xl border border-stone/20 bg-charcoal/15 p-4">
              <p className="text-[0.58rem] tracking-wider text-accent uppercase">Why ranked here</p>
              <p className="mt-2 text-sm leading-relaxed text-fog">{detail.reasonForRank}</p>
              {detail.tieBreak && (
                <div className="mt-3 border-t border-stone/15 pt-3">
                  <p className="text-[0.56rem] tracking-wider text-amber-300 uppercase">Tie-break vs {detail.tieBreak.comparedWith}</p>
                  <p className="mt-1 text-xs text-fog">{detail.tieBreak.detail}</p>
                  <p className="mt-2 text-[0.6rem] text-muted">Chain: {detail.tieBreak.chain.join(" → ")} · decided by {detail.tieBreak.decidedBy}</p>
                </div>
              )}
            </section>

            <section className="mt-7">
              <div className="flex items-end justify-between"><div><p className="text-[0.58rem] tracking-wider text-accent uppercase">Explainable score</p><h3 className="mt-1 text-2xl text-cream">Weighted evidence</h3></div><p className="text-[0.6rem] text-muted">Click any category to audit</p></div>
              <div className="mt-3 space-y-2">
                {detail.categories.map((category) => (
                  <details key={category.key} className="group rounded-xl border border-stone/20 bg-charcoal/15 open:border-accent/25">
                    <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5">
                      <div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="text-sm text-cream">{category.label}</p><p className="text-sm text-cream">{category.score.toFixed(1)} <span className="text-muted">/ {category.maxScore}</span></p></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone/40"><div className="h-full rounded-full bg-accent" style={{ width: `${(category.score / category.maxScore) * 100}%` }} /></div></div>
                      <span className="text-xs text-muted">⌄</span>
                    </summary>
                    <div className="grid gap-4 border-t border-stone/15 p-4 text-xs sm:grid-cols-2">
                      <div><p className="text-[0.56rem] tracking-wider text-emerald-300 uppercase">Evidence used</p><ul className="mt-2 space-y-1.5 text-fog">{category.evidence.length ? category.evidence.map((value) => <li key={value}>✓ {value}</li>) : <li>No supporting evidence</li>}</ul></div>
                      <div><p className="text-[0.56rem] tracking-wider text-amber-300 uppercase">Missing / improve</p><ul className="mt-2 space-y-1.5 text-fog">{[...category.missing, ...category.improvements].map((value) => <li key={value}>• {value}</li>)}</ul></div>
                      <p className="sm:col-span-2 text-muted">{category.explanation} · Category confidence {category.confidence}%.</p>
                    </div>
                  </details>
                ))}
              </div>
            </section>

            <section className="mt-7">
              <p className="text-[0.58rem] tracking-wider text-accent uppercase">Business intelligence</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {detail.predictions.map((prediction) => (
                  <div key={prediction.key} className="rounded-xl border border-stone/20 p-3.5">
                    <div className="flex items-center justify-between"><p className="text-xs text-fog">{prediction.label}</p><p className="text-sm text-cream">{prediction.probability}%</p></div>
                    <div className="mt-2"><ProbabilityBar value={prediction.probability} /></div>
                    <p className="mt-2 text-[0.58rem] text-muted">{prediction.low}–{prediction.high}% interval · {prediction.confidence}% model confidence</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                <p className="text-[0.58rem] tracking-wider text-emerald-300 uppercase">Verified revenue to ÉLEVÉ</p>
                {detail.expectedValue.basis === "verified" ? (
                  <p className="mt-1 text-2xl text-cream">{formatMoney(detail.expectedValue.amount)}</p>
                ) : (
                  <p className="mt-1 text-lg text-muted">Insufficient historical data</p>
                )}
                <p className="mt-1 text-xs text-fog">{detail.expectedValue.rationale}</p>
              </div>
            </section>

            <details className="mt-7 rounded-xl border border-stone/20 p-4">
              <summary className="cursor-pointer text-sm text-cream">Transparency, limitations & audit</summary>
              <div className="mt-3 space-y-2 text-xs leading-relaxed text-fog">
                <p><span className="text-accent">Evidence:</span> {detail.dataQuality.evidenceCount} application signals across {detail.categories.filter((item) => item.confidence > 0).length} assessed categories.</p>
                <p><span className="text-accent">Missing:</span> {detail.dataQuality.missingFields.join(" · ") || "No material form gaps detected."}</p>
                <p><span className="text-accent">Fairness guardrail:</span> Age, gender, race, and other protected traits are not used. Workflow status is excluded from quality scoring to prevent outcome leakage.</p>
                <p><span className="text-accent">Limitation:</span> Predictions are directional ranges based on supplied evidence and role assumptions. They must not be treated as guarantees.</p>
              </div>
            </details>
          </aside>
        </div>
      )}

      {compareOpen && compareCandidates.length >= 2 && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-ink/90 p-4 backdrop-blur-xl sm:p-8" role="dialog" aria-modal="true" aria-label="Candidate comparison">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-start justify-between"><div><p className="text-[0.6rem] tracking-[0.18em] text-accent uppercase">AI candidate comparison</p><h2 className="mt-1 text-4xl text-cream">Evidence, side by side.</h2><p className="mt-2 max-w-3xl text-sm text-fog">Recommended choice: <span className="text-accent">{compareCandidates[0].name}</span>. {compareCandidates[0].reasonForRank}</p></div><button type="button" onClick={() => setCompareOpen(false)} className="grid h-11 w-11 place-items-center rounded-full border border-stone/30 text-xl text-fog">×</button></div>
            <div className="mt-6 overflow-x-auto">
              <div className="grid min-w-[760px] gap-3" style={{ gridTemplateColumns: `160px repeat(${compareCandidates.length}, minmax(180px, 1fr))` }}>
                <div />
                {compareCandidates.map((candidate) => <div key={candidate.id} className="rounded-xl border border-accent/20 bg-accent/[0.04] p-4"><p className="text-lg text-cream">{candidate.name}</p><p className="mt-1 text-xs text-fog">{candidate.roles.join(" · ")}</p><div className="mt-3 flex items-baseline gap-2"><span className="font-display text-3xl text-accent">{candidate.score.toFixed(1)}</span><span className="text-xs text-muted">{candidate.confidence}% confidence</span></div></div>)}
                {[
                  ["Portfolio", "portfolioQuality"],
                  ["Brand fit", "brandAlignment"],
                  ["Business value", "businessValue"],
                  ["Experience", "experience"],
                  ["Versatility", "versatility"],
                  ["Reliability", "reliability"],
                  ["Marketing value", "marketingImpact"],
                ].map(([label, key]) => (
                  <div key={key} className="contents">
                    <div className="flex items-center border-b border-stone/15 py-3 text-xs text-muted">{label}</div>
                    {compareCandidates.map((candidate) => { const value = categoryRate(candidate, key as SessionApplicationRank["categories"][number]["key"]); return <div key={candidate.id + key} className="border-b border-stone/15 py-3"><div className="flex justify-between text-xs"><span className="text-fog">{Math.round(value)}%</span></div><div className="mt-2"><ProbabilityBar value={value} /></div></div>; })}
                  </div>
                ))}
                <div className="py-3 text-xs text-muted">Verified revenue</div>
                {compareCandidates.map((candidate) => (
                  <div key={candidate.id} className="py-3 text-sm text-cream">
                    {candidate.expectedValue.basis === "verified" ? formatMoney(candidate.expectedValue.amount) : <span className="text-xs text-muted">Insufficient historical data</span>}
                  </div>
                ))}
                <div className="py-3 text-xs text-muted">Strengths</div>
                {compareCandidates.map((candidate) => <div key={candidate.id} className="py-3 text-xs leading-relaxed text-emerald-300">{candidate.strengths.join(" · ")}</div>)}
                <div className="py-3 text-xs text-muted">Weakness</div>
                {compareCandidates.map((candidate) => <div key={candidate.id} className="py-3 text-xs leading-relaxed text-amber-200">{candidate.weakness}</div>)}
                <div className="py-3 text-xs text-muted">Why this order</div>
                {compareCandidates.map((candidate) => <div key={candidate.id} className="py-3 text-xs leading-relaxed text-fog">{candidate.reasonForRank}</div>)}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
