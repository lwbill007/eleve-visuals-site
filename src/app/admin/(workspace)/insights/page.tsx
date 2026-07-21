import { redirect } from "next/navigation";

/** Insights → AI Briefing (CEO brief is the insights surface). */
export default function AdminInsightsRedirect() {
  redirect("/admin/briefing");
}
