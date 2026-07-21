import { NextResponse } from "next/server";
import { after } from "next/server";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "./db";
import { recordConversion, type ConversionType } from "./analytics-server";
import { checkRateLimit, getClientIp } from "./rate-limit";
import { runSpamChecks, stripSpamFields } from "./spam";
import {
  extractContact,
  notifyNewSubmission,
  sendVisitorConfirmation,
} from "./notifications";
import type { NotificationFormType } from "./types";

interface SubmitOptions<T extends z.ZodType> {
  request: Request;
  route: string;
  conversionType: ConversionType;
  schema: T;
  analyticsPath?: string;
  notifyFormType?: NotificationFormType;
  confirmVisitor?: boolean;
}

export async function handleFormSubmit<T extends z.ZodType>({
  request,
  route,
  conversionType,
  schema,
  analyticsPath,
  notifyFormType,
  confirmVisitor = false,
}: SubmitOptions<T>) {
  const ip = getClientIp(request);

  const rateLimit = await checkRateLimit(ip, route);
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSec) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const spam = await runSpamChecks(body, request);
  if (spam.isSpam) {
    if (spam.silent) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: spam.message ?? "Submission rejected" }, { status: 400 });
  }

  const cleaned = stripSpamFields(body);
  const idempotencyKey =
    typeof cleaned.idempotencyKey === "string" &&
    /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(cleaned.idempotencyKey)
      ? cleaned.idempotencyKey
      : null;
  const parsed = schema.safeParse(cleaned);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const parsedRecord = parsed.data as Record<string, unknown>;
  const contactEmail =
    typeof parsedRecord.email === "string" ? parsedRecord.email.trim().toLowerCase() : "";

  let inquiryId: string | undefined;
  try {
    const submission = await prisma.submission.create({
      data: {
        type: conversionType,
        idempotencyKey,
        data: JSON.stringify(parsed.data),
        status: "new",
        ipAddress: ip,
        userAgent: (request.headers.get("user-agent") ?? "").slice(0, 1000),
        contactEmail,
      },
    });
    inquiryId = submission.id;
  } catch (error) {
    if (
      idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.submission.findUnique({
        where: { idempotencyKey },
        select: { id: true },
      });
      if (existing) {
        return NextResponse.json({ ok: true, inquiryId: existing.id, deduplicated: true });
      }
    }
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  const formType = notifyFormType ?? (conversionType as NotificationFormType);
  const submissionData = parsed.data as Record<string, unknown>;
  const referer = request.headers.get("referer") ?? undefined;
  const sessionId =
    typeof body._sessionId === "string" ? body._sessionId : undefined;
  const path =
    analyticsPath ??
    (referer ? new URL(referer).pathname : `/${conversionType}`);
  after(async () => {
    const results = await Promise.allSettled([
      recordConversion(conversionType, path, referer ?? null, sessionId),
      notifyNewSubmission({
        formType,
        submissionId: inquiryId,
        data: submissionData,
      }),
      ...(confirmVisitor
        ? [
            (async () => {
              const contact = extractContact(submissionData);
              await sendVisitorConfirmation({
                formType,
                to: contact.email,
                name: contact.name,
              });
            })(),
          ]
        : []),
    ]);
    for (const result of results) {
      if (result.status === "rejected") {
        console.error("Submission follow-up failed:", result.reason);
      }
    }
  });

  return NextResponse.json({ ok: true, inquiryId });
}
