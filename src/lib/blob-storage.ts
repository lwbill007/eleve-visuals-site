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

function parseUrlArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Best-effort cleanup of every Blob URL referenced by a record before its row is deleted.
 * Each field can be a single URL (string|null) or a JSON-stringified array of URLs.
 * Never throws — a storage hiccup should never block the actual record deletion.
 */
export async function deleteBlobUrlsForRecord(
  fields: (string | null | undefined)[]
): Promise<void> {
  const urls = fields.flatMap((f) => (f && (f.startsWith("[") ? parseUrlArray(f) : [f])) || []);
  await Promise.all(urls.map((url) => deleteBlobUrl(url).catch(() => false)));
}
