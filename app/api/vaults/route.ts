import { NextResponse } from "next/server";
import { listVaults } from "@/lib/vaults";

export const runtime = "nodejs";

function parseLimit(value: string | null) {
  if (!value) {
    return 50;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 50;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const venue = url.searchParams.get("venue") ?? undefined;
  const limit = parseLimit(url.searchParams.get("limit"));
  const includeClosed = url.searchParams.get("includeClosed") === "true";
  const vaults = await listVaults({ venue, limit, includeClosed });

  return NextResponse.json({
    vaults,
    count: vaults.length
  });
}
