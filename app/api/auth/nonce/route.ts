import { NextResponse } from "next/server";
import { isAddress } from "viem";
import {
  createLoginMessage,
  createNonce,
  normalizeAddress
} from "@/lib/auth";
import { ensureSchema, getSql, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    address?: string;
  } | null;

  if (!body?.address || !isAddress(body.address)) {
    return NextResponse.json(
      { error: "A valid wallet address is required." },
      { status: 400 }
    );
  }

  await ensureSchema();

  const address = normalizeAddress(body.address);
  const nonce = createNonce();
  const issuedAt = new Date();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const url = new URL(request.url);
  const message = createLoginMessage({
    address,
    domain: url.host,
    nonce,
    issuedAt,
    expiresAt,
    uri: url.origin
  });
  const sql = getSql();

  await sql`
    insert into login_nonces (nonce, address, message, expires_at)
    values (${nonce}, ${address}, ${message}, ${expiresAt})
  `;

  return NextResponse.json({
    address,
    nonce,
    message,
    expiresAt: expiresAt.toISOString()
  });
}
