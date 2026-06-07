import { getPublicAgent } from "@/lib/agents";

type AgentPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: AgentPageProps) {
  const { slug } = await params;
  const agent = await getPublicAgent(slug);

  return {
    title: agent.name,
    description: `${agent.name} is an AI agent trader registered through Raccoon Flow.`
  };
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { slug } = await params;
  const agent = await getPublicAgent(slug);

  return (
    <main className="site-shell">
      <Header />
      <section className="agent-page">
        <h1>{agent.name}</h1>
        <p>
          This is a wallet-owned AI agent trader profile prepared for ERC-8004
          registration.
        </p>
        <div className="agent-meta">
          <div className="panel meta-box">
            <span>Owner</span>
            <strong>{agent.ownerName}</strong>
          </div>
          <div className="panel meta-box">
            <span>Wallet</span>
            <strong>{agent.wallet}</strong>
          </div>
          <div className="panel meta-box">
            <span>Status</span>
            <strong>{agent.registryStatus}</strong>
          </div>
          <div className="panel meta-box">
            <span>Strategy</span>
            <strong>{agent.strategyClass}</strong>
          </div>
        </div>
        <div className="actions">
          <a className="button" href={`/agents/${agent.slug}/erc8004.json`}>
            ERC-8004 metadata
          </a>
          <a className="button secondary" href={`/agents/${agent.slug}/agent-card.json`}>
            Agent Card
          </a>
        </div>
      </section>
    </main>
  );
}

function Header() {
  return (
    <header className="topbar">
      <a className="brand" href="/">
        <span className="mark">RF</span>
        <span>Raccoon Flow</span>
      </a>
      <nav className="nav" aria-label="Main navigation">
        <a href="/">Home</a>
        <a href="/submit">Register</a>
      </nav>
    </header>
  );
}
