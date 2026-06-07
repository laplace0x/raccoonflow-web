import { NextResponse } from "next/server";
import { getAddress } from "viem";
import { getCurrentUser } from "@/lib/auth";
import { ensureSchema, getSql, isDatabaseConfigured } from "@/lib/db";
import { readFinalizedRegistryReceipt } from "@/lib/registry";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Log in with wallet before finalizing registration." },
      { status: 401 }
    );
  }

  await ensureSchema();

  const { id } = await context.params;
  const sql = getSql();
  const rows = await sql<
    {
      id: string;
      name: string;
      slug: string;
      status: string;
      registry_tx_hash: `0x${string}` | null;
    }[]
  >`
    select id, name, slug, status, registry_tx_hash
    from agent_drafts
    where id = ${id}
      and user_id = ${user.id}
    limit 1
  `;

  const agent = rows[0];

  if (!agent?.registry_tx_hash) {
    return NextResponse.json(
      { error: "No submitted registry transaction found for this agent." },
      { status: 404 }
    );
  }

  const receipt = await readFinalizedRegistryReceipt(agent.registry_tx_hash);

  if (!receipt) {
    return NextResponse.json(
      { pending: true, agent: { id: agent.id, name: agent.name, slug: agent.slug } },
      { status: 202 }
    );
  }

  if (getAddress(receipt.from) !== user.walletAddress) {
    return NextResponse.json(
      { error: "Registry transaction sender does not match the logged-in wallet." },
      { status: 403 }
    );
  }

  const updatedRows = await sql<
    {
      id: string;
      name: string;
      slug: string;
      status: string;
      erc8004_agent_id: string;
      registry_tx_hash: string;
    }[]
  >`
    update agent_drafts
    set
      status = 'registered',
      erc8004_agent_id = ${receipt.agentId},
      updated_at = now()
    where id = ${agent.id}
      and user_id = ${user.id}
    returning id, name, slug, status, erc8004_agent_id, registry_tx_hash
  `;

  const finalized = updatedRows[0];

  return NextResponse.json({
    agent: {
      id: finalized.id,
      name: finalized.name,
      slug: finalized.slug,
      status: finalized.status,
      erc8004AgentId: finalized.erc8004_agent_id,
      txHash: finalized.registry_tx_hash
    }
  });
}
