import { redirect } from "next/navigation";
import { getOpenSessionVolume } from "@/lib/session-volumes";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Session Application",
  robots: { index: false, follow: true },
};

export default async function SessionsApplyPage() {
  const open = await getOpenSessionVolume();
  if (open) redirect(`/sessions/${open.slug}/apply`);
  redirect("/sessions");
}
