import { AdminShell } from "@/components/admin/AdminShell";
import { AdminModuleScaffold } from "@/components/admin/os/AdminModuleScaffold";

export default function AdminEmailPage() {
  return (
    <AdminShell title="Email Marketing">
      <AdminModuleScaffold
        eyebrow="Marketing"
        title="Email Marketing"
        description="Professional campaigns, templates, and segmentation — built on your notification infrastructure."
        features={[
          "Visual email builder",
          "Beautiful ÉLEVÉ-branded templates",
          "Save drafts & schedule sends",
          "Desktop, mobile & dark mode preview",
          "Open, click, bounce & spam analytics",
          "Subscriber tags & smart segments",
        ]}
        links={[
          { label: "Notification Settings", href: "/admin/notifications", desc: "Email delivery, webhooks & history" },
          { label: "CRM Contacts", href: "/admin/crm", desc: "Tag clients, models, sponsors & VIPs" },
          { label: "Automations", href: "/admin/automations", desc: "Welcome sequences & nurture flows" },
        ]}
      />
    </AdminShell>
  );
}
