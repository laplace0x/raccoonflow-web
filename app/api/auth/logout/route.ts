import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSessionCookie, hashToken, SESSION_COOKIE } from "@/lib/auth";
import { ensureSchema, getSql, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  if (isDatabaseConfigured()) {
    await ensureSchema();

    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (token) {
      await getSql()`
        delete from sessions
        where token_hash = ${hashToken(token)}
      `;
    }
  }

  await clearSessionCookie();

  return NextResponse.json({ ok: true });
}
