"use client";

import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin-fetch";
import { AskAIButton } from "@/components/admin/ai/AskAIPanel";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { useAdminToast } from "@/components/admin/AdminToast";
import { AdminOverlay } from "@/components/admin/os/AdminOverlay";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { OsCapabilityGrid, type OsCapability } from "@/components/admin/os/OsCapabilityGrid";
import {
  WorkspaceButton,
  WorkspaceChrome,
  WorkspaceEmpty,
  WorkspaceError,
  WorkspaceLoading,
} from "@/components/admin/os/WorkspaceFrame";
import { METRIC_OWNERS } from "@/lib/ai/platform/metric-owners";

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
  const [refreshing, setRefreshing] = useState(false);
  const [systemError, setSystemError] = useState("");
  const [draftError, setDraftError] = useState("");
  const [running, setRunning] = useState<string | null>(null);
  const [runAllPreviewOpen, setRunAllPreviewOpen] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    setSystemError("");
    setDraftError("");
    const [systemResult, draftResult] = await Promise.allSettled([
      adminFetch("/api/admin/ai/automations/run").then(async (response) => ({
        response,
        data: response.ok ? await response.json() : null,
      })),
      adminFetch("/api/admin/ai/automations").then(async (response) => ({
        response,
        data: response.ok ? await response.json() : null,
      })),
    ]);

    if (systemResult.status === "fulfilled" && systemResult.value.response.ok) {
      setSystem(systemResult.value.data?.automations ?? []);
    } else {
      setSystemError("System jobs could not refresh. Showing the last successful result when available.");
    }

    if (draftResult.status === "fulfilled" && draftResult.value.response.ok) {
      setDrafts(draftResult.value.data?.automations ?? []);
    } else {
      setDraftError("Draft workflows could not refresh. Existing drafts remain visible.");
    }
    setBooting(false);
    setRefreshing(false);
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
    try {
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
      if (res.ok) setRunAllPreviewOpen(false);
    } finally {
      setRunning(null);
    }
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

  const capabilities: OsCapability[] = [
    {
      id: "status",
      label: "Job status",
      status: system.length > 0 ? "live" : "planned",
      summary:
        system.length > 0
          ? `${system.length} system jobs defined — run manually or via intelligence cron.`
          : "No system automation definitions loaded.",
    },
    {
      id: "failures",
      label: "Failure history",
      status: "planned",
      summary: "Per-job failure logs are not persisted yet.",
      missing: {
        label: "Automation failures",
        reason: "Runs return toast messages only — no durable failure ledger",
        required: ["AutomationRun log table", "Failure reason + timestamp", "Retry count"],
        confidence: 0,
        unlockAfter: "Unlock after automation run history is stored",
        owner: METRIC_OWNERS.ai_operations,
        unlockHref: "/admin/ai-operations",
      },
    },
    {
      id: "cost",
      label: "Automation cost",
      status: "planned",
      summary: "Token/API cost per job is not metered here.",
      missing: {
        label: "Automation cost",
        reason: "No cost attribution for system jobs or draft workflows",
        required: ["Token usage per run", "Provider cost mapping"],
        confidence: 0,
        unlockAfter: "Unlock after AI Operations cost signals attach to automation runs",
        owner: METRIC_OWNERS.ai_operations,
        unlockHref: "/admin/ai-operations",
      },
    },
    {
      id: "dependencies",
      label: "Job dependencies",
      status: "partial",
      summary: "Triggers and effects are listed; dependency graph not modeled.",
    },
    {
      id: "custom-runner",
      label: "Custom workflow runner",
      status: "planned",
      summary: "AI drafts are ideas only until a full runner ships.",
      missing: {
        label: "Executable custom workflows",
        reason: "Saved drafts are not executable",
        required: ["Workflow runner", "Step executor", "Permission gates"],
        confidence: 0,
        unlockAfter: "Unlock after workflow runner ships",
        owner: METRIC_OWNERS.settings,
        unlockHref: "/admin/settings",
      },
    },
  ];

  return (
    <WorkspaceChrome
      eyebrow="Trust · What is running automatically?"
      title="Automation Center"
      description="Status, failures, cost, and dependencies for every job. System jobs create real alerts. AI drafts stay non-executable until a runner ships — never invent run health."
      onRefresh={() => void load()}
      refreshing={booting || refreshing}
      extra={
        <div className="flex flex-wrap gap-2">
          <AskAIButton />
          <WorkspaceButton
            variant="primary"
            onClick={() => setRunAllPreviewOpen(true)}
            disabled={running !== null || booting}
          >
            {running === "all" ? "Running…" : "Run all"}
          </WorkspaceButton>
        </div>
      }
      related={[
        { label: "Notifications", href: "/admin/notifications", desc: "What needs attention?" },
        { label: "Risks", href: "/admin/risks", desc: "What could hurt us?" },
        { label: "Executive QA", href: "/admin/qa", desc: "Gaps" },
        { label: "AI Operations", href: "/admin/ai-operations", desc: "Trust signals" },
      ]}
    >
      {booting && system.length === 0 && drafts.length === 0 ? (
        <WorkspaceLoading />
      ) : (
        <div className="space-y-8">
          {systemError ? <WorkspaceError message={systemError} onRetry={() => void load()} /> : null}
          <OsCapabilityGrid
            title="Automation capabilities"
            subtitle="Live jobs vs MissingMetric unlock paths for failures and cost."
            capabilities={capabilities}
          />

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

          {draftError ? <WorkspaceError message={draftError} onRetry={() => void load()} /> : null}

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
      <AdminOverlay
        open={runAllPreviewOpen}
        onClose={() => setRunAllPreviewOpen(false)}
        title="Review all system automations"
        description="Preview every real job and confirm before running the batch."
        className="max-w-2xl"
        closeOnBackdrop={running === null}
      >
        <div className="border-b border-stone/25 px-5 py-4">
          <p className="text-[0.65rem] tracking-[0.14em] text-accent uppercase">Batch preview</p>
          <h2 className="mt-1 font-display text-2xl text-cream">
            Run {system.length} system automation{system.length === 1 ? "" : "s"}?
          </h2>
        </div>
        <div className="space-y-4 p-5">
          <p className="text-sm text-fog">
            Each job queries current business state and may create a durable admin alert. Recent
            duplicate alerts are suppressed by the server.
          </p>
          <ul className="max-h-72 space-y-3 overflow-y-auto">
            {system.map((automation) => (
              <li key={automation.id} className="rounded-lg border border-stone/25 p-3">
                <p className="text-sm text-cream">{automation.name}</p>
                <p className="mt-1 text-xs text-fog">{automation.effect}</p>
              </li>
            ))}
          </ul>
          <div className="flex flex-col-reverse gap-2 border-t border-stone/20 pt-4 sm:flex-row sm:justify-end">
            <WorkspaceButton
              variant="secondary"
              onClick={() => setRunAllPreviewOpen(false)}
              disabled={running !== null}
            >
              Cancel
            </WorkspaceButton>
            <WorkspaceButton
              variant="primary"
              onClick={() => void runAll()}
              disabled={running !== null || system.length === 0}
            >
              {running === "all" ? "Running…" : `Confirm run ${system.length}`}
            </WorkspaceButton>
          </div>
        </div>
      </AdminOverlay>
    </WorkspaceChrome>
  );
}
