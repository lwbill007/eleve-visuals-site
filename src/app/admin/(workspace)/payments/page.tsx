import { redirect } from "next/navigation";

/** Legacy path — Financial Center owns revenue. */
export default function PaymentsRedirectPage() {
  redirect("/admin/financial");
}
