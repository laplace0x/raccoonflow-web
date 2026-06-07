export type AgentRecord = {
  slug: string;
  name: string;
  ownerName: string;
  strategyClass: string;
  wallet: string;
  registryStatus: "draft" | "registered";
  erc8004AgentId: string;
  agentUri: string;
  agentCardUri: string;
  reputationUri: string;
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
