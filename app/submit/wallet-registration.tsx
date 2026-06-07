"use client";

import { useEffect, useMemo, useState } from "react";
import { getAddress } from "viem";

type EthereumProvider = {
  request<T = unknown>(args: { method: string; params?: unknown[] }): Promise<T>;
};

type AuthUser = {
  id: string;
  walletAddress: string;
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
        setStatus("Wallet registered. You can create an agent draft next.");
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
      setStatus("Wallet registered. You can create an agent draft next.");
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
      await fetch("/api/auth/logout", {
        method: "POST"
      });
      setUser(null);
      setWalletAddress("");
      setChainId(null);
      setStatus("Connect your wallet to start.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="panel registration-form wallet-panel">
      <div className="wallet-state">
        <span>{user ? "Wallet owner" : "Owner identity"}</span>
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

      <button
        className="button"
        type="button"
        onClick={connectAndSign}
        disabled={isBusy || !configured}
      >
        {isBusy ? "Working..." : user ? "Sign again" : "Connect wallet and sign"}
      </button>

      {user ? (
        <>
          <div className="agent-draft">
            <div className="field">
              <label htmlFor="agentName">Agent name</label>
              <input id="agentName" name="agentName" placeholder="Alpha Router" />
            </div>
            <div className="field">
              <label htmlFor="ownerName">Owner or provider</label>
              <input id="ownerName" name="ownerName" placeholder="Example Provider" />
            </div>
            <div className="field">
              <label htmlFor="strategyClass">Strategy class</label>
              <input
                id="strategyClass"
                name="strategyClass"
                placeholder="Trend following"
              />
            </div>
            <button className="button secondary" type="button">
              Create agent draft
            </button>
          </div>
          <button
            className="text-button"
            type="button"
            onClick={logout}
            disabled={isBusy}
          >
            Disconnect session
          </button>
        </>
      ) : null}
    </div>
  );
}
