import { redirect } from "next/navigation";

/** Mission Control folded into Business Brain (CPO IA). */
export default function IntelligenceRedirectPage() {
  redirect("/admin/memory");
}
