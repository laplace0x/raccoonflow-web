import { ensureSchema, getSql, isDatabaseConfigured } from "@/lib/db";

export type AgentRecord = {
  slug: string;
  name: string;
  ownerName: string;
  strategyClass: string;
  wallet: string;
  registryStatus: "draft" | "reserved" | "registration_submitted" | "registered";
  erc8004AgentId: string;
  agentUri: string;
  agentCardUri: string;
  reputationUri: string;
};

type AgentDraftRow = {
  name: string;
  slug: string;
  owner_label: string | null;
  strategy_class: string | null;
  status: AgentRecord["registryStatus"];
  erc8004_agent_id: string | null;
  primary_wallet_address: string;
};

export const demoAgents: AgentRecord[] = [
  {
    slug: "alpha-router",
    name: "Alpha Router",
    ownerName: "Example Provider",
    strategyClass: "Trend following",
    wallet: "0xUserWallet...",
    registryStatus: "draft",
    erc8004AgentId: "pending",
    agentUri: "https://raccoonflow.ai/agents/alpha-router/erc8004.json",
    agentCardUri: "https://raccoonflow.ai/agents/alpha-router/agent-card.json",
    reputationUri: "https://raccoonflow.ai/agents/alpha-router/reputation.json"
  }
];

export function getAgent(slug: string) {
  return demoAgents.find((agent) => agent.slug === slug) ?? demoAgents[0];
}

function shortWallet(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function toAgentRecord(row: AgentDraftRow, origin: string): AgentRecord {
  return {
    slug: row.slug,
    name: row.name,
    ownerName: row.owner_label || shortWallet(row.primary_wallet_address),
    strategyClass: row.strategy_class || "Unclassified strategy",
    wallet: row.primary_wallet_address,
    registryStatus: row.status,
    erc8004AgentId: row.erc8004_agent_id || "pending",
    agentUri: `${origin}/agents/${row.slug}/erc8004.json`,
    agentCardUri: `${origin}/agents/${row.slug}/agent-card.json`,
    reputationUri: `${origin}/agents/${row.slug}/reputation.json`
  };
}

export async function getPublicAgent(
  slug: string,
  origin = "https://raccoonflow.ai"
) {
  if (!isDatabaseConfigured()) {
    return getAgent(slug);
  }

  await ensureSchema();

  const rows = await getSql()<AgentDraftRow[]>`
    select
      agent_drafts.name,
      agent_drafts.slug,
      agent_drafts.owner_label,
      agent_drafts.strategy_class,
      agent_drafts.status,
      agent_drafts.erc8004_agent_id,
      users.primary_wallet_address
    from agent_drafts
    join users on users.id = agent_drafts.user_id
    where agent_drafts.slug = ${slug}
    limit 1
  `;

  return rows[0] ? toAgentRecord(rows[0], origin) : getAgent(slug);
}
