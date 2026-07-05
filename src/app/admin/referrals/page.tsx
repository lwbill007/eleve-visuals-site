import { AdminShell } from "@/components/admin/AdminShell";
import { AdminModuleScaffold } from "@/components/admin/os/AdminModuleScaffold";

export default function AdminReferralsPage() {
  return (
    <AdminShell title="Referrals">
      <AdminModuleScaffold
        eyebrow="Revenue"
        title="Referral Program"
        description="Track ambassadors, referral codes, and revenue from word-of-mouth."
        features={[
          "Who referred who",
          "Referral revenue tracking",
          "Automatic reward tracking",
          "Top ambassador leaderboard",
          "Unique referral codes per client",
        ]}
        links={[
          { label: "Referral Campaign", href: "/admin/marketing?task=campaign&focus=referral", desc: "Draft referral messaging in Marketing Studio" },
          { label: "CRM", href: "/admin/crm", desc: "See client source & repeat status" },
          { label: "Bookings", href: "/admin/submissions?type=booking", desc: "Referral source field on inquiries" },
          { label: "AI Insights", href: "/admin/insights", desc: "Re-engagement recommendations" },
        ]}
      />
    </AdminShell>
  );
}
