import { Suspense } from "react";
import AdminSubmissionsClient from "./SubmissionsClient";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";

export default function AdminSubmissionsPage() {
  return (
    <Suspense fallback={<AdminPageSkeleton rows={8} />}>
      <AdminSubmissionsClient />
    </Suspense>
  );
}
