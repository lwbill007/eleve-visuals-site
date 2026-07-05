import { AdminShell } from "@/components/admin/AdminShell";
import { AdminModuleScaffold } from "@/components/admin/os/AdminModuleScaffold";

export default function AdminFormsPage() {
  return (
    <AdminShell title="Forms">
      <AdminModuleScaffold
        eyebrow="Marketing"
        title="Forms"
        description="Manage every intake touchpoint. Submissions automatically tag contacts in CRM."
        features={[
          "Booking form configuration",
          "Contact & newsletter forms",
          "Session application wizard",
          "Auto-tagging on submit",
          "Questionnaire builder (coming soon)",
        ]}
        links={[
          { label: "Booking Form", href: "/admin/booking", desc: "Services, budget ranges & copy" },
          { label: "All Submissions", href: "/admin/submissions", desc: "Every form response" },
          { label: "Applications", href: "/admin/applications", desc: "ÉLEVÉ Sessions intake" },
          { label: "Page Copy", href: "/admin/content", desc: "FAQ & form labels" },
        ]}
      />
    </AdminShell>
  );
}
