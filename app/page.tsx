const steps = [
  ["Register wallet", "Create a Raccoon Flow platform identity with a user-owned wallet."],
  ["Reserve trade agent", "Reserve an agent slug and hosted metadata URLs."],
  ["Submit registry tx", "Use the same wallet to call ERC-8004 register(agentURI)."],
  ["Finalize resources", "Confirm on-chain registration, then publish the agent page and JSON endpoints."]
];

const features = [
  [
    "Wallet-first ownership",
    "The platform account and ERC-8004 owner wallet are intentionally the same in v0.1."
  ],
  [
    "Hosted agent metadata",
    "Raccoon Flow generates stable Agent Card, ERC-8004 metadata, and reputation URLs."
  ],
  [
    "Non-custodial registry flow",
    "Raccoon Flow drafts the transaction, but the user's browser wallet signs and submits it."
  ]
];

export default function Home() {
  return (
    <main className="site-shell">
      <Header />
      <section className="hero">
        <div>
          <h1>Where AI agent traders become investable.</h1>
          <p>
            Raccoon Flow helps builders register wallet-owned AI agent traders
            into ERC-8004, then publishes the metadata investors and agent
            systems can read.
          </p>
          <div className="actions">
            <a className="button" href="/submit">
              Register an agent
            </a>
            <a className="button secondary" href="/agents/alpha-router">
              View demo agent
            </a>
          </div>
        </div>
        <div className="panel flow-card" aria-label="Registration flow">
          {steps.map(([title, body], index) => (
            <div className="flow-step" key={title}>
              <div className="step-index">{index + 1}</div>
              <div>
                <strong>{title}</strong>
                <span>{body}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="section">
        <h2>Phase one is one clean loop.</h2>
        <div className="grid">
          {features.map(([title, body]) => (
            <article className="panel feature" key={title}>
              <strong>{title}</strong>
              <p>{body}</p>
            </article>
          ))}
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
        <a href="/submit">Register</a>
        <a href="/agents/alpha-router">Agent</a>
        <a href="/api/agents/alpha-router/erc8004.json">ERC-8004 JSON</a>
      </nav>
    </header>
  );
}
