import { Suspense } from "react";
import ApplicationsIntelligenceClient from "./ApplicationsIntelligenceClient";
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
      <ApplicationsIntelligenceClient />
    </Suspense>
  );
}
