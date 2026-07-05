"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AskAIButton } from "@/components/admin/ai/AskAIPanel";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";

interface AutomationRow {
  id: string;
  name: string;
  description: string;
  steps: { order: number; action: string; delay?: string }[];
  enabled: boolean;
}

export function AutomationsClient() {
  useSetAIPage("automations");
  const [automations, setAutomations] = useState<AutomationRow[]>([]);
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  function load() {
    adminFetch("/api/admin/ai/automations").then((r) => r.json()).then((d) => setAutomations(d.automations ?? []));
  }

  useEffect(() => {
    load();
  }, []);

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
      load();
    }
    setLoading(false);
  }

  async function toggle(id: string, enabled: boolean) {
    await adminFetch("/api/admin/ai/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle", id, enabled }),
    });
    load();
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Marketing"
        title="AI Workflow Builder"
        description="Describe a workflow — AI builds the automation steps. Enable when ready."
        action={<AskAIButton />}
      />

      <AdminPanel title="Create Workflow">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder='e.g. "Create a workflow for portrait clients — reminder 7 days before, thank you 2 days after"'
          className="w-full rounded-lg border border-stone/30 bg-charcoal/30 px-4 py-3 text-sm text-cream outline-none focus:border-accent/50"
        />
        <button
          type="button"
          onClick={build}
          disabled={loading || !prompt.trim()}
          className="mt-3 rounded-lg bg-cream px-5 py-2.5 text-xs tracking-[0.12em] text-ink uppercase disabled:opacity-40"
        >
          {loading ? "Building…" : "✦ Build Automation"}
        </button>
        {draft && (
          <div className="mt-4 rounded-lg border border-stone/20 bg-ink/40 p-4">
            <p className="mb-2 text-[0.65rem] uppercase text-muted">Generated workflow</p>
            <p className="whitespace-pre-wrap text-sm text-cream-dim">{draft}</p>
          </div>
        )}
      </AdminPanel>

      <AdminPanel title="Saved Automations" subtitle={`${automations.length} workflow${automations.length === 1 ? "" : "s"}`}>
        {automations.length === 0 ? (
          <p className="text-sm text-muted">No automations yet. Describe one above.</p>
        ) : (
          <ul className="space-y-4">
            {automations.map((a) => (
              <li key={a.id} className="rounded-lg border border-stone/25 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-lg text-cream">{a.name}</p>
                    <p className="mt-1 text-xs text-muted">{a.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(a.id, !a.enabled)}
                    className={`rounded-full border px-3 py-1 text-xs uppercase ${
                      a.enabled ? "border-accent text-accent" : "border-stone/40 text-fog"
                    }`}
                  >
                    {a.enabled ? "Enabled" : "Draft"}
                  </button>
                </div>
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
        )}
      </AdminPanel>
    </div>
  );
}
