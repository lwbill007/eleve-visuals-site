/**
 * Key hygiene, split out of r2.ts so it is testable without `server-only`.
 * Same split as gallery/codes.ts vs gallery/access.ts.
 */

/**
 * An extension derived from a user-supplied filename is user-supplied data.
 *
 * It cannot escape the gallery prefix — S3 and R2 keys are opaque strings and
 * never resolve `..` — so `deletePrefix` still reclaims everything. But an
 * unsanitised extension put slashes, CRLF and query characters into object
 * keys, which is a needless operational hazard for zero benefit.
 */
export function safeExtension(ext: string): string {
  const clean = ext.replace(/^\.+/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return clean.slice(0, 12) || "bin";
}
