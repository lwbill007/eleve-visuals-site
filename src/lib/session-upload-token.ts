import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { getJwtSecretKey } from "@/lib/auth-secret";

const ISSUER = "eleve-session-upload";
const AUDIENCE = "session-application";

export async function createSessionUploadToken(volumeId: string): Promise<string> {
  return new SignJWT({ volumeId, purpose: "session-portfolio" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(getJwtSecretKey());
}

export async function verifySessionUploadToken(
  token: string,
  expectedVolumeId: string
): Promise<boolean> {
  const volumeId = await getSessionUploadTokenVolumeId(token);
  return volumeId === expectedVolumeId;
}

export async function getSessionUploadTokenVolumeId(
  token: string
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload.purpose === "session-portfolio" &&
      typeof payload.volumeId === "string"
      ? payload.volumeId
      : null;
  } catch {
    return null;
  }
}

export function hashSessionUploadToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
