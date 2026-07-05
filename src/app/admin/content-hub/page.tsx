import { AdminShell } from "@/components/admin/AdminShell";
import { AdminModuleScaffold } from "@/components/admin/os/AdminModuleScaffold";

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
    </AdminShell>
  );
}
