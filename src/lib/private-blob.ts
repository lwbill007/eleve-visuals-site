import "server-only";
import { get, put } from "@vercel/blob";
import { getSessionUploadBlobOptions, isSessionUploadStorageConfigured } from "@/lib/session-private-media";

/** Same private Blob store used for session-application photos — reused here for contract PDFs. */
export const isPrivateBlobStorageConfigured = isSessionUploadStorageConfigured;

export async function putPrivateBlob(
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

export async function getPrivateBlob(url: string) {
  return get(url, { access: "private", ...getSessionUploadBlobOptions() });
}
