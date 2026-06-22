const BLOB_HOST_PATTERN = /\.public\.blob\.vercel-storage\.com\//i;

export function isVercelBlobUrl(url: string): boolean {
  return BLOB_HOST_PATTERN.test(url);
}

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
