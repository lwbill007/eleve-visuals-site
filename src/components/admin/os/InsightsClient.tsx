"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { AIDailyBriefingPanel } from "@/components/admin/ai/AIDailyBriefingPanel";
import { AskAIButton } from "@/components/admin/ai/AskAIPanel";
import { BusinessActionBar } from "@/components/admin/ai/BusinessActionBar";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";
import type { BusinessAction, MarketingRecommendation, SalesRecommendation, SelfImprovementItem } from "@/lib/ai/types";
import { cn } from "@/lib/utils";

interface Insight {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  action: string;
  href: string;
  actions?: BusinessAction[];
  category?: string;
  metric?: string;
}

export function InsightsClient() {
  useSetAIPage("insights");
  const [insights, setInsights] = useState<Insight[]>([]);
  const [marketing, setMarketing] = useState<MarketingRecommendation[]>([]);
  const [sales, setSales] = useState<SalesRecommendation[]>([]);
  const [improvements, setImprovements] = useState<SelfImprovementItem[]>([]);
  const [generatedAt, setGeneratedAt] = useState("");

  useEffect(() => {
    Promise.all([
      adminFetch("/api/admin/os/insights").then((r) => r.json()),
      adminFetch("/api/admin/ai/operator").then((r) => r.json()),
    ]).then(([insightsData, operatorData]) => {
      setInsights(insightsData.insights ?? []);
      setGeneratedAt(insightsData.generatedAt ?? "");
      setMarketing(operatorData.marketing ?? []);
      setSales(operatorData.sales ?? []);
      setImprovements(operatorData.improvements ?? []);
    });
  }, []);

  const severityColor = {
    high: "border-red-500/30 bg-red-500/5",
    medium: "border-amber-500/30 bg-amber-500/5",
    low: "border-accent/30 bg-accent/5",
  };

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Business Operator"
        title="Insights & Actions"
        description="Proactive intelligence with one-click actions to grow revenue, save time, and strengthen the ÉLEVÉ brand."
        action={<AskAIButton />}
      />

      <AIDailyBriefingPanel />

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/memory" className="text-xs text-accent hover:underline">
          Knowledge Engine →
        </Link>
        <Link href="/admin/intelligence" className="text-xs text-accent hover:underline">
          Command Center →
        </Link>
      </div>

      {generatedAt && (
        <p className="text-xs text-muted">Insights updated {new Date(generatedAt).toLocaleString()}</p>
      )}

      <section>
        <h2 className="mb-4 font-display text-lg text-cream">Business Opportunities</h2>
        {insights.length === 0 ? (
          <AdminPanel>
            <p className="text-sm text-fog">No urgent insights — metrics look healthy.</p>
          </AdminPanel>
        ) : (
          <div className="space-y-4">
            {insights.map((item) => (
              <div
                key={item.id}
                className={cn("rounded-xl border p-5", severityColor[item.severity])}
              >
                <p className="text-xs tracking-[0.14em] text-muted uppercase">
                  {item.category ?? "insight"} · {item.severity} priority
                  {item.metric ? ` · ${item.metric}` : ""}
                </p>
                <h3 className="mt-2 font-display text-xl text-cream">{item.title}</h3>
                <p className="mt-2 text-sm text-fog">{item.detail}</p>
                {item.actions && item.actions.length > 0 ? (
                  <BusinessActionBar actions={item.actions} className="mt-4" />
                ) : (
                  <p className="mt-4 text-xs tracking-[0.12em] text-accent uppercase">{item.action} →</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <AdminPanel title="Marketing AI" subtitle="Channel recommendations">
          <div className="space-y-4">
            {marketing.slice(0, 5).map((m) => (
              <div key={m.id} className="border-b border-stone/15 pb-4 last:border-0 last:pb-0">
                <p className="text-[0.6rem] uppercase text-muted">{m.channel} · {m.priority}</p>
                <p className="mt-1 text-sm text-cream">{m.title}</p>
                <p className="mt-1 text-xs text-fog">{m.reason}</p>
                <BusinessActionBar actions={m.actions} compact className="mt-2" />
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel title="Sales AI" subtitle="Revenue opportunities">
          <div className="space-y-4">
            {sales.slice(0, 5).map((s) => (
              <div key={s.id} className="border-b border-stone/15 pb-4 last:border-0 last:pb-0">
                <p className="text-[0.6rem] uppercase text-muted">{s.type.replace("_", " ")} · {s.impact} impact</p>
                <p className="mt-1 text-sm text-cream">{s.title}</p>
                <p className="mt-1 text-xs text-fog">{s.detail}</p>
                <BusinessActionBar actions={s.actions} compact className="mt-2" />
              </div>
            ))}
          </div>
        </AdminPanel>
      </section>

      <AdminPanel title="Self-Improvement" subtitle="UX, performance & automation">
        <div className="grid gap-4 sm:grid-cols-2">
          {improvements.map((item) => (
            <div key={item.id} className="rounded-lg border border-stone/20 p-4">
              <p className="text-[0.6rem] uppercase text-muted">{item.area} · {item.impact}</p>
              <p className="mt-1 text-sm text-cream">{item.title}</p>
              <p className="mt-1 text-xs text-fog">{item.detail}</p>
              <BusinessActionBar actions={item.actions} compact className="mt-3" />
            </div>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
