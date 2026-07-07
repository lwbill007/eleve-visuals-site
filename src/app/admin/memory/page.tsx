import { AdminShell } from "@/components/admin/AdminShell";
import { CognitiveArchitectureClient } from "@/components/admin/ai/CognitiveArchitectureClient";

export default function AdminMemoryPage() {
  return (
    <AdminShell title="Knowledge Engine">
      <CognitiveArchitectureClient />
    </AdminShell>
  );
}
