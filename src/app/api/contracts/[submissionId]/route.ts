import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPrivateBlob } from "@/lib/private-blob";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { submissionId } = await params;
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: { data: true },
  });
  if (!submission) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  let contract: { pdfUrl?: string } = {};
  try {
    contract = (JSON.parse(submission.data) as Record<string, unknown>).contract as
      | { pdfUrl?: string }
      | undefined ?? {};
  } catch {
    contract = {};
  }

  if (!contract.pdfUrl) {
    return NextResponse.json({ error: "No signed contract on file" }, { status: 404 });
  }

  try {
    const result = await getPrivateBlob(contract.pdfUrl);
    if (!result) {
      return NextResponse.json({ error: "Contract unavailable" }, { status: 404 });
    }
    return new Response(result.stream, {
      headers: {
        "Cache-Control": "private, max-age=60",
        "Content-Disposition": "inline",
        "Content-Length": String(result.blob.size),
        "Content-Type": result.blob.contentType || "application/pdf",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[contracts] read failed:", submissionId, error);
    return NextResponse.json({ error: "Contract unavailable" }, { status: 503 });
  }
}
