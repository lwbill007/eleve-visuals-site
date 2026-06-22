import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 10 * 1024 * 1024;

async function uploadToBlob(filename: string, buffer: Buffer, contentType: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;

  const { put } = await import("@vercel/blob");
  const blob = await put(`uploads/${filename}`, buffer, {
    access: "public",
    contentType,
    token,
  });
  return blob.url;
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const blobUrl = await uploadToBlob(filename, buffer, file.type);
    if (blobUrl) {
      try {
        await prisma.mediaAsset.upsert({
          where: { url: blobUrl },
          create: { url: blobUrl, filename: file.name },
          update: { filename: file.name },
        });
      } catch {
        /* media index optional */
      }
      return NextResponse.json({ url: blobUrl });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    const localUrl = `/uploads/${filename}`;

    try {
      await prisma.mediaAsset.upsert({
        where: { url: localUrl },
        create: { url: localUrl, filename: file.name },
        update: { filename: file.name },
      });
    } catch {
      /* media index optional */
    }

    return NextResponse.json({ url: localUrl });
  } catch (error) {
    console.error("Upload failed:", error);

    if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error:
            "Image uploads on Vercel require a Blob store. In Vercel → Storage, create a Public Blob store, connect it to this project, then redeploy.",
        },
        { status: 500 }
      );
    }

    const detail = error instanceof Error ? error.message : String(error);
    const accessHint =
      /access|public|private|BlobAccess/i.test(detail)
        ? " Ensure your Vercel Blob store access mode is Public (Storage → your store → Settings)."
        : "";

    return NextResponse.json(
      {
        error:
          process.env.VERCEL
            ? `Upload failed.${accessHint} Check that BLOB_READ_WRITE_TOKEN matches a Public Blob store linked to this project.`
            : "Upload failed. For local dev, set BLOB_READ_WRITE_TOKEN or ensure public/uploads is writable.",
      },
      { status: 500 }
    );
  }
}
