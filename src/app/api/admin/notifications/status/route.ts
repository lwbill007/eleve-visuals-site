import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getEmailProvider, getPushProvider, getSmsProvider } from "@/lib/notifications";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = getEmailProvider();
  const sms = getSmsProvider();
  const push = getPushProvider();
  const pushDevices = await prisma.pushSubscription.count();

  return NextResponse.json({
    email: { provider: email.name, configured: email.isConfigured() },
    sms: { provider: sms.name, configured: sms.isConfigured() },
    push: { provider: push.name, configured: push.isConfigured(), devices: pushDevices },
  });
}
