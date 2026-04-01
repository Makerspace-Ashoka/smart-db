import type { DatabaseSync } from "node:sqlite";

export interface Migration {
  version: number;
  description: string;
  sql: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    description: "baseline schema",
    sql: `
CREATE TABLE IF NOT EXISTS part_types (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  category TEXT NOT NULL,
  aliases_json TEXT NOT NULL DEFAULT '[]',
  image_url TEXT,
  notes TEXT,
  countable INTEGER NOT NULL,
  needs_review INTEGER NOT NULL DEFAULT 1,
  partdb_part_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS qr_batches (
  id TEXT PRIMARY KEY,
  prefix TEXT NOT NULL,
  start_number INTEGER NOT NULL,
  end_number INTEGER NOT NULL,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS qrcodes (
  code TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES qr_batches(id),
  status TEXT NOT NULL,
  assigned_kind TEXT,
  assigned_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS physical_instances (
  id TEXT PRIMARY KEY,
  qr_code TEXT NOT NULL UNIQUE REFERENCES qrcodes(code),
  part_type_id TEXT NOT NULL REFERENCES part_types(id),
  status TEXT NOT NULL,
  location TEXT NOT NULL,
  assignee TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bulk_stocks (
  id TEXT PRIMARY KEY,
  qr_code TEXT NOT NULL UNIQUE REFERENCES qrcodes(code),
  part_type_id TEXT NOT NULL REFERENCES part_types(id),
  level TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_events (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  event TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT,
  location TEXT,
  actor TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL
);
    `,
  },
  {
    version: 2,
    description: "version columns and idempotency keys",
    sql: `
ALTER TABLE physical_instances ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE bulk_stocks ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
    `,
  },
];

export function applyMigrations(
  db: DatabaseSync,
  customMigrations: Migration[] = migrations,
): { applied: number; current: number } {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      description TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const row = db
    .prepare(`SELECT COALESCE(MAX(version), 0) AS current_version FROM schema_version`)
    .get() as { current_version: number };
  const currentVersion = Number(row.current_version);

  const pending = customMigrations.filter((m) => m.version > currentVersion);
  if (pending.length === 0) {
    return { applied: 0, current: currentVersion };
  }

  for (const migration of pending) {
    db.exec("BEGIN");
    try {
      db.exec(migration.sql);
      db.prepare(
        `INSERT INTO schema_version (version, description, applied_at) VALUES (?, ?, ?)`,
      ).run(migration.version, migration.description, new Date().toISOString());
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  return { applied: pending.length, current: pending[pending.length - 1]!.version };
}
