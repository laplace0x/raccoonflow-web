import { activeRegistryChain } from "./chains";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ZERO_TOPIC =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

type RpcLog = {
  address: string;
  topics: `0x${string}`[];
};

type RpcReceipt = {
  status: "0x0" | "0x1";
  to: string | null;
  from: string;
  transactionHash: `0x${string}`;
  logs: RpcLog[];
};

type RpcResponse<T> = {
  result?: T;
  error?: {
    message?: string;
  };
};

export type FinalizedRegistryReceipt = {
  txHash: `0x${string}`;
  agentId: string;
  from: string;
};

export async function readFinalizedRegistryReceipt(
  txHash: `0x${string}`
): Promise<FinalizedRegistryReceipt | null> {
  const response = await fetch(activeRegistryChain.rpcUrls[0], {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionReceipt",
      params: [txHash]
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Could not read registry transaction receipt.");
  }

  const payload = (await response.json()) as RpcResponse<RpcReceipt | null>;

  if (payload.error?.message) {
    throw new Error(payload.error.message);
  }

  if (!payload.result) {
    return null;
  }

  const receipt = payload.result;
  const registryAddress = activeRegistryChain.identityRegistryAddress.toLowerCase();

  if (receipt.status !== "0x1") {
    throw new Error("Registry transaction failed on-chain.");
  }

  if (receipt.to?.toLowerCase() !== registryAddress) {
    throw new Error("Transaction was not sent to the active ERC-8004 registry.");
  }

  const mintLog = receipt.logs.find(
    (log) =>
      log.address.toLowerCase() === registryAddress &&
      log.topics[0] === TRANSFER_TOPIC &&
      log.topics[1] === ZERO_TOPIC &&
      Boolean(log.topics[3])
  );

  if (!mintLog?.topics[3]) {
    throw new Error("Registry transaction did not mint an ERC-8004 agent.");
  }

  return {
    txHash: receipt.transactionHash,
    agentId: BigInt(mintLog.topics[3]).toString(),
    from: receipt.from
  };
}
