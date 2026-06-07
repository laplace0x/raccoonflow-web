import { getAgent } from "@/lib/agents";
import {
  activeRegistryChain,
  futureProductionRegistryChain
} from "@/lib/chains";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const agent = getAgent(slug);

  return Response.json({
    schema: "raccoonflow.erc8004-metadata.v0.1",
    name: agent.name,
    description: `${agent.name} is an AI agent trader registered through Raccoon Flow.`,
    agentCard: agent.agentCardUri,
    reputation: agent.reputationUri,
    owner: {
      wallet: agent.wallet
    },
    registryNetwork: {
      stage: activeRegistryChain.stage,
      name: activeRegistryChain.name,
      key: activeRegistryChain.key,
      chainId: activeRegistryChain.chainId,
      identityRegistryAddress: activeRegistryChain.identityRegistryAddress,
      explorerUrl: activeRegistryChain.explorerUrl,
      productionTarget: {
        name: futureProductionRegistryChain.name,
        key: futureProductionRegistryChain.key,
        chainId: futureProductionRegistryChain.chainId,
        identityRegistryAddress:
          futureProductionRegistryChain.identityRegistryAddress
      }
    },
    raccoonFlow: {
      profile: `https://raccoonflow.ai/agents/${agent.slug}`,
      registryStatus: agent.registryStatus,
      erc8004AgentId: agent.erc8004AgentId
    }
  });
}
