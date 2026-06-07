import { NextResponse } from "next/server";
import { isHex } from "viem";
import { getCurrentUser } from "@/lib/auth";
import { ensureSchema, getSql, isDatabaseConfigured } from "@/lib/db";
import { readFinalizedRegistryReceipt } from "@/lib/registry";

export const runtime = "nodejs";

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
      { error: "Log in with wallet before finalizing registration." },
      { status: 401 }
    );
  }

  const body = (await request.json().catch(() => null)) as {
    txHash?: string;
  } | null;

  if (!body?.txHash || !isHex(body.txHash) || body.txHash.length !== 66) {
    return NextResponse.json(
      { error: "A valid transaction hash is required." },
      { status: 400 }
    );
  }

  await ensureSchema();

  const receipt = await readFinalizedRegistryReceipt(body.txHash);

  if (!receipt) {
    return NextResponse.json({ pending: true }, { status: 202 });
  }

  const rows = await getSql()<
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
    where user_id = ${user.id}
      and registry_tx_hash = ${body.txHash}
    returning id, name, slug, status, erc8004_agent_id, registry_tx_hash
  `;

  const agent = rows[0];

  if (!agent) {
    return NextResponse.json(
      { error: "No reserved agent found for this transaction hash." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      status: agent.status,
      erc8004AgentId: agent.erc8004_agent_id,
      txHash: agent.registry_tx_hash
    }
  });
}
