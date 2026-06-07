import { randomUUID } from "node:crypto";
import { ensureSchema, getSql, isDatabaseConfigured } from "@/lib/db";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type VaultVenue = "Hyperliquid" | "AFX";

export type VaultRecord = {
  id: string;
  venue: VaultVenue | string;
  externalId: string;
  name: string;
  vaultAddress: string | null;
  leaderAddress: string | null;
  managerName: string | null;
  managerType: string;
  strategy: string | null;
  aumUsd: number | null;
  return1d: number | null;
  return7d: number | null;
  return30d: number | null;
  returnAllTime: number | null;
  apr: number | null;
  maxDrawdown: number | null;
  isClosed: boolean;
  relationship: string | null;
  sourceUrl: string | null;
  fetchedAt: string;
  updatedAt: string;
};

type VaultRow = {
  id: string;
  venue: string;
  external_id: string;
  name: string;
  vault_address: string | null;
  leader_address: string | null;
  manager_name: string | null;
  manager_type: string;
  strategy: string | null;
  aum_usd: string | number | null;
  return_1d: string | number | null;
  return_7d: string | number | null;
  return_30d: string | number | null;
  return_all_time: string | number | null;
  apr: string | number | null;
  max_drawdown: string | number | null;
  is_closed: boolean;
  relationship: string | null;
  source_url: string | null;
  fetched_at: Date;
  updated_at: Date;
};

type NormalizedVault = {
  venue: VaultVenue;
  externalId: string;
  name: string;
  vaultAddress: string | null;
  leaderAddress: string | null;
  managerName: string | null;
  managerType: string;
  strategy: string | null;
  aumUsd: number | null;
  return1d: number | null;
  return7d: number | null;
  return30d: number | null;
  returnAllTime: number | null;
  apr: number | null;
  maxDrawdown: number | null;
  isClosed: boolean;
  relationship: string | null;
  sourceUrl: string;
  raw: unknown;
};

type SyncSourceResult = {
  venue: VaultVenue;
  status: "success" | "skipped" | "failed";
  sourceUrl: string | null;
  fetchedCount: number;
  upsertedCount: number;
  error?: string;
};

export type VaultSyncResult = {
  ok: boolean;
  sources: SyncSourceResult[];
};

export const demoVaults: VaultRecord[] = [
  {
    id: "demo:steady-signal-vault",
    venue: "Hyperliquid",
    externalId: "steady-signal-vault",
    name: "Steady Signal Vault",
    vaultAddress: null,
    leaderAddress: null,
    managerName: "Signal Steward",
    managerType: "AI agent trader",
    strategy: "Capital preservation",
    aumUsd: 180000,
    return1d: null,
    return7d: null,
    return30d: 12.4,
    returnAllTime: null,
    apr: null,
    maxDrawdown: -4.8,
    isClosed: false,
    relationship: null,
    sourceUrl: null,
    fetchedAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString()
  },
  {
    id: "demo:basis-route-vault",
    venue: "AFX",
    externalId: "basis-route-vault",
    name: "Basis Route Vault",
    vaultAddress: null,
    leaderAddress: null,
    managerName: "Basis Pilot",
    managerType: "AI agent trader",
    strategy: "Spread capture",
    aumUsd: 94200,
    return1d: null,
    return7d: null,
    return30d: 7.1,
    returnAllTime: null,
    apr: null,
    maxDrawdown: -2.9,
    isClosed: false,
    relationship: null,
    sourceUrl: null,
    fetchedAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString()
  },
  {
    id: "demo:hl-momentum-vault",
    venue: "Hyperliquid",
    externalId: "hl-momentum-vault",
    name: "HL Momentum Vault",
    vaultAddress: null,
    leaderAddress: null,
    managerName: "Unknown",
    managerType: "Not linked",
    strategy: "Directional momentum",
    aumUsd: 71800,
    return1d: null,
    return7d: null,
    return30d: 5.9,
    returnAllTime: null,
    apr: null,
    maxDrawdown: -6.2,
    isClosed: false,
    relationship: null,
    sourceUrl: null,
    fetchedAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString()
  }
];

const HYPERLIQUID_VAULTS_URL =
  process.env.HYPERLIQUID_VAULTS_URL ??
  "https://stats-data.hyperliquid.xyz/Mainnet/vaults";

const AFX_VAULTS_URL = process.env.AFX_VAULTS_URL ?? "";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  const record = asRecord(value);

  for (const key of ["vaults", "data", "items", "list", "rows"]) {
    const candidate = record[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function cleanText(value: unknown, maxLength = 240) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function cleanAddress(value: unknown) {
  const text = cleanText(value, 80);
  return text?.startsWith("0x") ? text.toLowerCase() : text;
}

function cleanNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replaceAll(",", ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function percentFromRatio(value: unknown) {
  const parsed = cleanNumber(value);
  return parsed === null ? null : parsed * 100;
}

function firstNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const parsed = cleanNumber(record[key]);
    if (parsed !== null) {
      return parsed;
    }
  }

  return null;
}

function firstText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const parsed = cleanText(record[key]);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function relationshipText(value: unknown) {
  if (typeof value === "string") {
    return cleanText(value);
  }

  const record = asRecord(value);
  return firstText(record, ["type", "name", "relationship"]);
}

function firstAddress(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const parsed = cleanAddress(record[key]);
    if (parsed) {
      return parsed;
    }
  }

  return null;
}

function serializeVault(row: VaultRow): VaultRecord {
  return {
    id: row.id,
    venue: row.venue,
    externalId: row.external_id,
    name: row.name,
    vaultAddress: row.vault_address,
    leaderAddress: row.leader_address,
    managerName: row.manager_name,
    managerType: row.manager_type,
    strategy: row.strategy,
    aumUsd: cleanNumber(row.aum_usd),
    return1d: cleanNumber(row.return_1d),
    return7d: cleanNumber(row.return_7d),
    return30d: cleanNumber(row.return_30d),
    returnAllTime: cleanNumber(row.return_all_time),
    apr: cleanNumber(row.apr),
    maxDrawdown: cleanNumber(row.max_drawdown),
    isClosed: row.is_closed,
    relationship: row.relationship,
    sourceUrl: row.source_url,
    fetchedAt: row.fetched_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

function toJsonValue(value: unknown): JsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as JsonValue;
}

function normalizeHyperliquidVault(raw: unknown): NormalizedVault | null {
  const vault = asRecord(raw);
  const summary = asRecord(vault.summary);
  const vaultAddress = firstAddress(vault, [
    "vaultAddress",
    "vault_address",
    "address"
  ]) ?? firstAddress(summary, ["vaultAddress", "vault_address", "address"]);
  const externalId =
    vaultAddress ??
    firstText(vault, ["id", "slug", "name"]) ??
    firstText(summary, ["id", "slug", "name"]);
  const name =
    firstText(vault, ["name", "vaultName", "title"]) ??
    firstText(summary, ["name", "vaultName", "title"]) ??
    externalId;

  if (!externalId || !name) {
    return null;
  }

  const pnl = asRecord(vault.pnl);
  const returnPct = asRecord(vault.returnPct ?? vault.return_pct);
  const relationship =
    relationshipText(vault.relationship) ?? relationshipText(summary.relationship);

  return {
    venue: "Hyperliquid",
    externalId,
    name,
    vaultAddress,
    leaderAddress:
      firstAddress(vault, ["leader", "leaderAddress", "leader_address"]) ??
      firstAddress(summary, ["leader", "leaderAddress", "leader_address"]),
    managerName:
      firstText(vault, ["leaderName", "managerName", "manager"]) ??
      firstText(summary, ["leaderName", "managerName", "manager"]),
    managerType: "Unknown",
    strategy: firstText(vault, ["strategy", "description"]) ?? relationship,
    aumUsd:
      firstNumber(vault, ["tvl", "aum", "aumUsd", "totalValueLocked"]) ??
      firstNumber(summary, ["tvl", "aum", "aumUsd", "totalValueLocked"]),
    return1d: percentFromRatio(returnPct.day),
    return7d: percentFromRatio(returnPct.week),
    return30d: percentFromRatio(returnPct.month),
    returnAllTime: percentFromRatio(returnPct.allTime ?? returnPct.all_time),
    apr: percentFromRatio(vault.apr),
    maxDrawdown: firstNumber(vault, ["maxDrawdown", "max_drawdown"]),
    isClosed: Boolean(
      vault.isClosed ?? vault.is_closed ?? summary.isClosed ?? summary.is_closed
    ),
    relationship,
    sourceUrl: HYPERLIQUID_VAULTS_URL,
    raw
  };
}

function normalizeAfxVault(raw: unknown): NormalizedVault | null {
  const vault = asRecord(raw);
  const vaultAddress = firstAddress(vault, [
    "vaultAddress",
    "vault_address",
    "address",
    "account"
  ]);
  const externalId =
    vaultAddress ?? firstText(vault, ["id", "vaultId", "vault_id", "slug", "name"]);
  const name = firstText(vault, ["name", "vaultName", "vault_name", "title"]) ?? externalId;

  if (!externalId || !name || !AFX_VAULTS_URL) {
    return null;
  }

  return {
    venue: "AFX",
    externalId,
    name,
    vaultAddress,
    leaderAddress: firstAddress(vault, [
      "leader",
      "leaderAddress",
      "managerAddress",
      "ownerAddress"
    ]),
    managerName: firstText(vault, ["manager", "managerName", "ownerName"]),
    managerType: firstText(vault, ["managerType"]) ?? "Unknown",
    strategy: firstText(vault, ["strategy", "description", "style"]),
    aumUsd: firstNumber(vault, ["aum", "aumUsd", "tvl", "totalValueLocked"]),
    return1d: firstNumber(vault, ["return1d", "return_1d", "dayReturn"]),
    return7d: firstNumber(vault, ["return7d", "return_7d", "weekReturn"]),
    return30d: firstNumber(vault, ["return30d", "return_30d", "monthReturn"]),
    returnAllTime: firstNumber(vault, ["returnAllTime", "return_all_time"]),
    apr: firstNumber(vault, ["apr", "apy"]),
    maxDrawdown: firstNumber(vault, ["maxDrawdown", "max_drawdown"]),
    isClosed: Boolean(vault.isClosed ?? vault.is_closed),
    relationship: firstText(vault, ["relationship"]),
    sourceUrl: AFX_VAULTS_URL,
    raw
  };
}

async function fetchJson(url: string) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "raccoonflow-vault-sync/0.1"
    },
    next: { revalidate: 0 }
  });

  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<unknown>;
}

async function insertSyncRun(result: SyncSourceResult) {
  const sql = getSql();

  await sql`
    insert into vault_sync_runs (
      id,
      venue,
      status,
      source_url,
      fetched_count,
      upserted_count,
      error,
      ended_at
    )
    values (
      ${randomUUID()},
      ${result.venue},
      ${result.status},
      ${result.sourceUrl},
      ${result.fetchedCount},
      ${result.upsertedCount},
      ${result.error ?? null},
      now()
    )
  `;
}

async function upsertVaults(vaults: NormalizedVault[]) {
  const sql = getSql();
  let upserted = 0;

  for (const vault of vaults) {
    const id = `${vault.venue.toLowerCase()}:${vault.externalId.toLowerCase()}`;
    const rows = await sql<{ id: string }[]>`
      insert into vaults (
        id,
        venue,
        external_id,
        name,
        vault_address,
        leader_address,
        manager_name,
        manager_type,
        strategy,
        aum_usd,
        return_1d,
        return_7d,
        return_30d,
        return_all_time,
        apr,
        max_drawdown,
        is_closed,
        relationship,
        source_url,
        raw,
        fetched_at,
        updated_at
      )
      values (
        ${id},
        ${vault.venue},
        ${vault.externalId},
        ${vault.name},
        ${vault.vaultAddress},
        ${vault.leaderAddress},
        ${vault.managerName},
        ${vault.managerType},
        ${vault.strategy},
        ${vault.aumUsd},
        ${vault.return1d},
        ${vault.return7d},
        ${vault.return30d},
        ${vault.returnAllTime},
        ${vault.apr},
        ${vault.maxDrawdown},
        ${vault.isClosed},
        ${vault.relationship},
        ${vault.sourceUrl},
        ${sql.json(toJsonValue(vault.raw))},
        now(),
        now()
      )
      on conflict (venue, external_id)
      do update set
        name = excluded.name,
        vault_address = excluded.vault_address,
        leader_address = excluded.leader_address,
        manager_name = excluded.manager_name,
        manager_type = excluded.manager_type,
        strategy = excluded.strategy,
        aum_usd = excluded.aum_usd,
        return_1d = excluded.return_1d,
        return_7d = excluded.return_7d,
        return_30d = excluded.return_30d,
        return_all_time = excluded.return_all_time,
        apr = excluded.apr,
        max_drawdown = excluded.max_drawdown,
        is_closed = excluded.is_closed,
        relationship = excluded.relationship,
        source_url = excluded.source_url,
        raw = excluded.raw,
        fetched_at = excluded.fetched_at,
        updated_at = now()
      returning id
    `;

    if (rows[0]) {
      upserted += 1;
    }
  }

  return upserted;
}

async function syncHyperliquidVaults(): Promise<SyncSourceResult> {
  try {
    const payload = await fetchJson(HYPERLIQUID_VAULTS_URL);
    const normalized = asArray(payload)
      .map(normalizeHyperliquidVault)
      .filter((vault): vault is NormalizedVault => Boolean(vault));
    const upsertedCount = await upsertVaults(normalized);
    return {
      venue: "Hyperliquid",
      status: "success",
      sourceUrl: HYPERLIQUID_VAULTS_URL,
      fetchedCount: normalized.length,
      upsertedCount
    };
  } catch (error) {
    return {
      venue: "Hyperliquid",
      status: "failed",
      sourceUrl: HYPERLIQUID_VAULTS_URL,
      fetchedCount: 0,
      upsertedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

async function syncAfxVaults(): Promise<SyncSourceResult> {
  if (!AFX_VAULTS_URL) {
    return {
      venue: "AFX",
      status: "skipped",
      sourceUrl: null,
      fetchedCount: 0,
      upsertedCount: 0,
      error: "AFX_VAULTS_URL is not configured."
    };
  }

  try {
    const payload = await fetchJson(AFX_VAULTS_URL);
    const normalized = asArray(payload)
      .map(normalizeAfxVault)
      .filter((vault): vault is NormalizedVault => Boolean(vault));
    const upsertedCount = await upsertVaults(normalized);
    return {
      venue: "AFX",
      status: "success",
      sourceUrl: AFX_VAULTS_URL,
      fetchedCount: normalized.length,
      upsertedCount
    };
  } catch (error) {
    return {
      venue: "AFX",
      status: "failed",
      sourceUrl: AFX_VAULTS_URL,
      fetchedCount: 0,
      upsertedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function syncVaults(): Promise<VaultSyncResult> {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      sources: [
        {
          venue: "Hyperliquid",
          status: "failed",
          sourceUrl: HYPERLIQUID_VAULTS_URL,
          fetchedCount: 0,
          upsertedCount: 0,
          error: "DATABASE_URL or POSTGRES_URL is not configured."
        },
        {
          venue: "AFX",
          status: "failed",
          sourceUrl: AFX_VAULTS_URL || null,
          fetchedCount: 0,
          upsertedCount: 0,
          error: "DATABASE_URL or POSTGRES_URL is not configured."
        }
      ]
    };
  }

  await ensureSchema();

  const sources = [await syncHyperliquidVaults(), await syncAfxVaults()];
  await Promise.all(sources.map(insertSyncRun));

  return {
    ok: sources.some((source) => source.status === "success"),
    sources
  };
}

export async function listVaults(options: {
  venue?: string;
  limit?: number;
  includeClosed?: boolean;
} = {}) {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);

  if (!isDatabaseConfigured()) {
    return demoVaults
      .filter((vault) => !options.venue || vault.venue === options.venue)
      .filter((vault) => options.includeClosed || !vault.isClosed)
      .slice(0, limit);
  }

  await ensureSchema();

  const sql = getSql();
  const venue = options.venue?.trim();

  const rows = venue
    ? await sql<VaultRow[]>`
        select *
        from vaults
        where venue = ${venue}
          and (${options.includeClosed ?? false} or is_closed = false)
        order by aum_usd desc nulls last, updated_at desc
        limit ${limit}
      `
    : await sql<VaultRow[]>`
        select *
        from vaults
        where ${options.includeClosed ?? false} or is_closed = false
        order by aum_usd desc nulls last, updated_at desc
        limit ${limit}
      `;

  return rows.map(serializeVault);
}
