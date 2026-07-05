import { AdminShell } from "@/components/admin/AdminShell";
import { AdminModuleScaffold } from "@/components/admin/os/AdminModuleScaffold";
import { AdminPanel } from "@/components/admin/os/AdminOSComponents";

const WORKFLOW = [
  "Website Signup",
  "Welcome Email",
  "Wait 2 Days",
  "Portfolio Showcase",
  "Wait 3 Days",
  "Book a Session CTA",
  "Wait 6 Months",
  "Re-booking Offer",
];

export default function AdminAutomationsPage() {
  return (
    <AdminShell title="Automations">
      <AdminModuleScaffold
        eyebrow="Marketing"
        title="Automations"
        description="Visual workflow builder for welcome sequences, application follow-ups, and re-engagement."
        features={[
          "Drag-and-drop workflow builder",
          "Unlimited automation paths",
          "Trigger on signup, application, booking",
          "Wait steps, emails, and tags",
          "Session application confirmation flows",
        ]}
        links={[
          { label: "Email Marketing", href: "/admin/email", desc: "Campaign templates & sends" },
          { label: "Notifications", href: "/admin/notifications", desc: "Delivery logs & health" },
          { label: "Applications", href: "/admin/applications", desc: "Trigger on new applicants" },
        ]}
      />
      <AdminPanel title="Example Workflow" subtitle="New subscriber nurture" className="mt-8">
        <div className="flex flex-wrap items-center gap-2">
          {WORKFLOW.map((step, i) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-lg border border-stone/30 bg-charcoal/30 px-3 py-2 text-xs text-cream">
                {step}
              </span>
              {i < WORKFLOW.length - 1 && <span className="text-muted">↓</span>}
            </span>
          ))}
        </div>
      </AdminPanel>
    </AdminShell>
  );
}
