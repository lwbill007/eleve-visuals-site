import { redirect } from "next/navigation";

/** Legacy assistant → Business Brain */
export default function AdminAssistantPage() {
  redirect("/admin/memory");
}
