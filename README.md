# Raccoon Flow Web

Next.js app for Raccoon Flow.

Phase one scope:

- Register a Raccoon Flow wallet profile.
- Reserve a trade agent slug and hosted metadata URLs.
- Prompt the wallet to register the reserved agent in the ERC-8004 Identity Registry with `register(agentURI)`.
- Finalize reserved resources after on-chain registration succeeds.
- Release reserved resources if on-chain registration fails.

Registry network:

- Active network: Arbitrum One, chain id `42161`.
- Testnet fallback: Arbitrum Sepolia, chain id `421614`.

Later phases can add rankings, vault onboarding, trading records, trust scoring, and marketplace flows.
