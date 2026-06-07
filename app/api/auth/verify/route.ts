import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isAddress, verifyMessage } from "viem";
import {
  createSession,
  normalizeAddress,
  setSessionCookie
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
    nonce?: string;
    signature?: `0x${string}`;
    chainId?: number;
  } | null;

  if (!body?.address || !isAddress(body.address) || !body.nonce || !body.signature) {
    return NextResponse.json(
      { error: "Address, nonce, and signature are required." },
      { status: 400 }
    );
  }

  await ensureSchema();

  const address = normalizeAddress(body.address);
  const sql = getSql();
  const nonceRows = await sql<
    {
      nonce: string;
      address: string;
      message: string;
    }[]
  >`
    select nonce, address, message
    from login_nonces
    where nonce = ${body.nonce}
      and address = ${address}
      and consumed_at is null
      and expires_at > now()
    limit 1
  `;

  const nonce = nonceRows[0];

  if (!nonce) {
    return NextResponse.json(
      { error: "The wallet challenge is expired or invalid." },
      { status: 401 }
    );
  }

  const valid = await verifyMessage({
    address,
    message: nonce.message,
    signature: body.signature
  });

  if (!valid) {
    return NextResponse.json(
      { error: "Wallet signature verification failed." },
      { status: 401 }
    );
  }

  const userRows = await sql<
    {
      id: string;
      primary_wallet_address: string;
    }[]
  >`
    insert into users (id, primary_wallet_address)
    values (${randomUUID()}, ${address})
    on conflict (primary_wallet_address)
    do update
    set updated_at = now()
    returning id, primary_wallet_address
  `;

  const user = userRows[0];

  if (!user) {
    return NextResponse.json(
      { error: "Wallet user could not be created." },
      { status: 500 }
    );
  }

  await sql`
    insert into wallets (address, user_id, chain_id)
    values (${address}, ${user.id}, ${body.chainId ?? null})
    on conflict (address)
    do update set
      user_id = excluded.user_id,
      chain_id = excluded.chain_id,
      last_signed_at = now()
  `;

  await sql`
    update login_nonces
    set consumed_at = now()
    where nonce = ${body.nonce}
  `;

  const session = await createSession(user.id);
  await setSessionCookie(session.token, session.expiresAt);

  return NextResponse.json({
    user: {
      id: user.id,
      walletAddress: normalizeAddress(user.primary_wallet_address)
    }
  });
}
