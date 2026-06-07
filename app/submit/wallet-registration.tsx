"use client";

import { useEffect, useMemo, useState } from "react";
import { encodeFunctionData, getAddress } from "viem";
import { activeRegistryChain } from "@/lib/chains";

type EthereumProvider = {
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;
  on?(event: "accountsChanged", listener: (accounts: string[]) => void): void;
  removeListener?(
    event: "accountsChanged",
    listener: (accounts: string[]) => void
  ): void;
};

type AuthUser = {
  id: string;
  walletAddress: string;
};

type TradeAgent = {
  id: string;
  name: string;
  slug: string;
  status: string;
  reservedMetadataUrl: string;
  profileUrl: string;
  registry: {
    chain: typeof activeRegistryChain;
    registerFunction: string;
  };
};

type SubmittedAgent = {
  id: string;
  name: string;
  slug: string;
  status: string;
  txHash: string;
  explorerUrl: string;
};

type FinalizedAgent = {
  id: string;
  name: string;
  slug: string;
  status: string;
  erc8004AgentId: string;
  txHash: string;
};

type OwnedAgent = {
  id: string;
  name: string;
  slug: string;
  ownerLabel: string | null;
  strategyClass: string | null;
  status: string;
  registryChainId: number | null;
  registryAddress: string | null;
  txHash: string | null;
  erc8004AgentId: string | null;
  profileUrl: string;
  metadataUrl: string;
  explorerUrl: string | null;
  updatedAt: string;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const shortAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(date));

function getStatusLabel(status: string) {
  if (status === "registered") {
    return "Registered";
  }

  if (status === "registration_submitted") {
    return "Registration submitted";
  }

  if (status === "reserved") {
    return "Reserved";
  }

  return status.replaceAll("_", " ");
}

function getStatusTone(status: string) {
  if (status === "registered") {
    return "registered";
  }

  if (status === "registration_submitted") {
    return "submitted";
  }

  if (status === "reserved") {
    return "reserved";
  }

  return "neutral";
}

function getNextAction(agent: OwnedAgent) {
  if (agent.status === "registered") {
    return "Attach vault or ranking source";
  }

  if (agent.status === "registration_submitted") {
    return "Read minted agentId";
  }

  if (agent.status === "reserved") {
    return "Sign ERC-8004 registry tx";
  }

  return "Review agent profile";
}

const identityRegistryAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "agentURI", type: "string" }],
    outputs: [{ name: "agentId", type: "uint256" }]
  }
] as const;

const wait = (ms: number) =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T;

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : "Request failed.";
    throw new Error(message);
  }

  return body;
}

export function WalletRegistration() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [configured, setConfigured] = useState(true);
  const [walletAddress, setWalletAddress] = useState("");
  const [chainId, setChainId] = useState<number | null>(null);
  const [status, setStatus] = useState("Connect your wallet to start.");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [reservedAgent, setReservedAgent] = useState<TradeAgent | null>(null);
  const [submittedAgent, setSubmittedAgent] = useState<SubmittedAgent | null>(
    null
  );
  const [finalizedAgent, setFinalizedAgent] = useState<FinalizedAgent | null>(
    null
  );
  const [ownedAgents, setOwnedAgents] = useState<OwnedAgent[]>([]);

  const hasWallet = useMemo(
    () => typeof window !== "undefined" && Boolean(window.ethereum),
    []
  );

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const response = await fetch("/api/auth/me", {
        cache: "no-store"
      });
      const data = await readJson<{
        configured: boolean;
        user: AuthUser | null;
      }>(response);

      if (!mounted) {
        return;
      }

      setConfigured(data.configured);
      setUser(data.user);
      if (data.user) {
        setWalletAddress(data.user.walletAddress);
        setStatus("Logged in. You can create a trade agent next.");
        await loadOwnedAgents();
      } else if (!data.configured) {
        setStatus("Database is not configured for this deployment yet.");
      }
    }

    loadSession().catch((sessionError) => {
      if (mounted) {
        setError(
          sessionError instanceof Error
            ? sessionError.message
            : "Could not read session."
        );
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!window.ethereum?.on) {
      return;
    }

    const handleAccountsChanged = (accounts: string[]) => {
      const nextAddress = accounts[0] ? getAddress(accounts[0]) : "";

      setWalletAddress(nextAddress);
      setChainId(null);

      if (!nextAddress) {
        setUser(null);
        setStatus("Wallet disconnected. Connect again to log in.");
        return;
      }

      if (user && nextAddress !== user.walletAddress) {
        setUser(null);
        setStatus("Wallet changed. Log in again with the active wallet.");
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum?.removeListener?.(
        "accountsChanged",
        handleAccountsChanged
      );
    };
  }, [user]);

  async function connectAndSign() {
    setError("");

    if (!window.ethereum) {
      setError("No browser wallet detected. Install MetaMask, Rabby, or OKX Wallet.");
      return;
    }

    setIsBusy(true);

    try {
      setStatus("Requesting wallet connection...");

      const accounts = await window.ethereum.request<string[]>({
        method: "eth_requestAccounts"
      });
      const address = getAddress(accounts[0]);
      const chainIdHex = await window.ethereum.request<string>({
        method: "eth_chainId"
      });
      const activeChainId = Number.parseInt(chainIdHex, 16);

      setWalletAddress(address);
      setChainId(activeChainId);
      setStatus("Preparing Raccoon Flow sign-in message...");

      const nonceResponse = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ address })
      });
      const nonceData = await readJson<{
        nonce: string;
        message: string;
      }>(nonceResponse);

      setStatus("Waiting for wallet signature...");

      const signature = await window.ethereum.request<`0x${string}`>({
        method: "personal_sign",
        params: [nonceData.message, address]
      });

      setStatus("Verifying signature...");

      const verifyResponse = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          address,
          nonce: nonceData.nonce,
          signature,
          chainId: activeChainId
        })
      });
      const verifyData = await readJson<{ user: AuthUser }>(verifyResponse);

      setUser(verifyData.user);
      setStatus("Logged in. You can create a trade agent next.");
      setReservedAgent(null);
      setSubmittedAgent(null);
      setFinalizedAgent(null);
      await loadOwnedAgents();
    } catch (signError) {
      setError(
        signError instanceof Error ? signError.message : "Wallet sign-in failed."
      );
      setStatus("Connect your wallet to start.");
    } finally {
      setIsBusy(false);
    }
  }

  async function logout() {
    setIsBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST"
      });
      await readJson<{ ok: boolean }>(response);
      setUser(null);
      setWalletAddress("");
      setChainId(null);
      setReservedAgent(null);
      setSubmittedAgent(null);
      setFinalizedAgent(null);
      setOwnedAgents([]);
      setStatus("Logged out. Connect your wallet to start again.");
    } catch (logoutError) {
      setError(
        logoutError instanceof Error ? logoutError.message : "Log out failed."
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function loadOwnedAgents() {
    const response = await fetch("/api/trade-agents", {
      cache: "no-store"
    });

    if (response.status === 401) {
      setOwnedAgents([]);
      return;
    }

    const data = await readJson<{
      configured: boolean;
      agents: OwnedAgent[];
    }>(response);

    setOwnedAgents(data.agents);
  }

  async function ensureRegistryChain() {
    if (!window.ethereum) {
      throw new Error("No browser wallet detected.");
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: activeRegistryChain.hexChainId }]
      });
    } catch (switchError) {
      const errorCode =
        typeof switchError === "object" &&
        switchError &&
        "code" in switchError
          ? Number(switchError.code)
          : 0;

      if (errorCode !== 4902) {
        throw switchError;
      }

      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: activeRegistryChain.hexChainId,
            chainName: activeRegistryChain.name,
            nativeCurrency: {
              name: "Ethereum",
              symbol: "ETH",
              decimals: 18
            },
            rpcUrls: activeRegistryChain.rpcUrls,
            blockExplorerUrls: [activeRegistryChain.explorerUrl]
          }
        ]
      });
    }

    setChainId(activeRegistryChain.chainId);
  }

  async function finalizeRegistryRegistration(agentId: string, attempts = 12) {
    setError("");

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      setStatus(
        `Checking ERC-8004 registration confirmation (${attempt}/${attempts})...`
      );

      const response = await fetch(`/api/trade-agents/${agentId}/finalize`, {
        method: "POST"
      });

      if (response.status !== 202) {
        const data = await readJson<{ agent: FinalizedAgent }>(response);
        setFinalizedAgent(data.agent);
        await loadOwnedAgents();
        setStatus(`ERC-8004 agent #${data.agent.erc8004AgentId} registered.`);
        return;
      }

      if (attempt < attempts) {
        await wait(3000);
      }
    }

    setStatus(
      "Registry transaction submitted. Confirmation is still pending; check again soon."
    );
  }

  async function retryFinalizeRegistration() {
    if (!submittedAgent) {
      return;
    }

    setIsBusy(true);

    try {
      await finalizeRegistryRegistration(submittedAgent.id, 8);
    } catch (finalizeError) {
      setError(
        finalizeError instanceof Error
          ? finalizeError.message
          : "Could not finalize registration."
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function finalizeOwnedAgent(agent: OwnedAgent) {
    setIsBusy(true);
    setError("");

    try {
      await finalizeRegistryRegistration(agent.id, 8);
    } catch (finalizeError) {
      setError(
        finalizeError instanceof Error
          ? finalizeError.message
          : "Could not finalize registration."
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function submitRegistryTransaction(agent: TradeAgent) {
    if (!window.ethereum) {
      throw new Error("No browser wallet detected.");
    }

    if (!walletAddress) {
      throw new Error("Wallet address is not available.");
    }

    setStatus(`Switching wallet to ${activeRegistryChain.name}...`);
    await ensureRegistryChain();

    setStatus("Waiting for ERC-8004 registry transaction signature...");

    const txHash = await window.ethereum.request<`0x${string}`>({
      method: "eth_sendTransaction",
      params: [
        {
          from: walletAddress,
          to: activeRegistryChain.identityRegistryAddress,
          data: encodeFunctionData({
            abi: identityRegistryAbi,
            functionName: "register",
            args: [agent.reservedMetadataUrl]
          })
        }
      ]
    });

    setStatus("Recording submitted registry transaction...");

    const response = await fetch(`/api/trade-agents/${agent.id}/registry-tx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ txHash })
    });
    const data = await readJson<{ agent: SubmittedAgent }>(response);

    setSubmittedAgent(data.agent);
    await loadOwnedAgents();
    setStatus("ERC-8004 registration transaction submitted.");
    await finalizeRegistryRegistration(data.agent.id);
  }

  async function registerOwnedAgent(agent: OwnedAgent) {
    setIsBusy(true);
    setError("");
    setReservedAgent(null);
    setSubmittedAgent(null);
    setFinalizedAgent(null);

    try {
      await submitRegistryTransaction({
        id: agent.id,
        name: agent.name,
        slug: agent.slug,
        status: agent.status,
        reservedMetadataUrl: agent.metadataUrl,
        profileUrl: agent.profileUrl,
        registry: {
          chain: activeRegistryChain,
          registerFunction: "register(string agentURI)"
        }
      });
    } catch (agentError) {
      setError(
        agentError instanceof Error
          ? agentError.message
          : "Could not submit ERC-8004 registry transaction."
      );
      setStatus("Resources are reserved, but registry registration did not complete.");
    } finally {
      setIsBusy(false);
    }
  }

  async function createTradeAgent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError("");
    setReservedAgent(null);
    setSubmittedAgent(null);
    setFinalizedAgent(null);
    setIsBusy(true);

    const formData = new FormData(form);
    const name = String(formData.get("agentName") ?? "");
    const ownerLabel = String(formData.get("ownerName") ?? "");
    const strategyClass = String(formData.get("strategyClass") ?? "");
    let reservationCompleted = false;

    try {
      setStatus("Reserving trade agent resources...");

      const response = await fetch("/api/trade-agents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          ownerLabel,
          strategyClass
        })
      });
      const data = await readJson<{ agent: TradeAgent }>(response);

      reservationCompleted = true;
      setReservedAgent(data.agent);
      await loadOwnedAgents();
      form.reset();
      await submitRegistryTransaction(data.agent);
    } catch (agentError) {
      setError(
        agentError instanceof Error
          ? agentError.message
          : "Could not reserve or register trade agent."
      );
      setStatus(
        reservationCompleted
          ? "Resources are reserved, but registry registration did not complete."
          : "Logged in. You can create a trade agent next."
      );
    } finally {
      setIsBusy(false);
    }
  }

  const isLoggedIn = Boolean(user);
  const registeredAgents = ownedAgents.filter(
    (agent) => agent.status === "registered"
  ).length;
  const pendingAgents = ownedAgents.filter(
    (agent) => agent.status === "registration_submitted"
  ).length;
  const reservedAgents = ownedAgents.filter(
    (agent) => agent.status === "reserved"
  ).length;

  return (
    <div className="panel registration-form wallet-panel">
      <div className="wallet-state">
        <span>{isLoggedIn ? "Logged in as" : "Owner identity"}</span>
        <strong>{walletAddress ? shortAddress(walletAddress) : "Not connected"}</strong>
        {chainId ? <em>Chain {chainId}</em> : null}
      </div>

      <div className="status-box">{status}</div>

      {!configured ? (
        <div className="warning-box">
          Add <code>DATABASE_URL</code> in Vercel before enabling wallet
          registration in production.
        </div>
      ) : null}

      {!hasWallet ? (
        <div className="warning-box">
          Browser wallet not detected in this tab.
        </div>
      ) : null}

      {error ? <div className="error-box">{error}</div> : null}

      {isLoggedIn ? (
        <>
          <section className="owner-agents" aria-label="Your trade agents">
            <div className="owner-agents-head">
              <div>
                <strong>Your trade agents</strong>
                <span>
                  Owner wallet and agent wallet are the same by default in ERC-8004.
                </span>
              </div>
              <button
                className="text-button"
                type="button"
                onClick={loadOwnedAgents}
                disabled={isBusy}
              >
                Refresh
              </button>
            </div>
            <div className="agent-summary" aria-label="Agent portfolio summary">
              <div>
                <span>Total agents</span>
                <strong>{ownedAgents.length}</strong>
              </div>
              <div>
                <span>Registered</span>
                <strong>{registeredAgents}</strong>
              </div>
              <div>
                <span>Pending</span>
                <strong>{pendingAgents}</strong>
              </div>
              <div>
                <span>Network</span>
                <strong>{activeRegistryChain.name}</strong>
              </div>
            </div>
            {ownedAgents.length ? (
              <div className="agent-card-list">
                {ownedAgents.map((agent) => (
                  <article className="agent-card" key={agent.id}>
                    <div className="agent-card-main">
                      <div className="agent-title-line">
                        <h3>{agent.name}</h3>
                        <span className={`status-pill ${getStatusTone(agent.status)}`}>
                          {getStatusLabel(agent.status)}
                        </span>
                      </div>
                      <a className="agent-slug" href={agent.profileUrl}>
                        raccoonflow.ai/agents/{agent.slug}
                      </a>
                      <div className="agent-field-grid">
                        <div>
                          <span>Strategy</span>
                          <strong>{agent.strategyClass || "Unclassified strategy"}</strong>
                        </div>
                        <div>
                          <span>Owner</span>
                          <strong>
                            {agent.ownerLabel ||
                              (walletAddress ? shortAddress(walletAddress) : "Owner wallet")}
                          </strong>
                        </div>
                      </div>
                    </div>
                    <div className="agent-field-grid agent-registry-grid">
                      <div>
                        <span>ERC-8004</span>
                        <strong>
                          {agent.erc8004AgentId
                            ? `#${agent.erc8004AgentId}`
                            : "Pending"}
                        </strong>
                      </div>
                      <div>
                        <span>Agent wallet</span>
                        <strong>Same as owner</strong>
                      </div>
                      <div>
                        <span>Agent URI</span>
                        <strong>/agents/{agent.slug}/erc8004.json</strong>
                      </div>
                      <div>
                        <span>Updated</span>
                        <strong>{formatDate(agent.updatedAt)}</strong>
                      </div>
                    </div>
                    <div className="agent-next-action">
                      <div>
                        <span>Next action</span>
                        <strong>{getNextAction(agent)}</strong>
                      </div>
                      <div className="agent-links">
                        <a href={agent.profileUrl}>Profile</a>
                        <a href={agent.metadataUrl}>Metadata</a>
                        {agent.status === "reserved" ? (
                          <button
                            type="button"
                            onClick={() => registerOwnedAgent(agent)}
                            disabled={isBusy}
                          >
                            Register
                          </button>
                        ) : null}
                        {agent.status === "registration_submitted" ? (
                          <button
                            type="button"
                            onClick={() => finalizeOwnedAgent(agent)}
                            disabled={isBusy}
                          >
                            Finalize
                          </button>
                        ) : null}
                        {agent.explorerUrl ? (
                          <a href={agent.explorerUrl}>Tx</a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty-state">No trade agents under this wallet yet.</p>
            )}
          </section>
          {reservedAgents ? (
            <div className="warning-box">
              {reservedAgents} reserved agent{reservedAgents === 1 ? "" : "s"} still
              need an ERC-8004 registry transaction.
            </div>
          ) : null}
          <form className="trade-agent-form" onSubmit={createTradeAgent}>
            <div className="field">
              <label htmlFor="agentName">Agent name</label>
              <input
                id="agentName"
                name="agentName"
                placeholder="Alpha Router"
                required
                minLength={2}
                maxLength={80}
              />
            </div>
            <div className="field">
              <label htmlFor="ownerName">Owner or provider</label>
              <input
                id="ownerName"
                name="ownerName"
                placeholder="Example Provider"
                maxLength={120}
              />
            </div>
            <div className="field">
              <label htmlFor="strategyClass">Strategy class</label>
              <input
                id="strategyClass"
                name="strategyClass"
                placeholder="Trend following"
                maxLength={120}
              />
            </div>
            <button className="button secondary" type="submit" disabled={isBusy}>
              {isBusy ? "Reserving..." : "Reserve trade agent"}
            </button>
          </form>
          {finalizedAgent ? (
            <div className="success-box">
              <strong>{finalizedAgent.name}</strong>
              <span>ERC-8004 agentId: </span>
              <a
                href={`${activeRegistryChain.explorerUrl}/tx/${finalizedAgent.txHash}`}
              >
                #{finalizedAgent.erc8004AgentId}
              </a>
              <p>
                Registration finalized on {activeRegistryChain.name}. This
                reserved resource is now bound to the on-chain agent identity.
              </p>
            </div>
          ) : submittedAgent ? (
            <div className="success-box">
              <strong>{submittedAgent.name}</strong>
              <span>Registry transaction: </span>
              <a href={submittedAgent.explorerUrl}>{submittedAgent.txHash}</a>
              <p>
                Transaction submitted on {activeRegistryChain.name}. Waiting
                for confirmation and minted ERC-8004 agentId.
              </p>
              <button
                className="button secondary compact-button"
                type="button"
                onClick={retryFinalizeRegistration}
                disabled={isBusy}
              >
                {isBusy ? "Checking..." : "Check finalization"}
              </button>
            </div>
          ) : reservedAgent ? (
            <div className="success-box">
              <strong>{reservedAgent.name}</strong>
              <span>Reserved metadata: </span>
              <a href={reservedAgent.reservedMetadataUrl}>
                {reservedAgent.reservedMetadataUrl}
              </a>
              <p>
                Wallet registration did not complete. Retry the ERC-8004
                transaction or release this reservation.
              </p>
            </div>
          ) : null}
          <button
            className="button danger"
            type="button"
            onClick={logout}
            disabled={isBusy}
          >
            {isBusy ? "Logging out..." : "Log out"}
          </button>
        </>
      ) : (
        <button
          className="button"
          type="button"
          onClick={connectAndSign}
          disabled={isBusy || !configured}
        >
          {isBusy ? "Working..." : "Connect wallet and log in"}
        </button>
      )}
    </div>
  );
}
