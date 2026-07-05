"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AIGeneratePanel } from "./AIGeneratePanel";
import { AskAIButton } from "./AskAIPanel";
import { BusinessActionBar } from "./BusinessActionBar";
import { useSetAIPage } from "./AIContextProvider";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { adminFetch } from "@/lib/admin-fetch";
import type { MarketingRecommendation } from "@/lib/ai/types";

const CHANNELS = [
  { task: "instagram_caption" as const, label: "Instagram Caption", prompt: "Write an Instagram caption for a new cinematic portrait gallery." },
  { task: "instagram_story" as const, label: "Story Sequence", prompt: "Write a 3-slide Instagram Story sequence for a new portfolio drop." },
  { task: "email_body" as const, label: "Email Campaign", prompt: "Write a luxury email campaign announcing new work." },
  { task: "blog_post" as const, label: "Blog Post", prompt: "Write a blog post about the ÉLEVÉ creative process." },
  { task: "seo_meta" as const, label: "SEO Metadata", prompt: "Write SEO title and meta description for the portfolio page." },
  { task: "pinterest_pin" as const, label: "Pinterest Pin", prompt: "Write Pinterest pin title and description for editorial portraits." },
  { task: "tiktok_caption" as const, label: "TikTok Caption", prompt: "Write a TikTok caption for behind-the-scenes session content." },
  { task: "facebook_post" as const, label: "Facebook Post", prompt: "Write a Facebook post announcing a new gallery." },
  { task: "newsletter" as const, label: "Newsletter", prompt: "Write a full newsletter for ÉLEVÉ subscribers." },
  { task: "launch_campaign" as const, label: "Launch Campaign", prompt: "Write a Vol. 2 ÉLEVÉ Sessions launch campaign across channels." },
  { task: "threads_post" as const, label: "Threads", prompt: "Write a Threads post about upcoming sessions." },
  { task: "campaign" as const, label: "Re-engagement", prompt: "Write a re-engagement campaign for inactive clients." },
  { task: "follow_up" as const, label: "Follow-Up Email", prompt: "Write a personal follow-up email for booking inquiries awaiting a response." },
];

export function MarketingStudioClient() {
  useSetAIPage("marketing");
  const searchParams = useSearchParams();
  const focusTask = searchParams.get("focus") || searchParams.get("task");
  const focusPrompt = searchParams.get("prompt");
  const [recommendations, setRecommendations] = useState<MarketingRecommendation[]>([]);
  const initialIndex = focusTask ? CHANNELS.findIndex((c) => c.task === focusTask) : 0;
  const [active, setActive] = useState(initialIndex >= 0 ? initialIndex : 0);
  const channel = CHANNELS[active];

  useEffect(() => {
    adminFetch("/api/admin/ai/operator")
      .then((r) => r.json())
      .then((d) => setRecommendations(d.marketing ?? []));
  }, []);

  useEffect(() => {
    if (focusTask) {
      const idx = CHANNELS.findIndex((c) => c.task === focusTask);
      if (idx >= 0) setActive(idx);
    }
  }, [focusTask]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Marketing"
        title="AI Marketing Studio"
        description="One-click content generation in ÉLEVÉ brand voice — always review before publishing."
        action={<AskAIButton />}
      />

      {recommendations.length > 0 && (
        <AdminPanel title="AI Recommendations" subtitle="Based on traffic, CRM, and booking data">
          <div className="space-y-3">
            {recommendations.slice(0, 4).map((rec) => (
              <div key={rec.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-stone/15 pb-3 last:border-0">
                <div>
                  <p className="text-[0.6rem] uppercase text-muted">{rec.channel} · {rec.priority}</p>
                  <p className="text-sm text-cream">{rec.title}</p>
                  <p className="text-xs text-fog">{rec.reason}</p>
                </div>
                <BusinessActionBar actions={rec.actions} compact />
              </div>
            ))}
          </div>
        </AdminPanel>
      )}

      <div className="flex flex-wrap gap-2">
        {CHANNELS.map((c, i) => (
          <button
            key={c.label}
            type="button"
            onClick={() => setActive(i)}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              i === active
                ? "border-accent bg-accent/10 text-cream"
                : "border-stone/30 text-fog hover:border-accent/40"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <AdminPanel title={channel.label} subtitle="Generate draft content">
        <AIGeneratePanel
          key={channel.label}
          task={channel.task}
          label={channel.label}
          prompt={focusPrompt || channel.prompt}
          buttonLabel={`Generate ${channel.label}`}
        />
      </AdminPanel>
    </div>
  );
}
