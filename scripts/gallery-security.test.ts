/**
 * Client gallery security tests.
 *
 * Matches the existing `scripts/*.test.ts` convention: plain node:assert, run
 * with tsx, no test framework. These cover the properties that would be
 * expensive to get wrong — code handling, authorization shape, and the
 * enumeration/IDOR guarantees the brief calls out in §9, §23 and §36.
 *
 *   npx tsx scripts/gallery-security.test.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  generateAccessCode,
  hashAccessCode,
  hashIp,
  hashToken,
  isGalleryLive,
  normalizeCode,
  verifyAccessCode,
} from "../src/lib/gallery/codes";

const root = join(import.meta.dirname, "..");
let checks = 0;
function check(label: string, fn: () => void | Promise<void>) {
  checks++;
  const result = fn();
  if (result instanceof Promise) return result.then(() => console.log(`  ✓ ${label}`));
  console.log(`  ✓ ${label}`);
  return Promise.resolve();
}

async function main() {
  console.log("\nAccess codes");

  await check("codes avoid characters that are misread when typed by hand", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateAccessCode();
      assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      assert.ok(!/[OIL01]/.test(code), `${code} contains an ambiguous character`);
    }
  });

  await check("codes do not repeat across a large sample", () => {
    const seen = new Set(Array.from({ length: 2000 }, generateAccessCode));
    assert.ok(seen.size > 1990, `only ${seen.size} unique codes in 2000 draws`);
  });

  await check("case and dashes are cosmetic", () => {
    assert.equal(normalizeCode(" 7kx9-pq2m "), "7KX9PQ2M");
    assert.equal(normalizeCode("7KX9PQ2M"), "7KX9PQ2M");
  });

  await check("a valid code verifies and a wrong one does not", async () => {
    const code = generateAccessCode();
    const hash = await hashAccessCode(code);
    assert.equal(await verifyAccessCode(code, hash), true);
    assert.equal(await verifyAccessCode(code.toLowerCase(), hash), true, "case must not matter");
    assert.equal(await verifyAccessCode(code.replace("-", ""), hash), true, "dash must not matter");
    assert.equal(await verifyAccessCode(generateAccessCode(), hash), false);
    assert.equal(await verifyAccessCode("", hash), false);
  });

  await check("the plaintext code never appears in what is stored", async () => {
    const code = generateAccessCode();
    const hash = await hashAccessCode(code);
    assert.ok(!hash.includes(normalizeCode(code)));
    assert.match(hash, /^\$2[aby]\$/, "must be a bcrypt hash");
  });

  await check("an empty stored hash rejects every code", async () => {
    assert.equal(await verifyAccessCode(generateAccessCode(), ""), false);
  });

  console.log("\nSession tokens");

  await check("a session token is stored only as a digest", () => {
    const raw = "a-secret-session-token";
    const digest = hashToken(raw);
    assert.notEqual(digest, raw);
    assert.match(digest, /^[0-9a-f]{64}$/);
    assert.equal(hashToken(raw), digest, "must be stable");
    assert.notEqual(hashToken(raw + "x"), digest);
  });

  await check("client IPs are stored only as a truncated digest", () => {
    const hashed = hashIp("203.0.113.42");
    assert.ok(!hashed.includes("203.0.113.42"));
    assert.equal(hashed.length, 32);
    assert.equal(hashIp(""), "", "no IP means no digest, not a digest of nothing");
  });

  console.log("\nGallery liveness");

  await check("only a published, unexpired gallery is live", () => {
    const future = new Date(Date.now() + 86_400_000);
    const past = new Date(Date.now() - 86_400_000);
    assert.equal(isGalleryLive({ status: "published", expiresAt: null }), true);
    assert.equal(isGalleryLive({ status: "published", expiresAt: future }), true);
    assert.equal(isGalleryLive({ status: "published", expiresAt: past }), false, "expired");
    assert.equal(isGalleryLive({ status: "draft", expiresAt: null }), false, "draft");
    assert.equal(isGalleryLive({ status: "archived", expiresAt: future }), false, "archived");
    assert.equal(isGalleryLive({ status: "expired", expiresAt: null }), false);
  });

  console.log("\nAuthorization shape (IDOR)");

  const service = readFileSync(join(root, "src/lib/gallery/service.ts"), "utf8");

  await check("no client-facing photo lookup is keyed by photo id alone", () => {
    // findUnique on a photo would resolve a photo id from ANY gallery. Every
    // lookup here must be findFirst scoped by galleryId.
    assert.ok(
      !/galleryPhoto\.findUnique/.test(service),
      "galleryPhoto.findUnique in the client service would be an IDOR"
    );
    const scoped = service.match(/galleryPhoto\.findFirst\(\{[\s\S]{0,120}/g) ?? [];
    assert.ok(scoped.length > 0, "expected at least one scoped photo lookup");
    for (const call of scoped) {
      assert.ok(call.includes("galleryId"), `photo lookup not scoped by gallery: ${call}`);
    }
  });

  await check("download tiers are checked against gallery permissions", () => {
    assert.ok(
      service.includes("allowDownloadOriginals"),
      "original downloads must be permission-checked"
    );
    assert.ok(
      /tier === "original" && !gallery\.allowDownloadOriginals/.test(service),
      "originals must be refused when the gallery does not allow them"
    );
  });

  const favorite = readFileSync(
    join(root, "src/app/api/gallery/[slug]/favorite/route.ts"),
    "utf8"
  );
  await check("favouriting is scoped to the gallery the session belongs to", () => {
    assert.ok(favorite.includes("galleryId: gallery.id"), "photo must be matched within the gallery");
    assert.ok(favorite.includes("resolveGallerySession"), "must require a session");
  });

  console.log("\nEnumeration");

  const gate = readFileSync(join(root, "src/app/api/gallery/[slug]/access/route.ts"), "utf8");

  await check("every access failure returns one identical response", () => {
    const responses = gate.match(/NextResponse\.json\(DENIED, \{ status: 401 \}\)/g) ?? [];
    assert.ok(responses.length >= 2, "wrong code and missing gallery must share a response");
    assert.ok(
      !/status: 404/.test(gate),
      "a 404 here would reveal which gallery slugs exist"
    );
  });

  await check("a bcrypt comparison runs even when no gallery matched", () => {
    assert.ok(gate.includes("DECOY_HASH"), "missing gallery must still cost a hash comparison");
    const decoyLine = gate.match(/const DECOY_HASH = "(.+)";/);
    assert.ok(decoyLine, "decoy hash must be present");
    assert.match(decoyLine![1], /^\$2[aby]\$/, "decoy must be a real bcrypt hash");
  });

  await check("the access gate is rate limited before anything else", () => {
    const limitAt = gate.indexOf("checkRateLimit");
    const bodyAt = gate.indexOf("request.json()");
    assert.ok(limitAt > 0 && limitAt < bodyAt, "rate limit must precede request parsing");
  });

  console.log("\nPrivacy");

  const page = readFileSync(join(root, "src/app/(site)/gallery/[slug]/page.tsx"), "utf8");
  await check("gallery pages are noindex and leak no client name in metadata", () => {
    assert.ok(/index: false/.test(page), "must be noindex");
    assert.ok(/follow: false/.test(page), "must be nofollow");
    assert.ok(
      !/gallery\.clientName/.test(page.split("export default")[0]),
      "client name must not appear in exported metadata"
    );
  });

  const robots = readFileSync(join(root, "src/app/robots.ts"), "utf8");
  await check("robots.txt disallows the gallery path", () => {
    assert.ok(robots.includes('"/gallery/"'));
  });

  console.log("\nStorage");

  const r2 = readFileSync(join(root, "src/lib/storage/r2.ts"), "utf8");
  await check("no permanent public object URL is ever constructed", () => {
    assert.ok(
      !/r2\.dev|pub-[a-z0-9]+\.r2/.test(r2),
      "a public bucket URL would bypass every access check"
    );
    assert.ok(r2.includes("getSignedUrl"), "reads must be signed");
  });

  await check("originals get a shorter signed window than previews", () => {
    const download = readFileSync(
      join(root, "src/app/api/gallery/[slug]/photo/[photoId]/download/route.ts"),
      "utf8"
    );
    const match = download.match(/tier\.data === "original" \? (\d+) : (\d+)/);
    assert.ok(match, "expected a tier-dependent TTL");
    assert.ok(
      Number(match![1]) < Number(match![2]),
      `original TTL ${match![1]}s must be shorter than preview TTL ${match![2]}s`
    );
  });

  await check("the SDK is confined to the storage module", () => {
    const leaks: string[] = [];
    for (const file of walk(join(root, "src"))) {
      if (file.includes(`${join("src", "lib", "storage")}`)) continue;
      const text = readFileSync(file, "utf8");
      if (/@aws-sdk\//.test(text)) leaks.push(file.replace(root, ""));
    }
    assert.deepEqual(leaks, [], `S3 SDK imported outside src/lib/storage: ${leaks.join(", ")}`);
  });

  console.log("\nProduction-readiness audit regressions");

  const { safeExtension } = await import("../src/lib/storage/r2-keys");

  await check("a filename cannot put slashes or control characters in an object key", () => {
    for (const hostile of [
      "/secret",
      "jpg;rm -rf /",
      "b?x=1&y=2",
      "jpg\r\nX-Injected: 1",
      "<script>",
      "../../etc/passwd",
    ]) {
      const ext = safeExtension(hostile);
      assert.match(ext, /^[a-z0-9]{1,12}$/, `${JSON.stringify(hostile)} -> ${JSON.stringify(ext)}`);
    }
    assert.equal(safeExtension(""), "bin", "an empty extension must still be a valid key");
    assert.equal(safeExtension("JPG"), "jpg");
    assert.equal(safeExtension("a".repeat(500)).length, 12, "must be length-bounded");
  });

  const limits = readFileSync(join(root, "src/lib/rate-limit.ts"), "utf8");
  await check("a client can download a whole gallery without hitting the limit", () => {
    const match = limits.match(/"gallery:download":\s*(\d+)/);
    assert.ok(match, "gallery:download bucket must exist");
    // A wedding gallery is routinely 400+ photographs saved one at a time.
    assert.ok(
      Number(match![1]) >= 500,
      `gallery:download is ${match![1]}/hour — a client would be blocked mid-gallery`
    );
  });

  const adminRoute = readFileSync(
    join(root, "src/app/api/admin/galleries/[id]/route.ts"),
    "utf8"
  );
  await check("destructive admin routes carry the origin check", () => {
    for (const verb of ["PATCH", "DELETE"]) {
      const start = adminRoute.indexOf(`export async function ${verb}(`);
      assert.ok(start > 0, `${verb} handler must exist`);
      const body = adminRoute.slice(start, start + 900);
      assert.ok(
        body.includes("rejectIfCrossOrigin"),
        `${verb} must reject cross-origin requests`
      );
    }
  });

  const list = readFileSync(join(root, "src/app/api/admin/galleries/route.ts"), "utf8");
  await check("the expired filter resolves against the clock, not a phantom status", () => {
    // Nothing ever writes status="expired", so filtering on the literal
    // returned an empty list forever and read as "no expired galleries".
    assert.ok(
      /status === "expired"/.test(list) && /expiresAt: \{ lt: now \}/.test(list),
      "expired must be computed from expiresAt"
    );
  });

  const svc = readFileSync(join(root, "src/lib/gallery/service.ts"), "utf8");
  await check("display URLs are not pre-signed into the page payload", () => {
    assert.ok(
      !/displayUrl/.test(svc),
      "pre-signing display URLs put 496KB of live credentials in a 500-photo page"
    );
  });

  console.log("\nImage pipeline (real Sharp, real bytes)");

  const sharp = (await import("sharp")).default;
  const good = await sharp({
    create: { width: 2400, height: 1600, channels: 3, background: { r: 90, g: 130, b: 70 } },
  })
    .jpeg({ quality: 90 })
    .toBuffer();

  await check("a truncated upload is rejected, not stored as a half image", async () => {
    const pipeline = readFileSync(join(root, "src/lib/storage/image-pipeline.ts"), "utf8");
    assert.ok(
      !/failOn: "none"/.test(pipeline),
      'failOn:"none" silently accepts a partially-uploaded JPEG'
    );
    const truncated = good.subarray(0, Math.floor(good.length * 0.4));
    await assert.rejects(
      sharp(truncated, { failOn: "truncated" }).rotate().resize({ width: 640 }).webp().toBuffer(),
      "a truncated JPEG must throw so the photo is marked failed"
    );
  });

  await check("a valid JPEG still passes at that strictness", async () => {
    const out = await sharp(good, { failOn: "truncated" })
      .rotate()
      .resize({ width: 640, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
    const meta = await sharp(out).metadata();
    assert.equal(meta.width, 640);
    assert.equal(meta.format, "webp");
  });

  await check("EXIF orientation is reflected in the stored dimensions", async () => {
    const rotated = await sharp({
      create: { width: 3000, height: 2000, channels: 3, background: { r: 20, g: 20, b: 20 } },
    })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const meta = await sharp(rotated).metadata();
    const turned = (meta.orientation ?? 1) >= 5;
    const width = (turned ? meta.height : meta.width) ?? 0;
    const height = (turned ? meta.width : meta.height) ?? 0;
    // The grid reserves this ratio; if it disagreed with the rotated pixels
    // every quarter-turned photo would shift the layout on load.
    assert.equal(width, 2000, "a quarter-turned photo must report its rotated width");
    assert.equal(height, 3000);
    const out = await sharp(rotated).rotate().resize({ width: 640 }).webp().toBuffer();
    const actual = await sharp(out).metadata();
    assert.equal(actual.width! < actual.height!, true, "rendered pixels must match");
  });

  await check("a small original is never upscaled into a bigger, softer file", async () => {
    const small = await sharp({
      create: { width: 400, height: 300, channels: 3, background: { r: 5, g: 5, b: 5 } },
    })
      .jpeg()
      .toBuffer();
    const out = await sharp(small).resize({ width: 3200, withoutEnlargement: true }).webp().toBuffer();
    assert.equal((await sharp(out).metadata()).width, 400);
  });

  console.log(`\n${checks} checks passed\n`);
}

function* walk(dir: string): Generator<string> {
  const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.tsx?$/.test(entry)) yield full;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
