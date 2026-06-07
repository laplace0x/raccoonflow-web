import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { activeRegistryChain } from "@/lib/chains";
import { ensureSchema, getSql, isDatabaseConfigured } from "@/lib/db";
import { slugify } from "@/lib/slugs";

export const runtime = "nodejs";

type TradeAgentPayload = {
  name?: string;
  ownerLabel?: string;
  strategyClass?: string;
};

type AgentDraftRow = {
  id: string;
  name: string;
  slug: string;
  owner_label: string | null;
  strategy_class: string | null;
  status: string;
  registry_chain_id: number | null;
  registry_address: string | null;
  registry_tx_hash: string | null;
  erc8004_agent_id: string | null;
  created_at: Date;
  updated_at: Date;
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

function serializeAgent(row: AgentDraftRow, origin: string) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerLabel: row.owner_label,
    strategyClass: row.strategy_class,
    status: row.status,
    registryChainId: row.registry_chain_id,
    registryAddress: row.registry_address,
    txHash: row.registry_tx_hash,
    erc8004AgentId: row.erc8004_agent_id,
    profileUrl: `${origin}/agents/${row.slug}`,
    metadataUrl: `${origin}/agents/${row.slug}/erc8004.json`,
    explorerUrl: row.registry_tx_hash
      ? `${activeRegistryChain.explorerUrl}/tx/${row.registry_tx_hash}`
      : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { configured: false, agents: [] },
      { status: 503 }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ configured: true, agents: [] });
  }

  await ensureSchema();

  const rows = await getSql()<AgentDraftRow[]>`
    select
      id,
      name,
      slug,
      owner_label,
      strategy_class,
      status,
      registry_chain_id,
      registry_address,
      registry_tx_hash,
      erc8004_agent_id,
      created_at,
      updated_at
    from agent_drafts
    where user_id = ${user.id}
    order by updated_at desc
  `;
  const origin = new URL(request.url).origin;

  return NextResponse.json({
    configured: true,
    agents: rows.map((row) => serializeAgent(row, origin))
  });
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
      'reserved'
    )
    returning id, name, slug, status
  `;

  const agent = rows[0];
  const origin = new URL(request.url).origin;

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      status: agent.status,
      reservedMetadataUrl: `${origin}/agents/${agent.slug}/erc8004.json`,
      profileUrl: `${origin}/agents/${agent.slug}`,
      registry: {
        chain: activeRegistryChain,
        registerFunction: "register(string agentURI)"
      }
    }
  });
}
