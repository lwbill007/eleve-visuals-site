import { NextResponse } from "next/server";
import type { z } from "zod";
import { prisma } from "./db";
import { recordConversion, type ConversionType } from "./analytics-server";
import { checkRateLimit, getClientIp } from "./rate-limit";
import { runSpamChecks, stripSpamFields } from "./spam";

interface SubmitOptions<T extends z.ZodType> {
  request: Request;
  route: string;
  conversionType: ConversionType;
  schema: T;
}

export async function handleFormSubmit<T extends z.ZodType>({
  request,
  route,
  conversionType,
  schema,
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

  const spam = await runSpamChecks(body);
  if (spam.isSpam) {
    if (spam.silent) return NextResponse.json({ ok: true });
    return NextResponse.json({ error: spam.message ?? "Submission rejected" }, { status: 400 });
  }

  const cleaned = stripSpamFields(body);
  const parsed = schema.safeParse(cleaned);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  try {
    await prisma.submission.create({
      data: { type: conversionType, data: JSON.stringify(parsed.data) },
    });

    const referer = request.headers.get("referer") ?? undefined;
    const sessionId =
      typeof body._sessionId === "string" ? body._sessionId : undefined;
    const path = referer ? new URL(referer).pathname : `/${conversionType}`;

    await recordConversion(conversionType, path, referer ?? null, sessionId);
  } catch {
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
