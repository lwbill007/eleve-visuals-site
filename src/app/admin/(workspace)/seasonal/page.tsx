"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminField, AdminInput, AdminTextarea, ImageUpload, VideoUpload } from "@/components/admin/AdminForm";
import { WorkspaceChrome } from "@/components/admin/os/WorkspaceFrame";
import { osEyebrow } from "@/lib/ai/platform/os-systems";
import { adminFetch } from "@/lib/admin-fetch";
import { useUnsavedChangesWarning } from "@/hooks/useAdminEditor";
import { cn } from "@/lib/utils";
import { DEFAULT_SEASONAL_CONFIG } from "@/lib/seasonal/defaults";
import { contrastRatio, resolveSeasonal, scheduleWindow, SEASONAL_REASON_LABELS } from "@/lib/seasonal/resolve";
import {
  describeIssues,
  seasonalConfigSchema,
  type SeasonalCampaign,
  type SeasonalConfig,
  type SeasonalMode,
  type SeasonalServiceCard,
} from "@/lib/seasonal/schema";

interface HistoryRow {
  index: number;
  publishedAt: string;
  publishedBy: string | null;
  mode: SeasonalMode;
  campaignName: string;
}

interface AdminState {
  published: SeasonalConfig;
  publishedValid: boolean;
  draft: SeasonalConfig;
  hasDraft: boolean;
  live: { campaignId: string | null; reason: keyof typeof SEASONAL_REASON_LABELS; label: string; nextBoundary: number | null };
  history: HistoryRow[];
  canPublish: boolean;
  canEdit: boolean;
}

const TIME_ZONES = ["America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "UTC"];

const btn =
  "inline-flex min-h-11 items-center justify-center rounded-lg border px-4 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const btnGhost = `${btn} border-stone/50 text-cream hover:border-accent`;
const btnPrimary = `${btn} border-accent bg-accent text-ink hover:bg-cream`;
const card = "rounded-2xl border border-stone/30 bg-charcoal/40 p-5 md:p-6";

function formatInstant(value: number | string | null | undefined, timeZone = "America/Los_Angeles") {
  if (value === null || value === undefined || value === "") return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  // dateStyle/timeStyle can't be combined with timeZoneName, so spell the fields out.
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(date);
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

export default function SeasonalCampaignsPage() {
  const [state, setState] = useState<AdminState | null>(null);
  const [draft, setDraft] = useState<SeasonalConfig>(DEFAULT_SEASONAL_CONFIG);
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(DEFAULT_SEASONAL_CONFIG));
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "publish" | "rollback">("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string; issues?: string[] } | null>(null);
  const [previewMode, setPreviewMode] = useState<"campaign" | "default">("campaign");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewNonce, setPreviewNonce] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const res = await adminFetch("/api/admin/seasonal", { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as AdminState;
      setState(data);
      setDraft(data.draft);
      setSavedSnapshot(JSON.stringify(data.draft));
    } catch {
      setLoadError("Seasonal settings could not be loaded. The public site keeps showing its last published state.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = JSON.stringify(draft) !== savedSnapshot;
  useUnsavedChangesWarning(dirty);

  const campaign = draft.campaigns.find((c) => c.id === draft.activeCampaignId) ?? draft.campaigns[0];
  const validation = useMemo(() => seasonalConfigSchema.safeParse(draft), [draft]);
  const issues = validation.success ? [] : describeIssues(validation.error);
  const draftResolution = useMemo(() => resolveSeasonal(draft), [draft]);
  const publishedMatchesDraft = state ? JSON.stringify(state.published) === JSON.stringify({ ...draft, updatedAt: state.published.updatedAt, updatedBy: state.published.updatedBy }) : true;
  const window_ = campaign ? scheduleWindow(campaign) : null;
  const goldContrast = campaign ? contrastRatio(campaign.accent.gold, campaign.accent.onyx) : 21;
  const creamContrast = campaign ? contrastRatio(campaign.accent.cream, campaign.accent.burgundy) : 21;

  function updateCampaign(patch: (c: SeasonalCampaign) => SeasonalCampaign) {
    setDraft((prev) => ({
      ...prev,
      campaigns: prev.campaigns.map((c) => (c.id === prev.activeCampaignId ? patch(c) : c)),
    }));
  }

  function updateCard(index: number, patch: Partial<SeasonalServiceCard>) {
    updateCampaign((c) => ({
      ...c,
      experience: {
        ...c.experience,
        cards: c.experience.cards.map((card, i) => (i === index ? { ...card, ...patch } : card)),
      },
    }));
  }

  function addCampaignFromCurrent() {
    if (!campaign) return;
    const name = window.prompt("Name for the new campaign (e.g. Valentine's Edition)");
    if (!name?.trim()) return;
    const base = slugify(name) || "campaign";
    let id = base;
    let n = 2;
    while (draft.campaigns.some((c) => c.id === id || c.slug === id)) id = `${base}-${n++}`;
    const copy: SeasonalCampaign = {
      ...structuredClone(campaign),
      id,
      slug: id,
      trackingId: id,
      name: name.trim(),
      enabled: true,
    };
    setDraft((prev) => ({ ...prev, campaigns: [...prev.campaigns, copy], activeCampaignId: id }));
    setMessage({ tone: "ok", text: `“${name.trim()}” created as a copy. Update its copy, links and schedule, then save the draft.` });
  }

  async function saveDraft(): Promise<boolean> {
    if (!validation.success) {
      setMessage({ tone: "error", text: "Fix the highlighted settings before saving.", issues });
      return false;
    }
    setBusy("save");
    try {
      const res = await adminFetch("/api/admin/seasonal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "error", text: data.error ?? "Draft could not be saved.", issues: data.issues });
        return false;
      }
      setSavedSnapshot(JSON.stringify(draft));
      setMessage({ tone: "ok", text: "Draft saved. The public site has not changed." });
      return true;
    } finally {
      setBusy("");
    }
  }

  async function openPreview(mode: "campaign" | "default") {
    if (dirty && !(await saveDraft())) return;
    setPreviewMode(mode);
    setPreviewOpen(true);
    setPreviewNonce((n) => n + 1);
  }

  async function publish() {
    if (!state || !campaign) return;
    if (!validation.success) {
      setMessage({ tone: "error", text: "Fix the highlighted settings before publishing.", issues });
      return;
    }
    const outcome = SEASONAL_REASON_LABELS[draftResolution.reason];
    const ok = window.confirm(
      `Publish to the live website?\n\nMode: ${draft.mode === "campaign" ? `${campaign.name} (manual)` : draft.mode === "scheduled" ? `Scheduled — ${campaign.name}` : "Default ÉLEVÉ"}\nResult right now: ${outcome}\n\nVisitors see the change within about a minute. You can switch back or roll back at any time.`
    );
    if (!ok) return;
    setBusy("publish");
    try {
      const res = await adminFetch("/api/admin/seasonal/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: draft, expectedUpdatedAt: state.published.updatedAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "error", text: data.error ?? "Publish failed. Nothing changed on the live site.", issues: data.issues });
        return;
      }
      setMessage({ tone: "ok", text: `Published. ${data.live?.label ?? ""}` });
      await load();
    } finally {
      setBusy("");
    }
  }

  async function rollback() {
    if (!state?.history.length) return;
    const prev = state.history[0];
    const ok = window.confirm(
      `Restore the version published ${formatInstant(prev.publishedAt)} (${prev.mode === "default" ? "Default ÉLEVÉ" : `${prev.mode} · ${prev.campaignName}`})?\n\nThis replaces what is live now.`
    );
    if (!ok) return;
    setBusy("rollback");
    try {
      const res = await adminFetch("/api/admin/seasonal/rollback", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ tone: "error", text: data.error ?? "Rollback failed. Nothing changed." });
        return;
      }
      setMessage({ tone: "ok", text: `Rolled back. ${data.live?.label ?? ""}` });
      await load();
    } finally {
      setBusy("");
    }
  }

  function discardDraft() {
    if (!state) return;
    if (!window.confirm("Discard draft changes and reload the published settings?")) return;
    setDraft(state.published);
    setMessage({ tone: "ok", text: "Editor reset to the published settings. Save the draft to keep this." });
  }

  const previewSrc = `/api/admin/seasonal/preview?mode=${previewMode}&path=${encodeURIComponent("/")}&n=${previewNonce}`;
  const readOnly = state ? !state.canEdit : true;

  return (
    <AdminShell title="Seasonal Campaigns">
      <WorkspaceChrome
        eyebrow={osEyebrow("create", "Which edition is the site wearing?")}
        title="Seasonal Campaigns"
        description="Switch the public website between Default ÉLEVÉ and a seasonal campaign, schedule it, preview it privately and roll back. Your default homepage content is never changed."
        onRefresh={() => void load()}
      >
        {loadError ? (
          <p className="rounded-xl border border-red-400/40 bg-red-950/30 p-4 text-sm text-red-200" role="alert">{loadError}</p>
        ) : null}

        {!state ? (
          !loadError && <p className="text-sm text-fog" aria-busy="true">Loading seasonal settings…</p>
        ) : (
          <div className="space-y-6 pb-4">
            {/* Live status */}
            <section className={card} aria-labelledby="seasonal-live">
              <h2 id="seasonal-live" className="text-xs tracking-[0.2em] text-fog uppercase">Live website now</h2>
              <p className="mt-2 font-display text-2xl text-cream">
                {state.live.campaignId
                  ? state.published.campaigns.find((c) => c.id === state.live.campaignId)?.name
                  : "Default ÉLEVÉ"}
              </p>
              <p className="mt-1 text-sm text-cream-dim">{state.live.label}</p>
              {state.live.nextBoundary ? (
                <p className="mt-1 text-sm text-fog">Next automatic change: {formatInstant(state.live.nextBoundary)}</p>
              ) : null}
              <p className="mt-3 text-xs text-muted">
                Last published {formatInstant(state.published.updatedAt)}
                {state.published.updatedBy ? ` by ${state.published.updatedBy}` : ""}
                {!state.publishedValid ? " · stored settings were unreadable; the site is safely on Default ÉLEVÉ" : ""}
              </p>
            </section>

            {/* Mode */}
            <section className={card} aria-labelledby="seasonal-mode">
              <h2 id="seasonal-mode" className="font-display text-xl text-cream">1 · Website appearance</h2>
              <fieldset className="mt-4" disabled={readOnly}>
                <legend className="sr-only">Website appearance mode</legend>
                <div className="grid gap-3 md:grid-cols-3">
                  {(
                    [
                      ["default", "Default ÉLEVÉ", "The permanent website. Always the safe fallback."],
                      ["campaign", campaign?.name ?? "Campaign", "Campaign on now, until you switch back. Dates are ignored."],
                      ["scheduled", "Scheduled", "Campaign switches on and off by itself on the dates below."],
                    ] as const
                  ).map(([value, label, hint]) => (
                    <label
                      key={value}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-xl border p-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                        draft.mode === value ? "border-accent bg-accent/10" : "border-stone/40 hover:border-stone"
                      )}
                    >
                      <input
                        type="radio"
                        name="seasonal-mode"
                        value={value}
                        checked={draft.mode === value}
                        onChange={() => setDraft((prev) => ({ ...prev, mode: value }))}
                        className="mt-1 accent-[var(--color-accent)]"
                      />
                      <span>
                        <span className="block text-sm text-cream">{label}</span>
                        <span className="mt-1 block text-xs text-fog">{hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <p className="mt-4 text-sm text-cream-dim" role="status">
                If published now: <strong className="text-cream">{SEASONAL_REASON_LABELS[draftResolution.reason]}</strong>
              </p>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <AdminField label="Campaign being edited">
                  <select
                    value={draft.activeCampaignId}
                    disabled={readOnly}
                    onChange={(e) => setDraft((prev) => ({ ...prev, activeCampaignId: e.target.value }))}
                  >
                    {draft.campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </AdminField>
                <button type="button" className={btnGhost} onClick={addCampaignFromCurrent} disabled={readOnly}>
                  New campaign from this one
                </button>
              </div>
            </section>

            {campaign ? (
              <>
                {/* Schedule */}
                <section className={card} aria-labelledby="seasonal-schedule">
                  <h2 id="seasonal-schedule" className="font-display text-xl text-cream">2 · Schedule</h2>
                  <p className="mt-1 text-sm text-fog">Used only in Scheduled mode. The campaign is on from the start time and off from the end time.</p>
                  <fieldset className="mt-4 grid gap-4 md:grid-cols-3" disabled={readOnly}>
                    <AdminField label="Starts">
                      <AdminInput
                        type="datetime-local"
                        value={campaign.schedule.start}
                        onChange={(e) => updateCampaign((c) => ({ ...c, schedule: { ...c.schedule, start: e.target.value } }))}
                      />
                    </AdminField>
                    <AdminField label="Ends (off from this moment)">
                      <AdminInput
                        type="datetime-local"
                        value={campaign.schedule.end}
                        onChange={(e) => updateCampaign((c) => ({ ...c, schedule: { ...c.schedule, end: e.target.value } }))}
                      />
                    </AdminField>
                    <AdminField label="Time zone">
                      <select
                        value={campaign.schedule.timeZone}
                        onChange={(e) => updateCampaign((c) => ({ ...c, schedule: { ...c.schedule, timeZone: e.target.value } }))}
                      >
                        {TIME_ZONES.map((tz) => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                    </AdminField>
                  </fieldset>
                  <p className={cn("mt-3 text-sm", window_ ? "text-cream-dim" : "text-red-300")}>
                    {window_
                      ? `On ${formatInstant(window_.start, campaign.schedule.timeZone)} → off ${formatInstant(window_.end, campaign.schedule.timeZone)}`
                      : "The end must be after the start."}
                  </p>
                  <label className="mt-4 flex items-center gap-3 text-sm text-cream">
                    <input
                      type="checkbox"
                      checked={campaign.enabled}
                      disabled={readOnly}
                      onChange={(e) => updateCampaign((c) => ({ ...c, enabled: e.target.checked }))}
                    />
                    Campaign enabled (turn off to force Default ÉLEVÉ in every mode)
                  </label>
                </section>

                {/* Hero */}
                <section className={card} aria-labelledby="seasonal-hero">
                  <h2 id="seasonal-hero" className="font-display text-xl text-cream">3 · Campaign hero</h2>
                  <fieldset className="mt-4 grid gap-4 md:grid-cols-2" disabled={readOnly}>
                    <AdminField label="Campaign name">
                      <AdminInput value={campaign.name} onChange={(e) => updateCampaign((c) => ({ ...c, name: e.target.value }))} />
                    </AdminField>
                    <AdminField label="Campaign subtitle / descriptor" hint="Small line above the headline">
                      <AdminInput value={campaign.subtitle} onChange={(e) => updateCampaign((c) => ({ ...c, subtitle: e.target.value }))} />
                    </AdminField>
                    <AdminField label="Hero headline">
                      <AdminInput value={campaign.headline} onChange={(e) => updateCampaign((c) => ({ ...c, headline: e.target.value }))} />
                    </AdminField>
                    <AdminField label="Secondary line">
                      <AdminInput value={campaign.secondaryLine} onChange={(e) => updateCampaign((c) => ({ ...c, secondaryLine: e.target.value }))} />
                    </AdminField>
                    <div className="md:col-span-2">
                      <AdminField label="Hero description">
                        <AdminTextarea value={campaign.description} onChange={(e) => updateCampaign((c) => ({ ...c, description: e.target.value }))} />
                      </AdminField>
                    </div>
                    <AdminField label="Primary button text">
                      <AdminInput value={campaign.primaryCta.label} onChange={(e) => updateCampaign((c) => ({ ...c, primaryCta: { ...c.primaryCta, label: e.target.value } }))} />
                    </AdminField>
                    <AdminField label="Primary button link" hint="A site path like /editions/holiday or #holiday-edition">
                      <AdminInput value={campaign.primaryCta.href} onChange={(e) => updateCampaign((c) => ({ ...c, primaryCta: { ...c.primaryCta, href: e.target.value } }))} />
                    </AdminField>
                    <AdminField label="Secondary button text">
                      <AdminInput value={campaign.secondaryCta.label} onChange={(e) => updateCampaign((c) => ({ ...c, secondaryCta: { ...c.secondaryCta, label: e.target.value } }))} />
                    </AdminField>
                    <AdminField label="Secondary button link">
                      <AdminInput value={campaign.secondaryCta.href} onChange={(e) => updateCampaign((c) => ({ ...c, secondaryCta: { ...c.secondaryCta, href: e.target.value } }))} />
                    </AdminField>
                  </fieldset>
                  <p className="mt-6 text-sm text-fog">
                    Images are optional. With none, the hero uses the typographic design. Only use approved, rights-cleared ÉLEVÉ work.
                  </p>
                  <div className="mt-4 grid gap-6 md:grid-cols-2">
                    <ImageUpload label="Desktop hero image" value={campaign.heroImageDesktop} onChange={(url) => updateCampaign((c) => ({ ...c, heroImageDesktop: url }))} />
                    <ImageUpload label="Mobile hero image (portrait crop)" value={campaign.heroImageMobile} onChange={(url) => updateCampaign((c) => ({ ...c, heroImageMobile: url }))} />
                    <AdminField label="Hero image description (alt text)">
                      <AdminInput value={campaign.heroImageAlt} disabled={readOnly} onChange={(e) => updateCampaign((c) => ({ ...c, heroImageAlt: e.target.value }))} />
                    </AdminField>
                    <VideoUpload label="Optional hero video" hint="Muted loop. The desktop image is used as its poster." value={campaign.heroVideo} onChange={(url) => updateCampaign((c) => ({ ...c, heroVideo: url }))} />
                  </div>
                </section>

                {/* Announcement + nav + sections */}
                <section className={card} aria-labelledby="seasonal-surfaces">
                  <h2 id="seasonal-surfaces" className="font-display text-xl text-cream">4 · Announcement, navigation and sections</h2>
                  <fieldset className="mt-4 space-y-4" disabled={readOnly}>
                    <label className="flex items-center gap-3 text-sm text-cream">
                      <input type="checkbox" checked={campaign.announcement.enabled} onChange={(e) => updateCampaign((c) => ({ ...c, announcement: { ...c.announcement, enabled: e.target.checked } }))} />
                      Show announcement bar
                    </label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <AdminField label="Announcement text">
                        <AdminInput value={campaign.announcement.text} onChange={(e) => updateCampaign((c) => ({ ...c, announcement: { ...c.announcement, text: e.target.value } }))} />
                      </AdminField>
                      <AdminField label="Announcement link (optional)">
                        <AdminInput value={campaign.announcement.href} onChange={(e) => updateCampaign((c) => ({ ...c, announcement: { ...c.announcement, href: e.target.value } }))} />
                      </AdminField>
                    </div>
                    <label className="flex items-center gap-3 text-sm text-cream">
                      <input type="checkbox" checked={campaign.nav.enabled} onChange={(e) => updateCampaign((c) => ({ ...c, nav: { ...c.nav, enabled: e.target.checked } }))} />
                      Add a navigation item
                    </label>
                    <AdminField label="Navigation label" hint={`Links to /editions/${campaign.slug}`}>
                      <AdminInput value={campaign.nav.label} onChange={(e) => updateCampaign((c) => ({ ...c, nav: { ...c.nav, label: e.target.value } }))} />
                    </AdminField>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {(
                        [
                          ["hero", "Replace homepage hero"],
                          ["experience", "Show campaign section on homepage"],
                          ["landingPage", `Landing page /editions/${campaign.slug}`],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-3 text-sm text-cream">
                          <input
                            type="checkbox"
                            checked={campaign.sections[key]}
                            onChange={(e) => updateCampaign((c) => ({ ...c, sections: { ...c.sections, [key]: e.target.checked } }))}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </section>

                {/* Service cards */}
                <section className={card} aria-labelledby="seasonal-cards">
                  <h2 id="seasonal-cards" className="font-display text-xl text-cream">5 · Campaign services</h2>
                  <p className="mt-1 text-sm text-fog">
                    Buttons lead to the existing booking and contact forms. Approved prices stay authoritative. Don&apos;t add prices or discounts here.
                  </p>
                  <fieldset className="mt-4 grid gap-4 md:grid-cols-3" disabled={readOnly}>
                    <AdminField label="Section eyebrow">
                      <AdminInput value={campaign.experience.eyebrow} onChange={(e) => updateCampaign((c) => ({ ...c, experience: { ...c.experience, eyebrow: e.target.value } }))} />
                    </AdminField>
                    <AdminField label="Section heading">
                      <AdminInput value={campaign.experience.heading} onChange={(e) => updateCampaign((c) => ({ ...c, experience: { ...c.experience, heading: e.target.value } }))} />
                    </AdminField>
                    <AdminField label="Section intro">
                      <AdminInput value={campaign.experience.intro} onChange={(e) => updateCampaign((c) => ({ ...c, experience: { ...c.experience, intro: e.target.value } }))} />
                    </AdminField>
                  </fieldset>
                  <div className="mt-6 grid gap-6 lg:grid-cols-3">
                    {campaign.experience.cards.map((item, index) => (
                      <fieldset key={item.id} className="space-y-3 rounded-xl border border-stone/30 p-4" disabled={readOnly}>
                        <legend className="px-1 text-xs tracking-[0.18em] text-fog uppercase">Card {index + 1}</legend>
                        <label className="flex items-center gap-3 text-sm text-cream">
                          <input type="checkbox" checked={item.enabled} onChange={(e) => updateCard(index, { enabled: e.target.checked })} />
                          Visible
                        </label>
                        <AdminField label="Title"><AdminInput value={item.title} onChange={(e) => updateCard(index, { title: e.target.value })} /></AdminField>
                        <AdminField label="Eyebrow"><AdminInput value={item.eyebrow} onChange={(e) => updateCard(index, { eyebrow: e.target.value })} /></AdminField>
                        <AdminField label="Description"><AdminTextarea value={item.description} onChange={(e) => updateCard(index, { description: e.target.value })} /></AdminField>
                        <AdminField label="Small note"><AdminInput value={item.note} onChange={(e) => updateCard(index, { note: e.target.value })} /></AdminField>
                        <AdminField label="Button text"><AdminInput value={item.cta.label} onChange={(e) => updateCard(index, { cta: { ...item.cta, label: e.target.value } })} /></AdminField>
                        <AdminField label="Button link" hint="Keep campaign=… in the link so inquiries are tagged">
                          <AdminInput value={item.cta.href} onChange={(e) => updateCard(index, { cta: { ...item.cta, href: e.target.value } })} />
                        </AdminField>
                        <ImageUpload label="Image (optional)" value={item.image} onChange={(url) => updateCard(index, { image: url })} />
                        <AdminField label="Image description (alt text)"><AdminInput value={item.imageAlt} onChange={(e) => updateCard(index, { imageAlt: e.target.value })} /></AdminField>
                      </fieldset>
                    ))}
                  </div>
                </section>

                {/* Accent colours */}
                <section className={card} aria-labelledby="seasonal-colours">
                  <h2 id="seasonal-colours" className="font-display text-xl text-cream">6 · Accent colours</h2>
                  <p className="mt-1 text-sm text-fog">Applied only to campaign elements. The permanent brand colours are untouched.</p>
                  <fieldset className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" disabled={readOnly}>
                    {(["onyx", "cream", "gold", "burgundy"] as const).map((key) => (
                      <AdminField key={key} label={key[0].toUpperCase() + key.slice(1)}>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            aria-label={`${key} colour picker`}
                            value={campaign.accent[key]}
                            onChange={(e) => updateCampaign((c) => ({ ...c, accent: { ...c.accent, [key]: e.target.value.toUpperCase() } }))}
                            className="h-11 w-14 shrink-0 cursor-pointer rounded border border-stone/40 bg-transparent p-1"
                          />
                          <AdminInput
                            value={campaign.accent[key]}
                            onChange={(e) => updateCampaign((c) => ({ ...c, accent: { ...c.accent, [key]: e.target.value } }))}
                          />
                        </div>
                      </AdminField>
                    ))}
                  </fieldset>
                  {goldContrast < 4.5 || creamContrast < 4.5 ? (
                    <p className="mt-3 text-sm text-amber-300" role="status">
                      Low contrast: gold on onyx {goldContrast.toFixed(1)}:1, cream on burgundy {creamContrast.toFixed(1)}:1 (4.5:1 needed for readable text).
                    </p>
                  ) : (
                    <p className="mt-3 text-xs text-muted">
                      Contrast OK: gold on onyx {goldContrast.toFixed(1)}:1 · cream on burgundy {creamContrast.toFixed(1)}:1
                    </p>
                  )}
                </section>

                {/* Preview */}
                <section className={card} aria-labelledby="seasonal-preview">
                  <h2 id="seasonal-preview" className="font-display text-xl text-cream">7 · Private preview</h2>
                  <p className="mt-1 text-sm text-fog">
                    Shows your saved draft in this browser only. Visitors keep seeing the published site.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" className={btnGhost} onClick={() => void openPreview("campaign")} disabled={busy !== ""}>
                      Preview {campaign.name}
                    </button>
                    <button type="button" className={btnGhost} onClick={() => void openPreview("default")} disabled={busy !== ""}>
                      Preview Default ÉLEVÉ
                    </button>
                    <div className="flex rounded-lg border border-stone/40 p-1" role="group" aria-label="Preview device">
                      {(["desktop", "mobile"] as const).map((device) => (
                        <button
                          key={device}
                          type="button"
                          aria-pressed={previewDevice === device}
                          onClick={() => setPreviewDevice(device)}
                          className={cn("min-h-9 rounded px-3 text-sm capitalize", previewDevice === device ? "bg-accent text-ink" : "text-fog")}
                        >
                          {device}
                        </button>
                      ))}
                    </div>
                    {previewOpen ? (
                      <>
                        <a className={btnGhost} href={previewSrc} target="_blank" rel="noreferrer">Open full page</a>
                        <a className={btnGhost} href="/api/admin/seasonal/preview?exit=1&path=/admin/seasonal" onClick={() => setPreviewOpen(false)}>
                          End preview
                        </a>
                      </>
                    ) : null}
                  </div>
                  {previewOpen ? (
                    <div className="mt-5 overflow-x-auto rounded-xl border border-stone/30 bg-ink p-3">
                      <iframe
                        key={`${previewNonce}-${previewMode}`}
                        title={`Preview: ${previewMode === "campaign" ? campaign.name : "Default ÉLEVÉ"} (${previewDevice})`}
                        src={previewSrc}
                        className="mx-auto block h-[780px] rounded-lg bg-ink"
                        style={{ width: previewDevice === "mobile" ? 390 : "100%", minWidth: previewDevice === "mobile" ? 390 : 1024 }}
                      />
                    </div>
                  ) : null}
                </section>

                {/* History */}
                <section className={card} aria-labelledby="seasonal-history">
                  <h2 id="seasonal-history" className="font-display text-xl text-cream">Publish history</h2>
                  {state.history.length === 0 ? (
                    <p className="mt-2 text-sm text-fog">No earlier versions yet. Each publish keeps the previous version here (last 10).</p>
                  ) : (
                    <ul className="mt-3 divide-y divide-stone/20 text-sm">
                      {state.history.map((row) => (
                        <li key={row.index} className="flex flex-wrap justify-between gap-2 py-2 text-cream-dim">
                          <span>{row.mode === "default" ? "Default ÉLEVÉ" : `${row.mode === "campaign" ? "Manual" : "Scheduled"} · ${row.campaignName}`}</span>
                          <span className="text-fog">{formatInstant(row.publishedAt)}{row.publishedBy ? ` · ${row.publishedBy}` : ""}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    className={cn(btnGhost, "mt-4")}
                    onClick={() => void rollback()}
                    disabled={!state.canPublish || !state.history.length || busy !== ""}
                  >
                    Roll back to previous version
                  </button>
                </section>
              </>
            ) : null}

            {/* Action bar */}
            <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-stone/30 bg-ink/95 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur sm:-mx-6 sm:px-6 md:-mx-10 md:flex-row md:items-center md:justify-between md:px-10">
              <div className="min-h-5 text-sm" role="status" aria-live="polite">
                {message ? (
                  <div className={message.tone === "error" ? "text-red-300" : "text-cream-dim"}>
                    <p>{message.text}</p>
                    {message.issues?.length ? (
                      <ul className="mt-1 list-disc pl-5 text-xs">
                        {message.issues.map((issue) => <li key={issue}>{issue}</li>)}
                      </ul>
                    ) : null}
                  </div>
                ) : dirty ? (
                  <span className="text-amber-300">Unsaved changes</span>
                ) : !publishedMatchesDraft ? (
                  <span className="text-fog">Draft saved · not yet published</span>
                ) : (
                  <span className="text-fog">Draft matches the live site</span>
                )}
                {!validation.success && !message ? (
                  <p className="text-xs text-red-300">{issues[0]}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" className={btnGhost} onClick={discardDraft} disabled={readOnly || busy !== ""}>
                  Reset to published
                </button>
                <button type="button" className={btnGhost} onClick={() => void saveDraft()} disabled={readOnly || !dirty || busy !== ""}>
                  {busy === "save" ? "Saving…" : "Save draft"}
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => void publish()}
                  disabled={!state.canPublish || busy !== "" || !validation.success}
                  title={state.canPublish ? undefined : "Only an owner or admin can publish"}
                >
                  {busy === "publish" ? "Publishing…" : "Publish to website"}
                </button>
              </div>
            </div>
          </div>
        )}
      </WorkspaceChrome>
    </AdminShell>
  );
}
