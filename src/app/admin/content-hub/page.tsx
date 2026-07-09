"use client";

import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { AIGeneratePanel } from "@/components/admin/ai/AIGeneratePanel";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";
import { WorkspaceChrome } from "@/components/admin/os/WorkspaceFrame";

export default function ContentHubPage() {
  return (
    <AdminShell title="Content studio">
      <WorkspaceChrome
        eyebrow="Grow"
        title="Content studio"
        description="What: AI drafts for social, SEO, and campaigns. Why: ship on-brand faster. Next: generate then publish via Portfolio, Media, Homepage, or Marketing. AI writes drafts — you approve before publish."
        related={[
          { label: "Email", href: "/admin/email", desc: "Send" },
          { label: "Business Brain", href: "/admin/memory", desc: "Brand memory" },
          { label: "Analytics", href: "/admin/analytics", desc: "What performs" },
        ]}
      >
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Media", href: "/admin/media", desc: "Assets" },
            { label: "Portfolio", href: "/admin/portfolio", desc: "Publish work" },
            { label: "Homepage", href: "/admin/homepage", desc: "Site hero" },
            { label: "Marketing", href: "/admin/marketing", desc: "Campaigns" },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-xl border border-stone/25 p-4 transition-colors hover:border-accent/40"
            >
              <p className="font-display text-base text-cream">{l.label}</p>
              <p className="mt-1 text-xs text-muted">{l.desc}</p>
            </Link>
          ))}
        </div>

        <AdminPanel title="AI drafts" subtitle="Review before publishing anywhere">
          <AIGeneratePanel
            task="instagram_caption"
            label="Social caption"
            prompt="Write an Instagram caption for a new ÉLEVÉ Visuals portfolio drop — cinematic, minimal, luxury."
          />
          <AIGeneratePanel
            task="seo_meta"
            label="SEO meta"
            prompt="Write title and meta description for the ÉLEVÉ Visuals homepage targeting luxury photography in the Bay Area."
          />
          <AIGeneratePanel
            task="campaign"
            label="Campaign outline"
            prompt="Outline a 5-post content campaign announcing ÉLEVÉ Sessions applications."
          />
        </AdminPanel>
      </WorkspaceChrome>
    </AdminShell>
  );
}
