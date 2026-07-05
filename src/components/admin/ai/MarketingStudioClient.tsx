"use client";

import { useState } from "react";
import { AIGeneratePanel } from "./AIGeneratePanel";
import { AskAIButton } from "./AskAIPanel";
import { useSetAIPage } from "./AIContextProvider";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";

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
];

export function MarketingStudioClient() {
  useSetAIPage("marketing");
  const [active, setActive] = useState(0);
  const channel = CHANNELS[active];

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Marketing"
        title="AI Marketing Studio"
        description="One-click content generation in ÉLEVÉ brand voice — always review before publishing."
        action={<AskAIButton />}
      />

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
          prompt={channel.prompt}
          buttonLabel={`Generate ${channel.label}`}
        />
      </AdminPanel>
    </div>
  );
}
