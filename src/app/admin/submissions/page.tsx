import { Suspense } from "react";
import AdminSubmissionsClient from "./SubmissionsClient";

export default function AdminSubmissionsPage() {
  return (
    <Suspense fallback={<p className="p-10 text-fog">Loading...</p>}>
      <AdminSubmissionsClient />
    </Suspense>
  );
}
