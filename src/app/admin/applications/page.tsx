import { Suspense } from "react";
import ApplicationsClient from "./ApplicationsClient";
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
      <ApplicationsClient />
    </Suspense>
  );
}
