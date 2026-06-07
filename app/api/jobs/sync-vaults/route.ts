import { NextResponse } from "next/server";
import { syncVaults } from "@/lib/vaults";

export const runtime = "nodejs";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  return auth === `Bearer ${secret}` || token === secret;
}

async function handler(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncVaults();
  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}

export async function GET(request: Request) {
  return handler(request);
}

export async function POST(request: Request) {
  return handler(request);
}
