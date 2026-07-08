import { redirect } from "next/navigation";

/** Insights merged into Opportunities — one decision queue. */
export default function AdminInsightsRedirect() {
  redirect("/admin/opportunities");
}
