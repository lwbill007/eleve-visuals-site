import { AdminShell } from "@/components/admin/AdminShell";
import { SponsorshipClient } from "@/components/admin/os/SponsorshipClient";

export default function AdminSponsorshipPage() {
  return (
    <AdminShell title="Sponsorship">
      <SponsorshipClient />
    </AdminShell>
  );
}
