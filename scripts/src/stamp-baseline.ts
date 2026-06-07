/**
 * stamp-baseline.ts
 *
 * Marks the baseline Drizzle migration as applied in drizzle.__drizzle_migrations
 * WITHOUT executing any of its SQL. This is the correct procedure for databases
 * that already have the schema (created by the historical drizzle-kit push workflow).
 *
 * WHEN TO USE:
 *   Run this once against each database (dev, then prod) before switching to
 *   `drizzle-kit migrate`. Once stamped, `pnpm --filter db migrate` will see
 *   zero pending migrations and be a true no-op on existing databases.
 *
 * WHAT IT DOES:
 *   1. Reads lib/db/drizzle/meta/_journal.json
 *   2. Computes the SHA-256 hash of the baseline .sql file
 *      (exact same algorithm as drizzle-orm's readMigrationFiles)
 *   3. Creates drizzle schema and __drizzle_migrations table if absent
 *   4. Inserts one row (hash + created_at) — idempotent, skips if already present
 *
 * WHAT IT DOES NOT DO:
 *   - Does not execute any SQL from the baseline migration file
 *   - Does not drop, alter, or create any application tables
 *   - Does not print DATABASE_URL or credentials
 *
 * USAGE:
 *   pnpm --filter @workspace/scripts stamp-baseline
 *   # For production: DATABASE_URL=$PROD_DB_URL pnpm --filter @workspace/scripts stamp-baseline
 */

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Path to the migration directory — two levels up from scripts/src/ to repo root,
// then into lib/db/drizzle/
const DRIZZLE_DIR = join(__dirname, "../../lib/db/drizzle");
const JOURNAL_PATH = join(DRIZZLE_DIR, "meta/_journal.json");

// ── 1. Validate prerequisites ─────────────────────────────────────────────────

if (!existsSync(JOURNAL_PATH)) {
  console.error("ERROR: No baseline migration found.");
  console.error(`  Expected journal at: ${JOURNAL_PATH}`);
  console.error("  Run 'pnpm --filter db generate' to create the baseline first.");
  process.exit(1);
}

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}
interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}

const journal: Journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf-8"));

if (!Array.isArray(journal.entries) || journal.entries.length === 0) {
  console.error("ERROR: _journal.json has no entries.");
  process.exit(1);
}

// Stamp ALL journal entries (normally just one: the baseline). This handles the
// case where the stamp is re-run after additional migrations were added.
const entriesToStamp = journal.entries;

for (const entry of entriesToStamp) {
  const sqlPath = join(DRIZZLE_DIR, `${entry.tag}.sql`);
  if (!existsSync(sqlPath)) {
    console.error(`ERROR: Migration SQL file not found: ${sqlPath}`);
    process.exit(1);
  }
}

// ── 2. Compute hash for each entry ───────────────────────────────────────────
// Mirrors drizzle-orm's readMigrationFiles exactly:
//   crypto.createHash("sha256").update(query).digest("hex")
// where query = raw UTF-8 content of the .sql file.

interface MigrationRecord {
  tag: string;
  hash: string;
  createdAt: number;
  sqlPath: string;
}

const records: MigrationRecord[] = entriesToStamp.map((entry) => {
  const sqlPath = join(DRIZZLE_DIR, `${entry.tag}.sql`);
  const sqlContent = readFileSync(sqlPath, "utf-8");
  const hash = createHash("sha256").update(sqlContent).digest("hex");
  return { tag: entry.tag, hash, createdAt: entry.when, sqlPath };
});

// ── 3. Connect to database ────────────────────────────────────────────────────

const dbUrl = process.env["DATABASE_URL"];
if (!dbUrl) {
  console.error("ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

// Build a credential-free host string for display
let safeTarget = "(unknown host)";
try {
  const u = new URL(dbUrl);
  safeTarget = `${u.hostname}:${u.port || "5432"}${u.pathname}`;
} catch {
  // malformed URL — don't print it
}

console.log("=".repeat(60));
console.log("stamp-baseline.ts");
console.log("=".repeat(60));
console.log(`Target DB       : ${safeTarget}`);
console.log(`Migrations found: ${records.length}`);
for (const r of records) {
  console.log(`  tag=${r.tag}`);
  console.log(`  hash=${r.hash.slice(0, 16)}...  created_at=${r.createdAt}`);
}
console.log("");

const client = new pg.Client({ connectionString: dbUrl });

try {
  await client.connect();

  // ── 4. Ensure drizzle schema and migrations table exist ────────────────────
  // Schema exactly matches drizzle-orm's pg dialect migrate() implementation.

  await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id         SERIAL PRIMARY KEY,
      hash       TEXT NOT NULL,
      created_at BIGINT
    )
  `);

  // ── 5. Stamp each entry (idempotent) ───────────────────────────────────────

  for (const record of records) {
    const { rows: existing } = await client.query<{ id: number }>(
      `SELECT id FROM drizzle.__drizzle_migrations WHERE hash = $1`,
      [record.hash],
    );

    if (existing.length > 0) {
      console.log(`SKIPPED  [${record.tag}]`);
      console.log(`  Already stamped (row id=${existing[0]!.id}).`);
      console.log("  No changes made.");
    } else {
      await client.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
        [record.hash, record.createdAt],
      );
      console.log(`INSERTED [${record.tag}]`);
      console.log(
        "  Baseline row stamped — marked applied WITHOUT executing its SQL.",
      );
    }
    console.log("");
  }

  // ── 6. Print final journal state ───────────────────────────────────────────

  const { rows: allRows } = await client.query<{
    id: number;
    hash: string;
    created_at: string;
  }>(
    `SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`,
  );

  console.log("─".repeat(60));
  console.log(`drizzle.__drizzle_migrations: ${allRows.length} row(s)`);
  for (const r of allRows) {
    const ts = new Date(Number(r.created_at)).toISOString();
    console.log(`  id=${r.id}  hash=${r.hash.slice(0, 16)}...  created_at=${ts}`);
  }
  console.log("─".repeat(60));
  console.log("Done. Run 'pnpm --filter db migrate' to verify zero pending migrations.");
} finally {
  await client.end();
}
