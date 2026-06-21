import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
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
      return NextResponse.json({ url: blobUrl });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error("Upload failed:", error);
    return NextResponse.json(
      {
        error:
          process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN
            ? "Image uploads on Vercel require BLOB_READ_WRITE_TOKEN. Add a Vercel Blob store in your project settings."
            : "Upload failed. Check server storage permissions.",
      },
      { status: 500 }
    );
  }
}
