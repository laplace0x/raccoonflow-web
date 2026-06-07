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
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
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
        create index if not exists login_nonces_address_idx
        on login_nonces (address, expires_at)
      `;

      await tx`
        create index if not exists sessions_user_idx
        on sessions (user_id, expires_at)
      `;
    });
  }

  return globalThis.raccoonflowSchemaReady;
}
