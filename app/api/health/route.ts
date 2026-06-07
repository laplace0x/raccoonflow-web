import {
  activeRegistryChain,
  futureProductionRegistryChain
} from "@/lib/chains";

export function GET() {
  return Response.json({
    ok: true,
    service: "raccoonflow-web",
    phase: "wallet_and_erc8004_registry_v0.1",
    registryNetwork: {
      active: activeRegistryChain,
      productionTarget: futureProductionRegistryChain
    }
  });
}
