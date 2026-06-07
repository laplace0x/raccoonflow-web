import { NextResponse } from "next/server";
import { isHex } from "viem";
import { getCurrentUser } from "@/lib/auth";
import { activeRegistryChain } from "@/lib/chains";
import { ensureSchema, getSql, isDatabaseConfigured } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: "Log in with wallet before submitting registry transaction." },
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

  const { id } = await context.params;
  const rows = await getSql()<
    {
      id: string;
      name: string;
      slug: string;
      status: string;
      registry_tx_hash: string;
    }[]
  >`
    update agent_drafts
    set
      status = 'registration_submitted',
      registry_chain_id = ${activeRegistryChain.chainId},
      registry_address = ${activeRegistryChain.identityRegistryAddress},
      registry_tx_hash = ${body.txHash},
      updated_at = now()
    where id = ${id}
      and user_id = ${user.id}
      and status = 'reserved'
    returning id, name, slug, status, registry_tx_hash
  `;

  const agent = rows[0];

  if (!agent) {
    return NextResponse.json(
      { error: "Reserved trade agent was not found or is no longer pending." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: agent.name,
      slug: agent.slug,
      status: agent.status,
      txHash: agent.registry_tx_hash,
      explorerUrl: `${activeRegistryChain.explorerUrl}/tx/${agent.registry_tx_hash}`
    }
  });
}
