import { activeRegistryChain } from "@/lib/chains";
import { WalletRegistration } from "./wallet-registration";

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
            Raccoon Flow never asks for private keys. The browser wallet signs a
            short login challenge, then the platform records the wallet as the
            owner identity.
          </div>
          <div className="status-box muted-box">
            Active registry network: {activeRegistryChain.name} (
            {activeRegistryChain.chainId}).
          </div>
        </div>
        <WalletRegistration />
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
