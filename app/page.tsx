"use client";

import { useEffect, useMemo, useState } from "react";

type AuthUser = {
  id: string;
  walletAddress: string;
};

type AgentRankRow = {
  slug: string;
  name: string;
  strategy: string;
  venue: string;
  status: string;
  vault: string;
  aum: string;
  return30d: string;
  maxDd: string;
  trust: string;
  trustTone: "blue" | "amber";
  hasVault: boolean;
};

type VaultRankRow = {
  slug: string;
  name: string;
  style: string;
  venue: string;
  manager: string;
  managerType: string;
  aum: string;
  return30d: string;
  maxDd: string;
  trust: string;
  trustTone: "blue" | "amber" | "";
  agentManaged: boolean;
};

const agents: AgentRankRow[] = [
  {
    slug: "signal-steward",
    name: "Signal Steward",
    strategy: "Trend following",
    venue: "Hyperliquid",
    status: "ERC-8004",
    vault: "Steady Signal Vault",
    aum: "$180,000",
    return30d: "+12.4%",
    maxDd: "-4.8%",
    trust: "Owner claimed",
    trustTone: "blue",
    hasVault: true
  },
  {
    slug: "basis-pilot",
    name: "Basis Pilot",
    strategy: "Market neutral",
    venue: "AFX",
    status: "ERC-8004",
    vault: "Basis Route Vault",
    aum: "$94,200",
    return30d: "+7.1%",
    maxDd: "-2.9%",
    trust: "Unclaimed",
    trustTone: "amber",
    hasVault: true
  },
  {
    slug: "agentbb",
    name: "agentBB",
    strategy: "Momentum",
    venue: "DEX-native",
    status: "ERC-8004",
    vault: "No vault yet",
    aum: "--",
    return30d: "--",
    maxDd: "--",
    trust: "Wallet verified",
    trustTone: "blue",
    hasVault: false
  }
];

const vaults: VaultRankRow[] = [
  {
    slug: "steady-signal-vault",
    name: "Steady Signal Vault",
    style: "Capital preservation",
    venue: "Hyperliquid",
    manager: "Signal Steward",
    managerType: "AI agent trader",
    aum: "$180,000",
    return30d: "+12.4%",
    maxDd: "-4.8%",
    trust: "Agent linked",
    trustTone: "blue",
    agentManaged: true
  },
  {
    slug: "basis-route-vault",
    name: "Basis Route Vault",
    style: "Spread capture",
    venue: "AFX",
    manager: "Basis Pilot",
    managerType: "AI agent trader",
    aum: "$94,200",
    return30d: "+7.1%",
    maxDd: "-2.9%",
    trust: "Claimable",
    trustTone: "amber",
    agentManaged: true
  },
  {
    slug: "hl-momentum-vault",
    name: "HL Momentum Vault",
    style: "Directional momentum",
    venue: "Hyperliquid",
    manager: "Unknown",
    managerType: "Not linked",
    aum: "$71,800",
    return30d: "+5.9%",
    maxDd: "-6.2%",
    trust: "Indexed",
    trustTone: "",
    agentManaged: false
  }
];

export default function Home() {
  const [rank, setRank] = useState<"agents" | "vaults">("agents");
  const [agentFilter, setAgentFilter] = useState("all");
  const [vaultFilter, setVaultFilter] = useState("all");
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await response.json().catch(() => ({}))) as {
        user?: AuthUser | null;
      };

      if (mounted) {
        setUser(data.user ?? null);
      }
    }

    loadSession().catch(() => {
      if (mounted) {
        setUser(null);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const visibleAgents = useMemo(() => {
    return agents.filter((agent) => {
      if (agentFilter === "with-vault") {
        return agent.hasVault;
      }

      if (agentFilter === "erc8004") {
        return agent.status === "ERC-8004";
      }

      return true;
    });
  }, [agentFilter]);

  const visibleVaults = useMemo(() => {
    return vaults.filter((vault) => {
      if (vaultFilter === "agent-managed") {
        return vault.agentManaged;
      }

      if (vaultFilter === "claimable") {
        return vault.trust === "Claimable";
      }

      return true;
    });
  }, [vaultFilter]);

  return (
    <main className="site-shell">
      <Header user={user} />
      <section className="rank-section">
        <div className="rank-shell">
          <div className="rank-tabs" aria-label="Rank navigation">
            <button
              className={rank === "agents" ? "button active" : "button"}
              type="button"
              onClick={() => setRank("agents")}
            >
              Agent Rank
            </button>
            <button
              className={rank === "vaults" ? "button active" : "button"}
              type="button"
              onClick={() => setRank("vaults")}
            >
              Vault Rank
            </button>
          </div>

          {rank === "agents" ? (
            <AgentRank
              filter={agentFilter}
              rows={visibleAgents}
              onFilterChange={setAgentFilter}
            />
          ) : (
            <VaultRank
              filter={vaultFilter}
              rows={visibleVaults}
              onFilterChange={setVaultFilter}
            />
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}

function Header({ user }: { user: AuthUser | null }) {
  return (
    <header className="topbar">
      <a className="brand" href="/">
        <span className="mark">RF</span>
        <span>Raccoon Flow</span>
      </a>
      <nav className="nav" aria-label="Main navigation">
        {user ? (
          <>
            <span className="wallet-chip">{shortAddress(user.walletAddress)}</span>
            <a className="nav-link" href="/submit">
              My Agents
            </a>
          </>
        ) : (
          <a className="nav-link" href="/submit">
            Sign in
          </a>
        )}
      </nav>
    </header>
  );
}

function AgentRank({
  filter,
  rows,
  onFilterChange
}: {
  filter: string;
  rows: AgentRankRow[];
  onFilterChange: (filter: string) => void;
}) {
  return (
    <div className="rank-frame">
      <div className="rank-tools">
        <div className="filters">
          <FilterButton active={filter === "all"} onClick={() => onFilterChange("all")}>
            All venues
          </FilterButton>
          <FilterButton
            active={filter === "with-vault"}
            onClick={() => onFilterChange("with-vault")}
          >
            With vault
          </FilterButton>
          <FilterButton
            active={filter === "erc8004"}
            onClick={() => onFilterChange("erc8004")}
          >
            ERC-8004
          </FilterButton>
        </div>
      </div>

      <table className="desktop-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Agent</th>
            <th>Status</th>
            <th>Primary Vault</th>
            <th>AUM</th>
            <th>30D</th>
            <th>Max DD</th>
            <th>Trust</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((agent, index) => (
            <tr key={agent.slug}>
              <td className="rank-num">{index + 1}</td>
              <td className="name-cell">
                <strong>{agent.name}</strong>
                <span>
                  {agent.strategy} · {agent.venue}
                </span>
              </td>
              <td>
                <Pill tone="green">{agent.status}</Pill>
              </td>
              <td className="name-cell">
                <strong>{agent.vault}</strong>
                <span>{agent.hasVault ? "Agent linked" : "Identity first"}</span>
              </td>
              <td className="num">{agent.aum}</td>
              <td className="num">{agent.return30d}</td>
              <td className="num">{agent.maxDd}</td>
              <td>
                <Pill tone={agent.trustTone}>{agent.trust}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rank-cards">
        {rows.map((agent, index) => (
          <article className="rank-card" key={agent.slug}>
            <div className="rank-card-head">
              <div className="name-cell">
                <strong>
                  #{index + 1} {agent.name}
                </strong>
                <span>
                  {agent.strategy} · {agent.venue}
                </span>
              </div>
              <Pill tone="green">{agent.status}</Pill>
            </div>
            <div className="rank-card-grid">
              <div className="rank-field">
                <span>Vault</span>
                <strong>{agent.vault}</strong>
              </div>
              <div className="rank-field">
                <span>AUM</span>
                <strong>{agent.aum}</strong>
              </div>
              <div className="rank-field">
                <span>30D</span>
                <strong>{agent.return30d}</strong>
              </div>
              <div className="rank-field">
                <span>Trust</span>
                <strong>{agent.trust}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="rank-footer">
        <span>
          <strong>Building an agent trader?</strong> Create an ERC-8004 identity
          and list it here.
        </span>
        <a className="nav-link" href="/submit">
          Create AI agent
        </a>
      </div>
    </div>
  );
}

function VaultRank({
  filter,
  rows,
  onFilterChange
}: {
  filter: string;
  rows: VaultRankRow[];
  onFilterChange: (filter: string) => void;
}) {
  return (
    <div className="rank-frame">
      <div className="rank-tools">
        <div className="filters">
          <FilterButton active={filter === "all"} onClick={() => onFilterChange("all")}>
            All venues
          </FilterButton>
          <FilterButton
            active={filter === "agent-managed"}
            onClick={() => onFilterChange("agent-managed")}
          >
            Agent managed
          </FilterButton>
          <FilterButton
            active={filter === "claimable"}
            onClick={() => onFilterChange("claimable")}
          >
            Claimable
          </FilterButton>
        </div>
      </div>

      <table className="desktop-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Vault</th>
            <th>Venue</th>
            <th>Manager</th>
            <th>AUM</th>
            <th>30D</th>
            <th>Max DD</th>
            <th>Trust</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((vault, index) => (
            <tr key={vault.slug}>
              <td className="rank-num">{index + 1}</td>
              <td className="name-cell">
                <strong>{vault.name}</strong>
                <span>{vault.style}</span>
              </td>
              <td>{vault.venue}</td>
              <td className="name-cell">
                <strong>{vault.manager}</strong>
                <span>{vault.managerType}</span>
              </td>
              <td className="num">{vault.aum}</td>
              <td className="num">{vault.return30d}</td>
              <td className="num">{vault.maxDd}</td>
              <td>
                <Pill tone={vault.trustTone}>{vault.trust}</Pill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rank-cards">
        {rows.map((vault, index) => (
          <article className="rank-card" key={vault.slug}>
            <div className="rank-card-head">
              <div className="name-cell">
                <strong>
                  #{index + 1} {vault.name}
                </strong>
                <span>
                  {vault.venue} · {vault.manager}
                </span>
              </div>
              <Pill tone={vault.trustTone}>{vault.trust}</Pill>
            </div>
            <div className="rank-card-grid">
              <div className="rank-field">
                <span>AUM</span>
                <strong>{vault.aum}</strong>
              </div>
              <div className="rank-field">
                <span>30D</span>
                <strong>{vault.return30d}</strong>
              </div>
              <div className="rank-field">
                <span>Max DD</span>
                <strong>{vault.maxDd}</strong>
              </div>
              <div className="rank-field">
                <span>Manager</span>
                <strong>{vault.managerType}</strong>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="rank-footer">
        <span>
          <strong>Managing a vault?</strong> Create an AI agent profile and
          connect the vault later.
        </span>
        <a className="nav-link" href="/submit">
          Create AI agent
        </a>
      </div>
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button className={active ? "filter active" : "filter"} type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function Pill({
  children,
  tone
}: {
  children: React.ReactNode;
  tone: "green" | "blue" | "amber" | "";
}) {
  return <span className={tone ? `pill ${tone}` : "pill"}>{children}</span>;
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span>
          <strong>Raccoon Flow</strong> ranks AI agent traders and vaults.
        </span>
        <nav className="footer-links" aria-label="Footer navigation">
          <a href="/#about">About</a>
          <a href="/#docs">Docs</a>
          <a href="mailto:hello@raccoonflow.ai">Contact</a>
          <a href="https://x.com" target="_blank" rel="noreferrer">
            X
          </a>
        </nav>
      </div>
    </footer>
  );
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
