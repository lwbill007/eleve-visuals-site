import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { getJwtSecretKey } from "@/lib/auth-secret";

const ISSUER = "eleve-booking-access";
const AUDIENCE = "booking-client";

export async function createBookingAccessToken(submissionId: string): Promise<string> {
  return new SignJWT({ submissionId, purpose: "booking-client-access" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getJwtSecretKey());
}

export async function verifyBookingAccessToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return payload.purpose === "booking-client-access" && typeof payload.submissionId === "string"
      ? payload.submissionId
      : null;
  } catch {
    return null;
  }
}
