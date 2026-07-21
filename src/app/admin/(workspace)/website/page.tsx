import { AdminShell } from "@/components/admin/AdminShell";
import { WebsiteIntelligenceClient } from "@/components/admin/ai/WebsiteIntelligenceClient";

export default function AdminWebsitePage() {
  return (
    <AdminShell title="Website Intelligence">
      <WebsiteIntelligenceClient />
    </AdminShell>
  );
}
