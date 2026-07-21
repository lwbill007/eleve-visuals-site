import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getSessionUploadTokenVolumeId,
  hashSessionUploadToken,
} from "@/lib/session-upload-token";
import { getPrivateApplicantBlob } from "@/lib/session-private-media";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const asset = await prisma.mediaAsset.findUnique({
    where: { id },
    select: {
      url: true,
      purpose: true,
      uploadTokenHash: true,
      claimedAt: true,
    },
  });

  if (!asset || asset.purpose !== "session-application") {
    return NextResponse.json({ error: "Media not found" }, { status: 404 });
  }

  const session = await getSession();
  const uploadToken = new URL(request.url).searchParams.get("token");
  const validApplicantToken =
    !asset.claimedAt &&
    Boolean(uploadToken) &&
    Boolean(await getSessionUploadTokenVolumeId(uploadToken!)) &&
    hashSessionUploadToken(uploadToken!) === asset.uploadTokenHash;

  if (!session && !validApplicantToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await getPrivateApplicantBlob(asset.url);
    if (!result) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }
    if (result.statusCode === 304) {
      return new Response(null, { status: 304 });
    }

    return new Response(result.stream, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": "inline",
        "Content-Length": String(result.blob.size),
        "Content-Type": result.blob.contentType,
        ETag: result.blob.etag,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[session-media] read failed:", id, error);
    return NextResponse.json({ error: "Media unavailable" }, { status: 503 });
  }
}
