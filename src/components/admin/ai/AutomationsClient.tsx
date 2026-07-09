"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AskAIButton } from "@/components/admin/ai/AskAIPanel";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { useAdminToast } from "@/components/admin/AdminToast";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import {
  WorkspaceButton,
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/admin/os/WorkspaceFrame";

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
  const [building, setBuilding] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  const [running, setRunning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBooting(true);
    setError("");
    try {
      const [sysRes, draftRes] = await Promise.all([
        adminFetch("/api/admin/ai/automations/run"),
        adminFetch("/api/admin/ai/automations"),
      ]);
      if (!sysRes.ok) throw new Error("Failed");
      const sys = await sysRes.json();
      setSystem(sys.automations ?? []);
      if (draftRes.ok) {
        const d = await draftRes.json();
        setDrafts(d.automations ?? []);
      }
    } catch {
      setError("Could not load automations.");
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
    setBuilding(true);
    setDraft("");
    const res = await adminFetch("/api/admin/ai/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt.trim() }),
    });
    const data = res.ok ? await res.json() : null;
    if (data) {
      setDraft(data.draft);
      void load();
      toast("Draft saved — not executable until a full workflow runner ships.");
    } else toast("Build failed.", "error");
    setBuilding(false);
  }

  return (
    <WorkspaceChrome
      eyebrow="Trust"
      title="Automations"
      description="What should run without you — system jobs create real alerts. AI drafts are ideas only until a full runner ships."
      onRefresh={() => void load()}
      refreshing={booting}
      extra={
        <div className="flex flex-wrap gap-2">
          <AskAIButton />
          <WorkspaceButton
            variant="primary"
            onClick={() => void runAll()}
            disabled={running !== null || booting}
          >
            {running === "all" ? "Running…" : "Run all"}
          </WorkspaceButton>
        </div>
      }
      related={[
        { label: "Notifications", href: "/admin/notifications", desc: "Delivery log" },
        { label: "Risks", href: "/admin/risks", desc: "Attention" },
        { label: "Missing Intel", href: "/admin/qa", desc: "Connectors" },
        { label: "Business Brain", href: "/admin/memory", desc: "Context" },
      ]}
    >
      {booting ? (
        <WorkspaceLoading />
      ) : error ? (
        <WorkspaceError message={error} onRetry={() => void load()} />
      ) : (
        <div className="space-y-8">
          <AdminPanel
            title="System automations"
            subtitle="These run for real — manually or via intelligence cron"
          >
            {system.length === 0 ? (
              <WorkspaceEmpty
                title="No system jobs"
                detail="System automation definitions failed to load."
              />
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
                      <WorkspaceButton
                        variant="primary"
                        onClick={() => void runOne(a.id)}
                        disabled={running !== null}
                      >
                        {running === a.id ? "Running…" : "Run"}
                      </WorkspaceButton>
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
            <WorkspaceButton
              variant="secondary"
              onClick={() => void build()}
              disabled={building || !prompt.trim()}
              className="mt-3"
            >
              {building ? "Building…" : "Save draft (not runnable)"}
            </WorkspaceButton>
            {draft && (
              <div className="mt-4 rounded-lg border border-stone/20 bg-ink/40 p-4">
                <p className="mb-2 text-[0.65rem] uppercase text-muted">Generated draft</p>
                <p className="whitespace-pre-wrap text-sm text-cream-dim">{draft}</p>
              </div>
            )}
          </AdminPanel>

          {drafts.length > 0 && (
            <AdminPanel title="Saved drafts" subtitle="Not executable">
              <ul className="space-y-4">
                {drafts.map((a) => (
                  <li key={a.id} className="rounded-lg border border-stone/25 p-4">
                    <p className="font-display text-lg text-cream">{a.name}</p>
                    <p className="mt-1 text-xs text-muted">{a.description}</p>
                    <p className="mt-2 text-[0.65rem] text-amber-300/90 uppercase">
                      Draft — not executable
                    </p>
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
      )}
    </WorkspaceChrome>
  );
}
