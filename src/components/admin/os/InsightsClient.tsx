"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/admin-fetch";
import { AIDailyBriefingPanel } from "@/components/admin/ai/AIDailyBriefingPanel";
import { AskAIButton } from "@/components/admin/ai/AskAIPanel";
import { useSetAIPage } from "@/components/admin/ai/AIContextProvider";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { cn } from "@/lib/utils";

interface Insight {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  action: string;
  href: string;
}

export function InsightsClient() {
  useSetAIPage("insights");
  const [insights, setInsights] = useState<Insight[]>([]);
  const [generatedAt, setGeneratedAt] = useState("");

  useEffect(() => {
    adminFetch("/api/admin/os/insights")
      .then((r) => r.json())
      .then((d) => {
        setInsights(d.insights ?? []);
        setGeneratedAt(d.generatedAt ?? "");
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
        eyebrow="AI Assistant"
        title="Business Insights"
        description="Data-driven recommendations to grow bookings, applications, and repeat clients."
        action={<AskAIButton />}
      />

      <AIDailyBriefingPanel />

      {generatedAt && (
        <p className="text-xs text-muted">Updated {new Date(generatedAt).toLocaleString()}</p>
      )}

      {insights.length === 0 ? (
        <AdminPanel>
          <p className="text-sm text-fog">No insights right now — your studio is running smoothly.</p>
        </AdminPanel>
      ) : (
        <div className="space-y-4">
          {insights.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "block rounded-xl border p-5 transition-all hover:scale-[1.01]",
                severityColor[item.severity]
              )}
            >
              <p className="text-xs tracking-[0.14em] text-muted uppercase">{item.severity} priority</p>
              <h3 className="mt-2 font-display text-xl text-cream">{item.title}</h3>
              <p className="mt-2 text-sm text-fog">{item.detail}</p>
              <p className="mt-4 text-xs tracking-[0.12em] text-accent uppercase">{item.action} →</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
