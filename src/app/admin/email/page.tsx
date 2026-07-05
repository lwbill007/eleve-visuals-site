import { AdminShell } from "@/components/admin/AdminShell";
import { AdminModuleScaffold } from "@/components/admin/os/AdminModuleScaffold";
import { AIGeneratePanel } from "@/components/admin/ai/AIGeneratePanel";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";

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
          { label: "Marketing Studio", href: "/admin/marketing?task=email_body", desc: "Generate email copy with AI today" },
          { label: "Notification Settings", href: "/admin/notifications", desc: "Email delivery, webhooks & history" },
          { label: "CRM Contacts", href: "/admin/crm", desc: "Tag clients, models, sponsors & VIPs" },
          { label: "Automations", href: "/admin/automations", desc: "Design nurture flows" },
        ]}
      />
      <AdminPanel title="AI Email Studio" subtitle="Generate drafts — review before sending" className="mt-8">
        <AIGeneratePanel task="email_subject" label="Subject lines" prompt="Write subject lines for a newsletter announcing new portfolio work." />
        <AIGeneratePanel task="email_body" label="Newsletter" prompt="Write a luxury newsletter for ÉLEVÉ Visuals subscribers highlighting recent sessions work." />
        <AIGeneratePanel task="campaign" label="Re-engagement" prompt="Write a re-engagement campaign for clients who haven't booked in 6 months." />
      </AdminPanel>
    </AdminShell>
  );
}
