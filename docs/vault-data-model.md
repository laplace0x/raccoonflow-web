# Vault Data Model

Raccoon Flow keeps vault data in two layers.

## Raw layer

`vault_raw_records` stores the latest raw vault record from each venue.

- `venue`: source venue, such as `Hyperliquid` or `AFX`.
- `external_id`: venue-native vault id. For Hyperliquid this is usually `summary.vaultAddress`.
- `source_url`: URL used by the sync job.
- `raw`: unmodified source JSON for the vault.
- `fetched_at`: time this raw record was fetched.
- `updated_at`: time this row was last updated.

This layer is for auditability and reprocessing. Product logic should not depend
on source-specific JSON paths directly.

## Normalized layer

`vaults` stores fields used by ranking APIs and frontend display.

- `venue`: source venue.
- `external_id`: venue-native vault id.
- `name`: display name.
- `vault_address`: vault address when provided by the venue.
- `leader_address`: manager / leader address when provided by the venue.
- `manager_name`: resolved manager name when known.
- `manager_type`: `AI agent trader`, `Human trader`, `Company`, `Unknown`, or `Not linked`.
- `strategy`: short display label such as strategy, description, or relationship.
- `aum_usd`: current TVL / AUM in USD.
- `return_1d`, `return_7d`, `return_30d`, `return_all_time`: normalized percentage returns when available or derived.
- `apr`: annualized return percentage when available.
- `max_drawdown`: normalized percentage drawdown when available or derived.
- `is_closed`: whether the venue marks the vault as closed.
- `relationship`: venue relationship label, such as Hyperliquid `normal`, `parent`, or `child`.
- `source_url`: source URL used by the sync job.
- `raw`: copy of the raw record for convenience; `vault_raw_records.raw` is canonical.

## Current frontend fields

The first Vault Rank view should stay conservative:

- Rank
- Vault name
- Venue
- Manager / leader
- AUM
- 30D return, only when confidently available
- Max drawdown, only when confidently available
- Trust state: `Agent linked`, `Claimable`, or `Indexed`

## Derived fields to design carefully

These should not be rushed into ranking without methodology:

- `return_30d`: Hyperliquid currently exposes PnL series, not direct percentage returns. We need a denominator rule before showing this as performance.
- `max_drawdown`: requires an equity curve or comparable time series. Do not infer from a single PnL point.
- `risk_adjusted_return`: needs a volatility / drawdown model.
- `investability_score`: should combine data freshness, AUM, age, drawdown, return quality, manager claim status, and agent linkage.
- `trust_score`: should distinguish indexed-only vaults, wallet-claimed vaults, ERC-8004-linked agents, and verified owner transfers.
- `agent_managed`: should be true only after explicit linkage or strong registry evidence, not merely because a leader address exists.

The ranking API may sort by AUM for now, but the product ranking should move to
an explicit methodology before it is marketed as investability scoring.
