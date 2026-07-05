import { AdminShell } from "@/components/admin/AdminShell";
import { AdminModuleScaffold } from "@/components/admin/os/AdminModuleScaffold";
import { AIGeneratePanel } from "@/components/admin/ai/AIGeneratePanel";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";

export default function AdminContentHubPage() {
  return (
    <AdminShell title="Content Hub">
      <AdminModuleScaffold
        eyebrow="Content"
        title="Content Hub"
        description="One upload, multi-channel distribution — portfolio, social, email, and web."
        features={[
          "Upload once → publish everywhere",
          "Portfolio & website gallery",
          "Instagram, Stories & Pinterest exports",
          "Email campaign assets",
          "Blog draft generation (coming soon)",
        ]}
        links={[
          { label: "Media Library", href: "/admin/media", desc: "Central asset storage" },
          { label: "Portfolio", href: "/admin/portfolio", desc: "Publish work to the site" },
          { label: "Homepage", href: "/admin/homepage", desc: "Feature new work on hero" },
          { label: "ÉLEVÉ Sessions", href: "/admin/sessions", desc: "Volume galleries & BTS" },
        ]}
      />
      <AdminPanel title="AI Content Studio" subtitle="ÉLEVÉ brand voice — review before publishing" className="mt-8">
        <AIGeneratePanel task="instagram_caption" label="Instagram" prompt="Write an Instagram caption for a new cinematic portrait gallery with luxury ÉLEVÉ tone." />
        <AIGeneratePanel task="blog_post" label="Blog" prompt="Write a blog post about the creative process behind ÉLEVÉ Sessions Vol. 1." />
        <AIGeneratePanel task="seo_meta" label="SEO" prompt="Write SEO title and meta description for the portfolio page." />
        <AIGeneratePanel task="alt_text" label="Alt text" prompt="Write alt text for a dramatic black-and-white portrait in a studio setting." />
      </AdminPanel>
    </AdminShell>
  );
}
