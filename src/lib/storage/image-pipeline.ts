import "server-only";
import sharp from "sharp";

// Each invocation handles exactly one photo, so a cross-invocation cache
// only retains memory on a warm container that will never reuse it.
sharp.cache(false);
import { photoKey, putObject, type PhotoVariant } from "@/lib/storage/r2";

/**
 * Derivative generation.
 *
 * Sharp in a Node-runtime route, not Cloudflare Images: the transform config
 * stays in the repo and reviewable, and there is no per-image recurring charge
 * for something that runs free. Originals are uploaded browser-to-R2 and only
 * streamed here for derivation, so no client ever waits on this.
 */

/**
 * `"truncated"` rather than `"none"`.
 *
 * `"none"` made Sharp tolerate a partially-uploaded JPEG: it decoded the bytes
 * it had, produced a half-grey frame, and the photo was stored as `ready` and
 * delivered to the client. An interrupted upload is exactly the failure this
 * pipeline exists to catch. Verified against real bytes 2026-08-25: at this
 * level a truncated JPEG is rejected while valid JPEG, EXIF-rotated JPEG and
 * PNG-with-alpha all still pass.
 */
const FAIL_ON = "truncated" as const;

export const VARIANTS = {
  thumbnail: { width: 640, quality: 72 },
  display: { width: 1800, quality: 82 },
  large: { width: 3200, quality: 88 },
} as const;

export type DerivedVariant = keyof typeof VARIANTS;

const VARIANT_DIR: Record<DerivedVariant, PhotoVariant> = {
  thumbnail: "thumbnails",
  display: "display",
  large: "large",
};

export const ACCEPTED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/tiff",
]);

/** 200 MB. Generous for a full-frame TIFF, still a real ceiling. */
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

export type ProcessedPhoto = {
  width: number;
  height: number;
  blurColor: string;
  keys: Record<DerivedVariant, string>;
};

/**
 * WebP for every derivative. Universally supported by any browser that can run
 * this app, roughly 30% smaller than equivalent-quality JPEG, and it keeps the
 * variant matrix at one format instead of negotiating per request. The original
 * is stored untouched in whatever format it arrived as.
 */
export async function deriveVariants(
  original: Buffer,
  galleryId: string,
  photoId: string
): Promise<ProcessedPhoto> {
  const meta = await sharp(original, { failOn: FAIL_ON }).metadata();

  // Report post-rotation dimensions without decoding the whole image: EXIF
  // orientations 5-8 are the quarter turns, and every derivative below is
  // .rotate()d, so the grid's aspect ratios must agree with the rotated pixels.
  const turned = (meta.orientation ?? 1) >= 5;
  const width = (turned ? meta.height : meta.width) ?? 0;
  const height = (turned ? meta.width : meta.height) ?? 0;

  const keys = {} as Record<DerivedVariant, string>;
  for (const [name, spec] of Object.entries(VARIANTS) as [
    DerivedVariant,
    (typeof VARIANTS)[DerivedVariant]
  ][]) {
    const buffer = await sharp(original, { failOn: FAIL_ON })
      .rotate()
      // withoutEnlargement: a small original is never upscaled into a bigger,
      // softer file that costs more to serve and looks worse.
      .resize({ width: spec.width, withoutEnlargement: true })
      .webp({ quality: spec.quality })
      .toBuffer();
    const key = photoKey(galleryId, VARIANT_DIR[name], photoId, "webp");
    await putObject(key, buffer, "image/webp");
    keys[name] = key;
  }

  return { width, height, blurColor: await averageColor(original), keys };
}

/**
 * One averaged colour for the grid placeholder. A 1px resize is far cheaper
 * than a base64 blur bitmap per photo and, against this dark editorial layout,
 * reads as intentional rather than as a loading artefact.
 */
async function averageColor(original: Buffer): Promise<string> {
  try {
    const { data } = await sharp(original, { failOn: FAIL_ON })
      .rotate()
      .resize(1, 1, { fit: "cover" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const hex = [data[0], data[1], data[2]]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
    return `#${hex}`;
  } catch {
    return "#1a1a1a";
  }
}

/** A watermark is drawn onto previews only — never onto an original download. */
export async function watermarkBuffer(
  input: Buffer,
  text: string,
  opacity = 0.28
): Promise<Buffer> {
  const image = sharp(input, { failOn: FAIL_ON });
  const { width = 1600, height = 1200 } = await image.metadata();
  const fontSize = Math.max(18, Math.round(width * 0.028));
  const svg = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
       <text x="${width - Math.round(width * 0.04)}" y="${height - Math.round(height * 0.04)}"
             text-anchor="end" font-family="Georgia, serif" font-size="${fontSize}"
             fill="#ffffff" fill-opacity="${opacity}"
             letter-spacing="${Math.round(fontSize * 0.18)}">${escapeXml(text)}</text>
     </svg>`
  );
  return image.composite([{ input: svg, blend: "over" }]).toBuffer();
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;"
  );
}
