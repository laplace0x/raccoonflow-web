import { cookies, headers } from "next/headers";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Address } from "viem";
import { getAddress } from "viem";
import { ensureSchema, getSql, isDatabaseConfigured } from "./db";

export const SESSION_COOKIE = "rf_session";
const SESSION_DAYS = 30;

export type AuthUser = {
  id: string;
  walletAddress: Address;
};

export function normalizeAddress(address: string) {
  return getAddress(address);
}

export function createNonce() {
  return randomBytes(16).toString("hex");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionExpiresAt() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
}

export function createLoginMessage(params: {
  address: Address;
  domain: string;
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
  uri: string;
}) {
  return [
    `${params.domain} wants you to sign in with your Ethereum account:`,
    params.address,
    "",
    "Sign in or register with Raccoon Flow.",
    "",
    `URI: ${params.uri}`,
    "Version: 1",
    `Nonce: ${params.nonce}`,
    `Issued At: ${params.issuedAt.toISOString()}`,
    `Expiration Time: ${params.expiresAt.toISOString()}`
  ].join("\n");
}

export async function createSession(userId: string) {
  await ensureSchema();

  const sql = getSql();
  const token = createSessionToken();
  const tokenHash = hashToken(token);
  const expiresAt = sessionExpiresAt();
  const headerStore = await headers();

  await sql`
    insert into sessions (
      id,
      user_id,
      token_hash,
      expires_at,
      user_agent,
      ip_address
    )
    values (
      ${randomUUID()},
      ${userId},
      ${tokenHash},
      ${expiresAt},
      ${headerStore.get("user-agent")},
      ${headerStore.get("x-forwarded-for")}
    )
  `;

  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isDatabaseConfigured()) {
    return null;
  }

  await ensureSchema();

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const sql = getSql();
  const tokenHash = hashToken(token);
  const rows = await sql<
    {
      id: string;
      primary_wallet_address: string;
    }[]
  >`
    select users.id, users.primary_wallet_address
    from sessions
    join users on users.id = sessions.user_id
    where sessions.token_hash = ${tokenHash}
      and sessions.expires_at > now()
    limit 1
  `;

  if (!rows[0]) {
    return null;
  }

  await sql`
    update sessions
    set last_seen_at = now()
    where token_hash = ${tokenHash}
  `;

  return {
    id: rows[0].id,
    walletAddress: normalizeAddress(rows[0].primary_wallet_address)
  };
}
