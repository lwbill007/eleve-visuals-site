"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AskAIButton } from "@/components/admin/ai/AskAIPanel";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { useAdminToast } from "@/components/admin/AdminToast";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";

interface SystemAutomation {
  id: string;
  name: string;
  description: string;
  trigger: string;
  effect: string;
}

interface DraftAutomation {
  id: string;
  name: string;
  description: string;
  steps: { order: number; action: string; delay?: string }[];
  enabled: boolean;
}

export function AutomationsClient() {
  useSetAIPage("automations");
  const { toast } = useAdminToast();
  const [system, setSystem] = useState<SystemAutomation[]>([]);
  const [drafts, setDrafts] = useState<DraftAutomation[]>([]);
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState<string | null>(null);

  function loadDrafts() {
    adminFetch("/api/admin/ai/automations")
      .then((r) => r.json())
      .then((d) => setDrafts(d.automations ?? []));
  }

  function loadSystem() {
    adminFetch("/api/admin/ai/automations/run")
      .then((r) => r.json())
      .then((d) => setSystem(d.automations ?? []));
  }

  useEffect(() => {
    loadSystem();
    loadDrafts();
  }, []);

  async function runOne(id: string) {
    setRunning(id);
    const res = await adminFetch("/api/admin/ai/automations/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    toast(data.message || (res.ok ? "Ran." : "Failed."), res.ok ? undefined : "error");
    setRunning(null);
  }

  async function runAll() {
    setRunning("all");
    const res = await adminFetch("/api/admin/ai/automations/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    toast(
      res.ok
        ? `Ran ${data.results?.length ?? 0} jobs · ${data.notificationsCreated ?? 0} alerts created.`
        : "Run failed.",
      res.ok ? undefined : "error"
    );
    setRunning(null);
  }

  async function build() {
    if (!prompt.trim()) return;
    setLoading(true);
    setDraft("");
    const res = await adminFetch("/api/admin/ai/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt.trim() }),
    });
    const data = res.ok ? await res.json() : null;
    if (data) {
      setDraft(data.draft);
      loadDrafts();
      toast("Draft saved — not executable until a full workflow runner ships.");
    } else toast("Build failed.", "error");
    setLoading(false);
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Trust"
        title="Automations"
        description="Runnable system jobs create real alerts. AI-drafted workflows are drafts only — they do not execute."
        action={
          <div className="flex flex-wrap gap-2">
            <AskAIButton />
            <button
              type="button"
              onClick={() => void runAll()}
              disabled={running !== null}
              className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-xs tracking-[0.1em] text-accent uppercase disabled:opacity-40"
            >
              {running === "all" ? "Running…" : "Run all system jobs"}
            </button>
          </div>
        }
      />

      <AdminPanel
        title="System automations"
        subtitle="These run for real — manually or via intelligence cron"
      >
        {system.length === 0 ? (
          <p className="text-sm text-muted">Loading system jobs…</p>
        ) : (
          <ul className="space-y-4">
            {system.map((a) => (
              <li key={a.id} className="rounded-lg border border-stone/25 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-lg text-cream">{a.name}</p>
                    <p className="mt-1 text-xs text-muted">{a.description}</p>
                    <p className="mt-2 text-[0.65rem] text-fog">
                      Trigger: {a.trigger} · Effect: {a.effect}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void runOne(a.id)}
                    disabled={running !== null}
                    className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs text-accent uppercase disabled:opacity-40"
                  >
                    {running === a.id ? "Running…" : "Run"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>

      <AdminPanel title="Draft a custom workflow" subtitle="AI draft only — not executed">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder='e.g. "Remind portrait clients 7 days before the shoot"'
          className="w-full rounded-lg border border-stone/30 bg-charcoal/30 px-4 py-3 text-sm text-cream outline-none focus:border-accent/50"
        />
        <button
          type="button"
          onClick={() => void build()}
          disabled={loading || !prompt.trim()}
          className="mt-3 rounded-lg border border-stone/40 px-5 py-2.5 text-xs tracking-[0.12em] text-fog uppercase disabled:opacity-40"
        >
          {loading ? "Building…" : "Save draft (not runnable)"}
        </button>
        {draft && (
          <div className="mt-4 rounded-lg border border-stone/20 bg-ink/40 p-4">
            <p className="mb-2 text-[0.65rem] uppercase text-muted">Generated draft</p>
            <p className="whitespace-pre-wrap text-sm text-cream-dim">{draft}</p>
          </div>
        )}
      </AdminPanel>

      {drafts.length > 0 && (
        <AdminPanel title="Saved drafts" subtitle="Toggle does not run anything">
          <ul className="space-y-4">
            {drafts.map((a) => (
              <li key={a.id} className="rounded-lg border border-stone/25 p-4">
                <p className="font-display text-lg text-cream">{a.name}</p>
                <p className="mt-1 text-xs text-muted">{a.description}</p>
                <p className="mt-2 text-[0.65rem] text-amber-300/90 uppercase">Draft — not executable</p>
                <ol className="mt-3 space-y-1">
                  {a.steps.map((s) => (
                    <li key={s.order} className="text-sm text-fog">
                      {s.order}. {s.action}
                      {s.delay ? ` (${s.delay})` : ""}
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </AdminPanel>
      )}
    </div>
  );
}
