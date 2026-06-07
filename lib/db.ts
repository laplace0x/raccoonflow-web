import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

declare global {
  var raccoonflowSql: postgres.Sql | undefined;
  var raccoonflowSchemaReady: Promise<void> | undefined;
}

export function isDatabaseConfigured() {
  return Boolean(databaseUrl);
}

export function getSql() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL or POSTGRES_URL is required.");
  }

  if (!globalThis.raccoonflowSql) {
    const ssl =
      process.env.DATABASE_SSL === "disable" ? false : ("require" as const);

    globalThis.raccoonflowSql = postgres(databaseUrl, {
      max: 1,
      prepare: false,
      ssl
    });
  }

  return globalThis.raccoonflowSql;
}

export async function ensureSchema() {
  if (!globalThis.raccoonflowSchemaReady) {
    const sql = getSql();

    globalThis.raccoonflowSchemaReady = sql.begin(async (tx) => {
      await tx`
        create table if not exists users (
          id text primary key,
          primary_wallet_address text not null unique,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;

      await tx`
        create table if not exists wallets (
          address text primary key,
          user_id text not null references users(id) on delete cascade,
          chain_id bigint,
          first_seen_at timestamptz not null default now(),
          last_signed_at timestamptz not null default now()
        )
      `;

      await tx`
        create table if not exists login_nonces (
          nonce text primary key,
          address text not null,
          message text not null,
          expires_at timestamptz not null,
          consumed_at timestamptz,
          created_at timestamptz not null default now()
        )
      `;

      await tx`
        create table if not exists sessions (
          id text primary key,
          user_id text not null references users(id) on delete cascade,
          token_hash text not null unique,
          expires_at timestamptz not null,
          created_at timestamptz not null default now(),
          last_seen_at timestamptz not null default now(),
          user_agent text,
          ip_address text
        )
      `;

      await tx`
        create table if not exists agent_drafts (
          id text primary key,
          user_id text not null references users(id) on delete cascade,
          name text not null,
          slug text not null unique,
          strategy_class text,
          owner_label text,
          status text not null default 'draft',
          registry_chain_id bigint,
          registry_address text,
          registry_tx_hash text,
          erc8004_agent_id text,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;

      await tx`
        create table if not exists schema_migrations (
          id text primary key,
          applied_at timestamptz not null default now()
        )
      `;

      await tx`
        create table if not exists vaults (
          id text primary key,
          venue text not null,
          external_id text not null,
          name text not null,
          vault_address text,
          leader_address text,
          manager_name text,
          manager_type text not null default 'Unknown',
          strategy text,
          aum_usd numeric,
          return_1d numeric,
          return_7d numeric,
          return_30d numeric,
          return_all_time numeric,
          apr numeric,
          max_drawdown numeric,
          is_closed boolean not null default false,
          relationship text,
          source_url text,
          raw jsonb not null default '{}'::jsonb,
          fetched_at timestamptz not null default now(),
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique (venue, external_id)
        )
      `;

      await tx`
        create table if not exists vault_sync_runs (
          id text primary key,
          venue text not null,
          status text not null,
          source_url text,
          fetched_count integer not null default 0,
          upserted_count integer not null default 0,
          error text,
          started_at timestamptz not null default now(),
          ended_at timestamptz
        )
      `;

      await tx`
        alter table agent_drafts
        add column if not exists registry_chain_id bigint
      `;

      await tx`
        alter table agent_drafts
        add column if not exists registry_address text
      `;

      await tx`
        alter table agent_drafts
        add column if not exists registry_tx_hash text
      `;

      await tx`
        alter table agent_drafts
        add column if not exists erc8004_agent_id text
      `;

      await tx`
        create index if not exists login_nonces_address_idx
        on login_nonces (address, expires_at)
      `;

      await tx`
        create index if not exists sessions_user_idx
        on sessions (user_id, expires_at)
      `;

      await tx`
        create index if not exists agent_drafts_user_idx
        on agent_drafts (user_id, updated_at desc)
      `;

      await tx`
        create index if not exists vaults_rank_idx
        on vaults (venue, is_closed, aum_usd desc nulls last)
      `;

      await tx`
        create index if not exists vaults_updated_idx
        on vaults (updated_at desc)
      `;

      await tx`
        create index if not exists vault_sync_runs_started_idx
        on vault_sync_runs (started_at desc)
      `;

      await tx`
        insert into schema_migrations (id)
        values ('20260608_vault_sync')
        on conflict (id) do nothing
      `;
    });
  }

  return globalThis.raccoonflowSchemaReady;
}
