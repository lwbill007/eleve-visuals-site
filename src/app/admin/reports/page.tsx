import { AdminShell } from "@/components/admin/AdminShell";
import { AdminPageHeader, AdminPanel } from "@/components/admin/os/AdminOSComponents";
import Link from "next/link";

export default function AdminReportsPage() {
  return (
    <AdminShell title="Reports">
      <div className="space-y-8">
        <AdminPageHeader
          eyebrow="Command Center"
          title="Reports"
          description="Export business data for accounting, sponsors, and strategic planning."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { title: "Submissions Export", desc: "All inquiries CSV", href: "/admin/submissions" },
            { title: "Notification History", desc: "Delivery log export", href: "/admin/notifications" },
            { title: "Sponsor Report", desc: "Print-ready metrics", href: "/admin/sponsorship" },
            { title: "Analytics", desc: "Traffic & conversions", href: "/admin/analytics" },
          ].map((item) => (
            <Link
              key={item.href + item.title}
              href={item.href}
              className="rounded-xl border border-stone/25 p-5 hover:border-accent/30"
            >
              <p className="font-display text-lg text-cream">{item.title}</p>
              <p className="mt-1 text-sm text-muted">{item.desc}</p>
            </Link>
          ))}
        </div>

        <AdminPanel title="Coming Soon" subtitle="PDF, CSV & Excel exports">
          <ul className="space-y-2 text-sm text-fog">
            <li>• Monthly revenue report</li>
            <li>• Booking & expense summary</li>
            <li>• Campaign performance</li>
            <li>• Session performance by volume</li>
          </ul>
        </AdminPanel>
      </div>
    </AdminShell>
  );
}
