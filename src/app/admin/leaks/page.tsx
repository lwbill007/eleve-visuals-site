"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { ExecuteButton } from "@/components/admin/ai/ExecuteButton";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { cn } from "@/lib/utils";

interface Leak {
  id: string;
  title: string;
  reason: string;
  category: string;
  estimatedLoss: number;
  recoveryPotential: number;
  confidence: number;
  evidence: string[];
  actions: { id: string; label: string; href: string }[];
}

export default function LeaksPage() {
  useSetAIPage("risks");
  const [leaks, setLeaks] = useState<Leak[]>([]);
  const [exposure, setExposure] = useState({ loss: 0, recoverable: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch("/api/admin/ai/leaks");
    if (res.ok) {
      const data = await res.json();
      setLeaks(data.leaks ?? []);
      setExposure(data.exposure ?? { loss: 0, recoverable: 0 });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminShell title="Revenue Leaks">
      <AdminPageHeader
        eyebrow="Command"
        title="Revenue Leak Detector"
        description="Where money is being lost — estimated recovery, evidence, and one-click paths to fix. Labels are Estimated unless noted."
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-stone/30 px-3 py-2 text-[0.65rem] text-fog uppercase"
          >
            Refresh
          </button>
        }
      />

      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <AdminPanel title="Potential loss (est.)">
          <p className="font-display text-3xl text-amber-300">
            ${Math.round(exposure.loss).toLocaleString()}
          </p>
        </AdminPanel>
        <AdminPanel title="Recoverable (confidence-weighted)">
          <p className="font-display text-3xl text-emerald-400">
            ${Math.round(exposure.recoverable).toLocaleString()}
          </p>
        </AdminPanel>
      </div>

      {loading ? (
        <p className="text-fog">Scanning for leaks…</p>
      ) : leaks.length === 0 ? (
        <AdminPanel title="No leaks detected">
          <p className="text-sm text-fog">
            Detector found nothing above threshold — or data is too thin. Check{" "}
            <Link href="/admin/risks" className="text-accent hover:underline">
              Risks
            </Link>
            .
          </p>
        </AdminPanel>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {leaks.map((leak) => (
            <article key={leak.id} className="os-panel rounded-xl border border-stone/20 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="text-[0.55rem] tracking-[0.12em] text-muted uppercase">
                  {leak.category}
                </span>
                <p className="font-display text-xl text-amber-300">
                  ~${leak.estimatedLoss.toLocaleString()}
                </p>
              </div>
              <h3 className="mt-2 font-display text-lg text-cream">{leak.title}</h3>
              <p className="mt-2 text-sm text-fog">{leak.reason}</p>
              <p className="mt-2 text-[0.65rem] text-muted">
                Recover ~${leak.recoveryPotential.toLocaleString()} ·{" "}
                {Math.round(leak.confidence * 100)}% confidence
              </p>
              {leak.evidence.length > 0 && (
                <ul className="mt-3 space-y-1 text-[0.7rem] text-muted">
                  {leak.evidence.slice(0, 3).map((e) => (
                    <li key={e}>• {e}</li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                {leak.actions[0] && (
                  <ExecuteButton
                    target={{
                      id: leak.id,
                      title: leak.title,
                      href: leak.actions[0].href,
                      actionLabel: leak.actions[0].label,
                    }}
                    className={cn("text-[0.65rem]")}
                  />
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
