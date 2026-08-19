import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyBookingAccessToken } from "@/lib/booking-access-token";
import { generateContractPdf } from "@/lib/contract-pdf";
import { putPrivateBlob, isPrivateBlobStorageConfigured } from "@/lib/private-blob";
import { getBookingTerms, getSiteConfig } from "@/lib/content";
import { estimateSubmissionValue } from "@/lib/estimate-budget";
import { sendEmail, contractSignedEmail } from "@/lib/email";
import { invalidateIntelligenceCaches } from "@/lib/ai/cognitive/cache";

const signSchema = z.object({
  token: z.string().min(10),
  signerName: z.string().trim().min(2).max(200),
  agree: z.literal(true),
});

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const { submissionId } = await params;
  const ip = getClientIp(request);
  const rate = await checkRateLimit(ip, "contract:sign");
  if (!rate.ok) {
    return NextResponse.json({ error: "Too many attempts — try again later." }, { status: 429 });
  }

  if (!isPrivateBlobStorageConfigured()) {
    return NextResponse.json({ error: "Contract storage is not configured." }, { status: 503 });
  }

  const parsed = signSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid contract submission." }, { status: 400 });
  }
  const { token, signerName } = parsed.data;

  const tokenSubmissionId = await verifyBookingAccessToken(token);
  if (!tokenSubmissionId || tokenSubmissionId !== submissionId) {
    return NextResponse.json({ error: "Invalid or expired link." }, { status: 401 });
  }

  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(submission.data) as Record<string, unknown>;
  } catch {
    data = {};
  }

  const existingContract = data.contract as { status?: string } | undefined;
  if (existingContract?.status === "signed") {
    return NextResponse.json({ error: "This contract has already been signed." }, { status: 409 });
  }

  const terms = await getBookingTerms();
  const totalValue = estimateSubmissionValue(data);
  const signedAt = new Date().toISOString();

  const pdfBuffer = await generateContractPdf({
    clientName: asString(data.fullName) || "Client",
    packageName: asString(data.packageId) || "ÉLEVÉ Experience",
    preferredDate: asString(data.preferredDate) || undefined,
    totalValue,
    depositAmount: Math.round(totalValue * 0.5),
    signerName,
    signedAt,
    signerIp: ip,
    terms,
  });

  const pdfUrl = await putPrivateBlob(
    `contracts/${submissionId}-${Date.now()}.pdf`,
    pdfBuffer,
    "application/pdf"
  );

  data.contract = { status: "signed", signedAt, signerName, signerIp: ip, pdfUrl };

  await prisma.submission.update({
    where: { id: submissionId },
    data: { data: JSON.stringify(data).slice(0, 500_000) },
  });
  void invalidateIntelligenceCaches().catch(() => {});

  const clientEmail = submission.contactEmail || asString(data.email);
  const clientName = asString(data.fullName) || "Client";
  const siteConfig = await getSiteConfig().catch(() => null);

  const recipients: Promise<unknown>[] = [];
  if (clientEmail) {
    const mail = contractSignedEmail({ name: clientName, signerName, isAdminCopy: false });
    recipients.push(
      sendEmail({ to: clientEmail, subject: mail.subject, html: mail.html, replyTo: siteConfig?.email })
    );
  }
  if (siteConfig?.email) {
    const mail = contractSignedEmail({ name: clientName, signerName, isAdminCopy: true });
    recipients.push(sendEmail({ to: siteConfig.email, subject: mail.subject, html: mail.html }));
  }
  await Promise.allSettled(recipients);

  return NextResponse.json({ ok: true, signedAt });
}
