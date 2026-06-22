import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { runSpamChecks } from "@/lib/spam";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

async function uploadToBlob(filename: string, buffer: Buffer, contentType: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  const { put } = await import("@vercel/blob");
  const blob = await put(`applications/${filename}`, buffer, {
    access: "public",
    contentType,
    token,
  });
  return blob.url;
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const rateLimit = await checkRateLimit(ip, "submit:session-upload");
  if (!rateLimit.ok) {
    return NextResponse.json(
      { error: "Too many uploads. Please try again later." },
      { status: 429 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const honeypot = formData.get("website") as string | null;

  if (honeypot?.trim()) {
    return NextResponse.json({ ok: true, url: "" });
  }

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Only JPEG, PNG, and WebP images are allowed" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const blobUrl = await uploadToBlob(filename, buffer, file.type);
    if (blobUrl) {
      try {
        await prisma.mediaAsset.create({
          data: { url: blobUrl, filename: file.name, alt: "Session application portfolio" },
        });
      } catch {
        /* optional index */
      }
      return NextResponse.json({ url: blobUrl });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "applications");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    return NextResponse.json({ url: `/uploads/applications/${filename}` });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
