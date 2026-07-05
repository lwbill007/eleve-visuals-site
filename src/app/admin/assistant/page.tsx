import { redirect } from "next/navigation";

/** Legacy assistant route — executive intelligence is the primary interface */
export default function AdminAssistantPage() {
  redirect("/admin/intelligence");
}
