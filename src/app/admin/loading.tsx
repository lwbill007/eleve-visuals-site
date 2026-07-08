import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";

export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-ink p-4 sm:p-6 lg:p-8">
      <AdminPageSkeleton rows={5} />
    </div>
  );
}
