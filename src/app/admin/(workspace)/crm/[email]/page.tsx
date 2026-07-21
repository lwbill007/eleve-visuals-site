import { AdminShell } from "@/components/admin/AdminShell";
import { CRMProfileClient } from "@/components/admin/ai/CRMProfileClient";

export default async function CRMProfilePage({ params }: { params: Promise<{ email: string }> }) {
  const { email } = await params;
  return (
    <AdminShell title="Client Profile">
      <CRMProfileClient email={decodeURIComponent(email)} />
    </AdminShell>
  );
}
