import "server-only";
import { get, put } from "@vercel/blob";
import { prisma } from "@/lib/db";

export function getSessionUploadBlobOptions(): { token: string } | { storeId: string } {
  const token = process.env.SESSION_UPLOAD_READ_WRITE_TOKEN?.trim();
  if (token) return { token };
  const storeId = process.env.SESSION_UPLOAD_BLOB_STORE_ID?.trim();
  if (storeId) return { storeId };
  throw new Error("Private session upload storage is not configured");
}

export function isSessionUploadStorageConfigured(): boolean {
  return Boolean(
    process.env.SESSION_UPLOAD_READ_WRITE_TOKEN ||
      process.env.SESSION_UPLOAD_BLOB_STORE_ID
  );
}

export async function putPrivateApplicantBlob(
  pathname: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const blob = await put(pathname.replace(/^\/+/, ""), buffer, {
    access: "private",
    contentType,
    ...getSessionUploadBlobOptions(),
  });
  return blob.url;
}

export async function getPrivateApplicantBlob(url: string) {
  return get(url, {
    access: "private",
    ...getSessionUploadBlobOptions(),
  });
}

export function applicantMediaUrl(
  origin: string,
  id: string,
  uploadToken?: string
): string {
  const url = new URL(`/api/session-media/${encodeURIComponent(id)}`, origin);
  if (uploadToken) url.searchParams.set("token", uploadToken);
  return url.toString();
}

export function applicantMediaId(value: string): string | null {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/api\/session-media\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export async function resolveApplicantImageInputs(urls: string[]): Promise<string[]> {
  const internalIds = urls.map(applicantMediaId).filter((id): id is string => Boolean(id));
  if (internalIds.length === 0) return urls;

  const assets = await prisma.mediaAsset.findMany({
    where: {
      id: { in: internalIds },
      purpose: "session-application",
      claimedAt: { not: null },
    },
    select: { id: true, url: true },
  });
  const byId = new Map(assets.map((asset) => [asset.id, asset.url]));

  return Promise.all(
    urls.map(async (url) => {
      const id = applicantMediaId(url);
      if (!id) return url;
      const privateUrl = byId.get(id);
      if (!privateUrl) return "";
      try {
        const result = await getPrivateApplicantBlob(privateUrl);
        if (!result || result.statusCode !== 200 || result.blob.size > 5 * 1024 * 1024) {
          return "";
        }
        const bytes = Buffer.from(await new Response(result.stream).arrayBuffer());
        return `data:${result.blob.contentType};base64,${bytes.toString("base64")}`;
      } catch (error) {
        console.error("[session-private-media] AI image load failed:", id, error);
        return "";
      }
    })
  ).then((values) => values.filter(Boolean));
}
