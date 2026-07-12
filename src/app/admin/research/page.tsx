import { AdminShell } from "@/components/admin/AdminShell";
import { ResearchIntelligenceClient } from "@/components/admin/ai/ResearchIntelligenceClient";

export default function ResearchPage() {
  return (
    <AdminShell title="Web Research">
      <ResearchIntelligenceClient />
    </AdminShell>
  );
}
