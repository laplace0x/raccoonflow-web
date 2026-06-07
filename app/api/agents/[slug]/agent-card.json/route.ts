import { getAgent } from "@/lib/agents";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const agent = getAgent(slug);

  return Response.json({
    schema: "raccoonflow.agent-card.v0.1",
    name: agent.name,
    slug: agent.slug,
    owner: {
      name: agent.ownerName,
      wallet: agent.wallet
    },
    strategyClass: agent.strategyClass,
    capabilities: ["ai-agent-trader", "erc8004-registration-ready"],
    endpoints: {
      erc8004: agent.agentUri,
      reputation: agent.reputationUri
    }
  });
}
