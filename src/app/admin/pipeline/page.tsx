import { AdminShell } from "@/components/admin/AdminShell";
import { PipelineClient } from "@/components/admin/os/PipelineClient";

export default function AdminPipelinePage() {
  return (
    <AdminShell title="Pipeline">
      <PipelineClient />
    </AdminShell>
  );
}
