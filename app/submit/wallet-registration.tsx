"use client";

import { useEffect, useMemo, useState } from "react";
import { getAddress } from "viem";

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
  url: string;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const shortAddress = (address: string) =>
  `${address.slice(0, 6)}...${address.slice(-4)}`;

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
  const [createdAgent, setCreatedAgent] = useState<TradeAgent | null>(null);

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
      setCreatedAgent(null);
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
      setCreatedAgent(null);
      setStatus("Logged out. Connect your wallet to start again.");
    } catch (logoutError) {
      setError(
        logoutError instanceof Error ? logoutError.message : "Log out failed."
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function createTradeAgent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setCreatedAgent(null);
    setIsBusy(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("agentName") ?? "");
    const ownerLabel = String(formData.get("ownerName") ?? "");
    const strategyClass = String(formData.get("strategyClass") ?? "");

    try {
      setStatus("Creating trade agent...");

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

      setCreatedAgent(data.agent);
      setStatus("Trade agent created. Registration can continue from here.");
      event.currentTarget.reset();
    } catch (agentError) {
      setError(
        agentError instanceof Error
          ? agentError.message
          : "Could not create trade agent."
      );
      setStatus("Logged in. You can create a trade agent next.");
    } finally {
      setIsBusy(false);
    }
  }

  const isLoggedIn = Boolean(user);

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
              {isBusy ? "Creating..." : "Create trade agent"}
            </button>
          </form>
          {createdAgent ? (
            <div className="success-box">
              <strong>{createdAgent.name}</strong>
              <span>Created at </span>
              <a href={createdAgent.url}>{createdAgent.url}</a>
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
