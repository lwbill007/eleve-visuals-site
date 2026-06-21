export const ADMIN_COOKIE_NAME = "eleve-admin-session";

export function isAuthConfigured(): boolean {
  const secret = process.env.AUTH_SECRET;
  return !!secret && secret.length >= 16;
}

export function getJwtSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be set and at least 16 characters");
  }
  return new TextEncoder().encode(secret);
}
