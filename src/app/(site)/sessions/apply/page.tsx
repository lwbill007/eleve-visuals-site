import { redirect } from "next/navigation";
import { getOpenSessionVolume } from "@/lib/session-volumes";

export const dynamic = "force-dynamic";

export default async function SessionsApplyPage() {
  const open = await getOpenSessionVolume();
  if (open) redirect(`/sessions/${open.slug}#apply`);
  redirect("/sessions");
}
