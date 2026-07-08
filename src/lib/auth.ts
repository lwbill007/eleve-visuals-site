import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { getJwtSecretKey, ADMIN_COOKIE_NAME } from "./auth-secret";

const COOKIE_NAME = ADMIN_COOKIE_NAME;
const SESSION_DURATION = 60 * 60 * 24 * 7; // 7 days

/** Role ladder for multi-user foundation. Single-password login still maps to owner. */
export const ADMIN_ROLES = ["owner", "admin", "operator", "editor", "viewer"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

const ROLE_RANK: Record<AdminRole, number> = {
  owner: 100,
  admin: 80,
  operator: 60,
  editor: 40,
  viewer: 20,
};

export interface AdminSession {
  role: AdminRole;
  email?: string;
  name?: string;
}

function normalizeRole(raw: unknown): AdminRole | null {
  if (typeof raw !== "string") return null;
  if (raw === "admin") return "owner"; // legacy JWT claim → owner
  if ((ADMIN_ROLES as readonly string[]).includes(raw)) return raw as AdminRole;
  return null;
}

export function roleAtLeast(session: AdminSession, minimum: AdminRole): boolean {
  return ROLE_RANK[session.role] >= ROLE_RANK[minimum];
}

export function roleIn(session: AdminSession, allowed: AdminRole[]): boolean {
  return allowed.includes(session.role);
}

export async function verifyPassword(password: string): Promise<boolean> {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  if (adminPassword.startsWith("$2")) {
    return bcrypt.compare(password, adminPassword);
  }

  return password === adminPassword;
}

export async function createSession(opts?: {
  role?: AdminRole;
  email?: string;
  name?: string;
}): Promise<string> {
  const role = opts?.role ?? "owner";
  const token = await new SignJWT({
    role,
    email: opts?.email ?? process.env.ADMIN_EMAIL ?? "owner@eleve",
    name: opts?.name ?? "Owner",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getJwtSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });

  return token;
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function getSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    const role = normalizeRole(payload.role);
    if (!role) return null;
    return {
      role,
      email: typeof payload.email === "string" ? payload.email : undefined,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

/** Require session role to be at least as privileged as the weakest allowed role. */
export async function requireRole(allowed: AdminRole[]) {
  const session = await requireAdmin();
  const minAllowed = Math.min(...allowed.map((r) => ROLE_RANK[r]));
  if (ROLE_RANK[session.role] < minAllowed) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function requireMinimumRole(minimum: AdminRole) {
  const session = await requireAdmin();
  if (!roleAtLeast(session, minimum)) {
    throw new Error("Forbidden");
  }
  return session;
}

export { COOKIE_NAME };
