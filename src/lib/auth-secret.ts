export const ADMIN_COOKIE_NAME = "eleve-admin-session";

const MIN_AUTH_SECRET_LENGTH = 32;
const MIN_ADMIN_PASSWORD_LENGTH = 8;

export function isAuthConfigured(): boolean {
  const secret = process.env.AUTH_SECRET;
  const password = process.env.ADMIN_PASSWORD;
  return (
    !!secret &&
    secret.length >= MIN_AUTH_SECRET_LENGTH &&
    !!password &&
    password.length >= MIN_ADMIN_PASSWORD_LENGTH
  );
}

export function getAuthConfigError(): string | null {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return "AUTH_SECRET is not set.";
  if (secret.length < MIN_AUTH_SECRET_LENGTH) {
    return `AUTH_SECRET must be at least ${MIN_AUTH_SECRET_LENGTH} characters.`;
  }
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return "ADMIN_PASSWORD is not set.";
  if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
    return `ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function getJwtSecretKey(): Uint8Array {
  const configError = getAuthConfigError();
  if (configError) {
    throw new Error(configError);
  }
  return new TextEncoder().encode(process.env.AUTH_SECRET!);
}
