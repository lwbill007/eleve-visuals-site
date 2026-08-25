import "server-only";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { safeExtension } from "@/lib/storage/r2-keys";

/**
 * Cloudflare R2, S3-compatible.
 *
 * Chosen over the existing Vercel Blob store for photography only: R2 charges
 * nothing for egress, and a delivery gallery is almost entirely egress. Blob
 * keeps contract PDFs and session-application media — nothing existing moved.
 *
 * Nothing outside this directory should import the S3 SDK. Callers deal in
 * object keys; where the bytes live is this module's problem.
 */

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const BUCKET = process.env.R2_BUCKET_NAME ?? "";

/** Every credential must be present — a half-configured bucket fails loudly. */
export function isGalleryStorageConfigured(): boolean {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET);
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super(
      "Cloudflare R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
        "R2_SECRET_ACCESS_KEY and R2_BUCKET_NAME."
    );
    this.name = "StorageNotConfiguredError";
  }
}

let client: S3Client | null = null;

function r2(): S3Client {
  if (!isGalleryStorageConfigured()) throw new StorageNotConfiguredError();
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
    });
  }
  return client;
}

export { safeExtension };

export type PhotoVariant = "originals" | "large" | "display" | "thumbnails";

/**
 * `gallery/{galleryId}/{variant}/{photoId}.{ext}`
 *
 * Grouped by gallery so a deletion is one prefix sweep, and split by variant so
 * derived versions can eventually be expired while originals are kept.
 */
export function photoKey(
  galleryId: string,
  variant: PhotoVariant,
  photoId: string,
  ext: string
): string {
  return `gallery/${galleryId}/${variant}/${photoId}.${safeExtension(ext)}`;
}

export function archiveKey(galleryId: string, archiveId: string): string {
  return `gallery/${galleryId}/archives/${archiveId}.zip`;
}

export function galleryPrefix(galleryId: string): string {
  return `gallery/${galleryId}/`;
}

/**
 * A presigned PUT the browser uploads the original directly to.
 *
 * Originals never pass through Vercel: it sidesteps the serverless body limit
 * entirely and costs no function bandwidth. The URL is scoped to one exact key
 * and one content type, so a stolen link cannot write anywhere else.
 */
export async function signedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 900
): Promise<string> {
  return getSignedUrl(
    r2(),
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }),
    { expiresIn: expiresInSeconds }
  );
}

/**
 * A short-lived read URL. Every client-facing byte goes through one of these,
 * minted only after the caller has proven gallery access — there is no public
 * bucket and no permanent object URL anywhere in this system.
 */
export async function signedReadUrl(
  key: string,
  opts: { expiresInSeconds?: number; downloadFilename?: string } = {}
): Promise<string> {
  const { expiresInSeconds = 900, downloadFilename } = opts;
  return getSignedUrl(
    r2(),
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ...(downloadFilename
        ? {
            ResponseContentDisposition: `attachment; filename="${downloadFilename.replace(
              /["\\]/g,
              ""
            )}"`,
          }
        : {}),
    }),
    { expiresIn: expiresInSeconds }
  );
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await r2().send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType })
  );
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await r2().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error(`R2 object has no body: ${key}`);
  return Buffer.from(await res.Body.transformToByteArray());
}

export async function objectSize(key: string): Promise<number> {
  const res = await r2().send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  return res.ContentLength ?? 0;
}

/** Byte totals per variant, so storage cost is visible in the admin. */
export async function galleryStorageUsage(
  galleryId: string
): Promise<Record<string, number>> {
  const usage: Record<string, number> = {};
  let token: string | undefined;
  do {
    const res = await r2().send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: galleryPrefix(galleryId),
        ContinuationToken: token,
      })
    );
    for (const obj of res.Contents ?? []) {
      const variant = obj.Key?.split("/")[2] ?? "other";
      usage[variant] = (usage[variant] ?? 0) + (obj.Size ?? 0);
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return usage;
}

/**
 * Delete every object under a prefix. Used when a gallery is deleted for real —
 * the database row goes only after this succeeds, so a failure here leaves a
 * recoverable gallery rather than orphaned objects nobody can find.
 */
export async function deletePrefix(prefix: string): Promise<number> {
  let deleted = 0;
  let token: string | undefined;
  do {
    const listed = await r2().send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: token })
    );
    const keys = (listed.Contents ?? []).map((o) => ({ Key: o.Key! })).filter((o) => o.Key);
    if (keys.length) {
      await r2().send(
        new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: keys, Quiet: true } })
      );
      deleted += keys.length;
    }
    token = listed.IsTruncated ? listed.NextContinuationToken : undefined;
  } while (token);
  return deleted;
}

export async function deleteKeys(keys: string[]): Promise<void> {
  const present = keys.filter(Boolean);
  if (!present.length) return;
  for (let i = 0; i < present.length; i += 1000) {
    await r2().send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: present.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
      })
    );
  }
}
