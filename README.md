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

Vault sync:

- `GET /api/vaults` returns ranked vault rows for the frontend.
- `GET` or `POST /api/jobs/sync-vaults` syncs vaults into Postgres.
- Vercel Cron runs `/api/jobs/sync-vaults` daily via `vercel.json` on the Hobby plan.
- Set `CRON_SECRET` in production so the sync job rejects unauthenticated calls.
- Hyperliquid defaults to `https://stats-data.hyperliquid.xyz/Mainnet/vaults`.
- Set `AFX_VAULTS_URL` when the AFX vault list endpoint is confirmed. If unset, AFX sync is skipped and recorded in `vault_sync_runs`.
