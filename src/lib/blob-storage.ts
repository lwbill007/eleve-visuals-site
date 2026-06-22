import { isVercelBlobUrl } from "@/lib/image-url";

export { isVercelBlobUrl };

export async function deleteBlobUrl(url: string): Promise<boolean> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token || !isVercelBlobUrl(url)) return false;

  try {
    const { del } = await import("@vercel/blob");
    await del(url, { token });
    return true;
  } catch (error) {
    console.error("Blob delete failed:", error);
    return false;
  }
}
