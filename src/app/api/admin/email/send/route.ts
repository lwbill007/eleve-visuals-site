import { NextResponse } from "next/server";
import { requireAdmin, requireRole, type AdminRole } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/db";
import { getSiteConfig } from "@/lib/content";

const TEMPLATES = [
  {
    id: "follow_up_booking",
    name: "Booking follow-up",
    subject: "Following up on your ÉLEVÉ inquiry",
    body: (name: string) =>
      `<p>Hi ${name || "there"},</p><p>Thank you for reaching out to ÉLEVÉ Visuals. I'd love to learn more about your project and share availability.</p><p>Reply to this email with preferred dates and any references — I'll respond personally.</p><p>— ÉLEVÉ Visuals</p>`,
  },
  {
    id: "reactivate_client",
    name: "Client reactivation",
    subject: "It's been a while — let's create again",
    body: (name: string) =>
      `<p>Hi ${name || "there"},</p><p>It's been a while since we last worked together. I have new availability and would love to collaborate again.</p><p>If you're planning a session, portrait, or brand project, reply and we'll find a date.</p><p>— ÉLEVÉ Visuals</p>`,
  },
  {
    id: "application_nudge",
    name: "Application reminder",
    subject: "Your ÉLEVÉ Sessions application",
    body: (name: string) =>
      `<p>Hi ${name || "there"},</p><p>We're reviewing applications and wanted to make sure we have everything we need from you.</p><p>If anything has changed (portfolio, availability, roles), reply to this email.</p><p>— ÉLEVÉ Sessions</p>`,
  },
] as const;

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendReady = Boolean(process.env.RESEND_API_KEY && (process.env.EMAIL_FROM || process.env.SITE_EMAIL));

  const recent = await prisma.notificationLog.findMany({
    where: { channel: "email" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    ready: resendReady,
    templates: TEMPLATES.map((t) => ({ id: t.id, name: t.name, subject: t.subject })),
    recent: recent.map((r) => ({
      id: r.id,
      formType: r.formType,
      status: r.status,
      recipient: r.recipient,
      subject: r.subject,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: Request) {
  try {
    await requireRole(["owner", "admin", "operator"] as AdminRole[]);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    to?: string;
    name?: string;
    templateId?: string;
    subject?: string;
    html?: string;
    submissionId?: string;
  };

  const to = body.to?.trim();
  if (!to || !to.includes("@")) {
    return NextResponse.json({ error: "Valid to email required" }, { status: 400 });
  }

  const template = TEMPLATES.find((t) => t.id === body.templateId);
  const subject = body.subject?.trim() || template?.subject;
  const html = body.html?.trim() || (template ? template.body(body.name?.trim() || "there") : "");

  if (!subject || !html) {
    return NextResponse.json({ error: "subject and html (or templateId) required" }, { status: 400 });
  }

  const site = await getSiteConfig().catch(() => ({ email: process.env.SITE_EMAIL || "" }));
  const ok = await sendEmail({
    to,
    subject,
    html,
    replyTo: site.email || undefined,
  });

  await prisma.notificationLog.create({
    data: {
      submissionId: body.submissionId ?? null,
      formType: template?.id ?? "manual_email",
      channel: "email",
      provider: "resend",
      recipient: to,
      subject,
      preview: html.replace(/<[^>]+>/g, " ").slice(0, 160),
      status: ok ? "sent" : "failed",
      error: ok ? "" : "sendEmail returned false",
      attempts: 1,
    },
  });

  if (!ok) {
    return NextResponse.json(
      { error: "Send failed — check RESEND_API_KEY and EMAIL_FROM" },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, to, subject });
}
