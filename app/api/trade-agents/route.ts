import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { ensureSchema, getSql, isDatabaseConfigured } from "@/lib/db";
import { slugify } from "@/lib/slugs";

export const runtime = "nodejs";

type TradeAgentPayload = {
  name?: string;
  ownerLabel?: string;
  strategyClass?: string;
};

function cleanInput(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

async function createUniqueSlug(name: string) {
  const sql = getSql();
  const baseSlug = slugify(name);

  for (let index = 0; index < 50; index += 1) {
    const slug = index === 0 ? baseSlug : `${baseSlug}-${index + 1}`;
    const rows = await sql<{ exists: boolean }[]>`
      select exists (
        select 1 from agent_drafts where slug = ${slug}
      ) as "exists"
    `;

    if (!rows[0]?.exists) {
      return slug;
    }
  }

  return `${baseSlug}-${randomUUID().slice(0, 8)}`;
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Log in with wallet before creating a trade agent." },
      { status: 401 }
    );
  }

  await ensureSchema();

  const body = (await request.json().catch(() => null)) as
    | TradeAgentPayload
    | null;
  const name = cleanInput(body?.name, 80);
  const ownerLabel = cleanInput(body?.ownerLabel, 120);
  const strategyClass = cleanInput(body?.strategyClass, 120);

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Trade agent name is required." },
      { status: 400 }
    );
  }

  const sql = getSql();
  const slug = await createUniqueSlug(name);
  const id = randomUUID();
  const rows = await sql<
    {
      id: string;
      name: string;
      slug: string;
      status: string;
    }[]
  >`
    insert into agent_drafts (
      id,
      user_id,
      name,
      slug,
      owner_label,
      strategy_class,
      status
    )
    values (
      ${id},
      ${user.id},
      ${name},
      ${slug},
      ${ownerLabel || null},
      ${strategyClass || null},
      'created'
    )
    returning id, name, slug, status
  `;

  const agent = rows[0];

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      status: agent.status,
      url: `/agents/${agent.slug}`
    }
  });
}
