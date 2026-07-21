import { redirect } from "next/navigation";

/** Legacy path — AI Operations owns trustworthiness telemetry. */
export default function AIHealthRedirectPage() {
  redirect("/admin/ai-operations");
}
