export type SupportedChain = {
  key: string;
  name: string;
  chainId: number;
  hexChainId: `0x${string}`;
  explorerUrl: string;
  stage: "testnet" | "mainnet";
};

export const supportedChains = {
  arbitrumSepolia: {
    key: "arbitrum-sepolia",
    name: "Arbitrum Sepolia",
    chainId: 421614,
    hexChainId: "0x66eee",
    explorerUrl: "https://sepolia.arbiscan.io",
    stage: "testnet"
  },
  arbitrumOne: {
    key: "arbitrum-one",
    name: "Arbitrum One",
    chainId: 42161,
    hexChainId: "0xa4b1",
    explorerUrl: "https://arbiscan.io",
    stage: "mainnet"
  }
} satisfies Record<string, SupportedChain>;

export const activeRegistryChain = supportedChains.arbitrumSepolia;

export const futureProductionRegistryChain = supportedChains.arbitrumOne;
