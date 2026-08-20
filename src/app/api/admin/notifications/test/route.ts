import { NextResponse } from "next/server";
import { requireAdmin, requireMinimumRole } from "@/lib/auth";
import { sendTestNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    await requireMinimumRole("editor");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { channel?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validChannels = ["email", "sms", "push", "webhook"] as const;
  if (!validChannels.includes(body.channel as (typeof validChannels)[number])) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  const result = await sendTestNotification(
    body.channel as (typeof validChannels)[number]
  );

  if (result.status === "sent") {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json(
    { ok: false, error: result.error || "Delivery failed" },
    { status: 502 }
  );
}
