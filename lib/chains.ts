export type SupportedChain = {
  key: string;
  name: string;
  chainId: number;
  hexChainId: `0x${string}`;
  explorerUrl: string;
  rpcUrls: string[];
  identityRegistryAddress: `0x${string}`;
  stage: "testnet" | "mainnet";
};

export const supportedChains = {
  arbitrumSepolia: {
    key: "arbitrum-sepolia",
    name: "Arbitrum Sepolia",
    chainId: 421614,
    hexChainId: "0x66eee",
    explorerUrl: "https://sepolia.arbiscan.io",
    rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
    identityRegistryAddress: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    stage: "testnet"
  },
  arbitrumOne: {
    key: "arbitrum-one",
    name: "Arbitrum One",
    chainId: 42161,
    hexChainId: "0xa4b1",
    explorerUrl: "https://arbiscan.io",
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    identityRegistryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    stage: "mainnet"
  }
} satisfies Record<string, SupportedChain>;

export const activeRegistryChain = supportedChains.arbitrumOne;

export const testRegistryChain = supportedChains.arbitrumSepolia;
