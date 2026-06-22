import { Suspense } from "react";
import AdminSubmissionsClient from "../submissions/SubmissionsClient";
import { AdminPageSkeleton } from "@/components/admin/AdminPageSkeleton";

export default function AdminApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-10">
          <AdminPageSkeleton rows={8} />
        </div>
      }
    >
      <AdminSubmissionsClient forcedType="session" />
    </Suspense>
  );
}
