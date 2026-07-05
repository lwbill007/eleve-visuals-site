import { AdminShell } from "@/components/admin/AdminShell";
import { MemoryCenterClient } from "@/components/admin/ai/MemoryCenterClient";

export default function AdminMemoryPage() {
  return (
    <AdminShell title="Memory Center">
      <MemoryCenterClient />
    </AdminShell>
  );
}
