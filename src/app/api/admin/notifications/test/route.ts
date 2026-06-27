import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendTestNotification } from "@/lib/notifications";

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
