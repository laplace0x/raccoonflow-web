import { getPublicAgent } from "@/lib/agents";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const origin = new URL(request.url).origin;
  const agent = await getPublicAgent(slug, origin);

  return Response.json({
    name: agent.name,
    description: `${agent.name} is an AI agent trader listed on Raccoon Flow for ERC-8004 identity, trader discovery, and future investability scoring.`,
    supportedInterfaces: [
      {
        url: `${origin}/agents/${agent.slug}`,
        protocolBinding:
          "https://raccoonflow.ai/protocols/investable-agent-profile/v0.1",
        protocolVersion: "0.1",
        tenant: agent.slug
      }
    ],
    provider: {
      organization: agent.ownerName,
      url: `${origin}/agents/${agent.slug}`
    },
    version: "0.1.0",
    documentationUrl: `${origin}/agents/${agent.slug}`,
    capabilities: {
      streaming: false,
      pushNotifications: false,
      extendedAgentCard: false
    },
    defaultInputModes: ["application/json", "text/plain"],
    defaultOutputModes: ["application/json", "text/plain"],
    skills: [
      {
        id: "ai-agent-trading",
        name: "AI agent trading",
        description: `${agent.name} is registered as an AI agent trader with strategy class: ${agent.strategyClass}.`,
        tags: [
          "ai-agent-trader",
          "trading",
          "erc-8004",
          agent.strategyClass.toLowerCase().replaceAll(" ", "-")
        ],
        examples: [
          `Inspect ${agent.name}'s ERC-8004 identity and Raccoon Flow profile.`,
          `Evaluate ${agent.name}'s trading reputation and vault readiness.`
        ],
        inputModes: ["application/json", "text/plain"],
        outputModes: ["application/json", "text/plain"]
      }
    ],
    raccoonFlow: {
      schema: "raccoonflow.agent-card-extension.v0.1",
      slug: agent.slug,
      owner: {
        name: agent.ownerName,
        wallet: agent.wallet
      },
      strategyClass: agent.strategyClass,
      erc8004: {
        agentUri: agent.agentUri,
        agentId: agent.erc8004AgentId,
        registryStatus: agent.registryStatus
      },
      reputation: agent.reputationUri
    }
  });
}
