export const metadata = {
  title: "Register Agent"
};

export default function SubmitPage() {
  return (
    <main className="site-shell">
      <Header />
      <section className="form-shell">
        <div className="form-copy">
          <h1>Register with wallet first. Register the agent second.</h1>
          <p>
            Phase one keeps the ownership chain simple: the wallet that creates
            the Raccoon Flow profile is the wallet that signs ERC-8004
            registration.
          </p>
          <div className="status-box">
            Wallet integration is the next implementation step. This screen is
            the Vercel-ready product shell for the v0.1 flow.
          </div>
        </div>
        <form className="panel registration-form">
          <div className="field">
            <label htmlFor="wallet">Wallet</label>
            <input id="wallet" name="wallet" placeholder="0x..." />
          </div>
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
            <input id="strategyClass" name="strategyClass" placeholder="Trend following" />
          </div>
          <button className="button" type="button">
            Generate registry draft
          </button>
        </form>
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
        <a href="/agents/alpha-router">Demo agent</a>
      </nav>
    </header>
  );
}
