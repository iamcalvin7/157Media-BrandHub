/**
 * verify-restore.ts — Restore drill
 *
 * Downloads a backup from Object Storage, restores it to a test database,
 * and verifies the restore is complete and consistent.
 *
 * SAFETY: This script NEVER modifies the production database.
 *   - Refuses to run if --target-url resolves to the production DATABASE_URL.
 *   - Without --confirm: prints a dry-run plan and exits (non-destructive).
 *   - With --confirm: executes the full restore drill.
 *
 * Usage (dry-run — safe to run at any time):
 *   tsx scripts/src/verify-restore.ts \
 *     --backup latest \
 *     --target-url <TEST_DATABASE_URL>
 *
 * Usage (live drill — requires explicit confirmation):
 *   tsx scripts/src/verify-restore.ts \
 *     --backup latest \
 *     --target-url <TEST_DATABASE_URL> \
 *     --confirm
 *
 * Required environment variables:
 *   PRIVATE_OBJECT_DIR  — Replit Object Storage path (used to derive bucket name)
 *   DATABASE_URL        — production connection string (used only for safety guard)
 *
 * Optional environment variables:
 *   TARGET_DATABASE_URL — alternative to --target-url flag
 */

import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { appendFile, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pipeline } from "node:stream/promises";
import pg from "pg";
import { Storage } from "@google-cloud/storage";

const execFileAsync = promisify(execFile);
const SIDECAR = "http://127.0.0.1:1106";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..", "..");
const DRILL_RESULTS_PATH = join(REPO_ROOT, "docs", "restore-drill-results.jsonl");
const RESTORE_MD_PATH = join(REPO_ROOT, "docs", "RESTORE.md");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Timestamp of the baseline migration stamp (Phase 4A, 2026-06-07T15:16:56.477Z).
// Backups taken before this timestamp do not contain drizzle.__drizzle_migrations.
const STAMP_TIMESTAMP_MS = 1780845416477;

// Timestamp after which brand_voice_notes.source_post_id orphans and
// content_posts.status non-canonical values should no longer exist in backups.
// Set to Infinity until W1.D2 data-cleanup migration runs; update to the
// actual migration timestamp after that migration is applied.
const CLEANUP_TIMESTAMP_MS = 1780849124533; // 2026-06-07T16:18:44.533Z — migration 0001_data_cleanup_d2a applied

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(
  level: "info" | "warn" | "error",
  msg: string,
  data?: Record<string, unknown>,
): void {
  const entry = {
    level,
    type: "verify-restore",
    msg,
    timestamp: new Date().toISOString(),
    ...data,
  };
  (level === "error" ? console.error : console.log)(JSON.stringify(entry));
}

function printLine(s: string): void {
  console.log(s);
}

function printSep(char = "═", width = 61): void {
  printLine(char.repeat(width));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ManifestTable {
  rows: number;
}

interface Manifest {
  backup_id: string;
  timestamp: string;
  table_count: number;
  total_rows: number;
  dump_size_bytes: number;
  sha256_checksum: string;
  integrity_check: string;
  tables: Record<string, ManifestTable>;
}

type CheckStatus = "PASS" | "FAIL" | "WARN" | "SKIPPED";

interface DrillResult {
  date: string;
  backup_id: string;
  backup_timestamp: string;
  target_host: string;
  target_dbname: string;
  result: "PASS" | "FAIL";
  duration_ms: number;
  checks: {
    sha256: "PASS" | "FAIL";
    pg_restore: "COMPLETE" | "FAIL";
    row_counts: { passed: number; failed: number; status: "PASS" | "FAIL" };
    table_count: CheckStatus;
    fk_constraints: "PASS" | "FAIL";
    sequences: "PASS" | "FAIL";
    drizzle_schema: CheckStatus;
    data_snapshot_version: CheckStatus;
    deleted_row_tombstones: CheckStatus;
    orphan_rows: CheckStatus;
    status_values: CheckStatus;
  };
  tables: number;
  total_rows: number;
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): {
  backupKey: string;
  manifestKey: string;
  targetUrl: string;
  confirm: boolean;
} {
  const args = process.argv.slice(2);
  const backupIdx = args.indexOf("--backup");
  const urlIdx = args.indexOf("--target-url");
  const confirm = args.includes("--confirm");

  const backup = backupIdx >= 0 ? args[backupIdx + 1] : null;
  const targetUrl =
    (urlIdx >= 0 ? args[urlIdx + 1] : null) ??
    process.env["TARGET_DATABASE_URL"] ??
    null;

  if (!backup) {
    throw new Error(
      "Missing --backup argument. Use 'latest' or a specific GCS key.",
    );
  }
  if (!targetUrl) {
    throw new Error(
      "Missing --target-url argument or TARGET_DATABASE_URL env var.\n" +
        "  Provide a TEST database URL — NEVER the production DATABASE_URL.",
    );
  }

  const backupKey =
    backup === "latest" ? "backups/latest/prod.dump" : backup;
  const manifestKey =
    backup === "latest"
      ? "backups/latest/prod.manifest.json"
      : backup.replace(/\.dump$/, ".manifest.json");

  return { backupKey, manifestKey, targetUrl, confirm };
}

// ---------------------------------------------------------------------------
// Safety gate helpers
// ---------------------------------------------------------------------------

function parseHostAndDb(url: string): { host: string; dbname: string } {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      dbname: u.pathname.replace(/^\//, ""),
    };
  } catch {
    return { host: "unknown", dbname: "unknown" };
  }
}

// ---------------------------------------------------------------------------
// GCS (identical auth pattern to objectStorage.ts)
// ---------------------------------------------------------------------------

function createStorageClient(): Storage {
  return new Storage({
    credentials: {
      audience: "replit",
      subject_token_type: "access_token",
      token_url: `${SIDECAR}/token`,
      type: "external_account",
      credential_source: {
        url: `${SIDECAR}/credential`,
        format: { type: "json", subject_token_field_name: "access_token" },
      },
      universe_domain: "googleapis.com",
    },
    projectId: "",
  });
}

function getBucketName(): string {
  const dir = process.env["PRIVATE_OBJECT_DIR"];
  if (dir) {
    const segment = dir.split("/").filter(Boolean)[0];
    if (segment) return segment;
  }
  const id = process.env["DEFAULT_OBJECT_STORAGE_BUCKET_ID"];
  if (id) return id;
  throw new Error(
    "Cannot determine GCS bucket: set PRIVATE_OBJECT_DIR or DEFAULT_OBJECT_STORAGE_BUCKET_ID",
  );
}

// ---------------------------------------------------------------------------
// Download helpers
// ---------------------------------------------------------------------------

async function downloadToFile(
  storage: Storage,
  bucketName: string,
  gcsKey: string,
  localPath: string,
): Promise<void> {
  const file = storage.bucket(bucketName).file(gcsKey);
  const [exists] = await file.exists();
  if (!exists) throw new Error(`GCS object not found: gs://${bucketName}/${gcsKey}`);
  await pipeline(file.createReadStream(), createWriteStream(localPath));
}

async function downloadJson(
  storage: Storage,
  bucketName: string,
  gcsKey: string,
): Promise<unknown> {
  const file = storage.bucket(bucketName).file(gcsKey);
  const [exists] = await file.exists();
  if (!exists) throw new Error(`GCS object not found: gs://${bucketName}/${gcsKey}`);
  const [content] = await file.download();
  return JSON.parse(content.toString("utf-8"));
}

// ---------------------------------------------------------------------------
// SHA256
// ---------------------------------------------------------------------------

async function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk: Buffer) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// Connection helpers
// ---------------------------------------------------------------------------

function parseConnectionParts(url: string): {
  host: string;
  port: string;
  dbname: string;
  user: string;
  password: string;
} {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || "5432",
    dbname: u.pathname.replace(/^\//, ""),
    user: u.username,
    password: decodeURIComponent(u.password),
  };
}

async function findBinary(name: string): Promise<string> {
  const { stdout } = await execFileAsync("which", [name]);
  const path = stdout.trim();
  if (!path) throw new Error(`${name} not found in PATH`);
  return path;
}

// ---------------------------------------------------------------------------
// pg_restore
// ---------------------------------------------------------------------------

async function runPgRestore(
  pgRestorePath: string,
  dumpPath: string,
  targetUrl: string,
): Promise<void> {
  const conn = parseConnectionParts(targetUrl);

  const pgpassPath = join(tmpdir(), `vfh-pgpass-restore-${Date.now()}`);
  const pgpassLine = `${conn.host}:${conn.port}:${conn.dbname}:${conn.user}:${conn.password}\n`;
  await writeFile(pgpassPath, pgpassLine, { mode: 0o600 });

  const childEnv: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined && k !== "PGPASSWORD" && k !== "PGPASSFILE") {
      childEnv[k] = v;
    }
  }
  childEnv["PGHOST"] = conn.host;
  childEnv["PGPORT"] = conn.port;
  childEnv["PGDATABASE"] = conn.dbname;
  childEnv["PGUSER"] = conn.user;
  childEnv["PGPASSFILE"] = pgpassPath;

  try {
    await execFileAsync(
      pgRestorePath,
      [
        "--host", conn.host,
        "--port", conn.port,
        "--username", conn.user,
        "--dbname", conn.dbname,
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "--no-password",
        dumpPath,
      ],
      { env: childEnv, maxBuffer: 512 * 1024 * 1024 },
    );
  } finally {
    await unlink(pgpassPath).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Verification checks
// ---------------------------------------------------------------------------

async function verifyRowCounts(
  pool: pg.Pool,
  manifest: Manifest,
): Promise<{
  passed: number;
  failed: number;
  rows: Array<{
    table: string;
    manifest: number;
    restored: number;
    status: string;
  }>;
}> {
  const results: Array<{
    table: string;
    manifest: number;
    restored: number;
    status: string;
  }> = [];
  let passed = 0;
  let failed = 0;

  for (const [table, { rows: expectedRows }] of Object.entries(manifest.tables)) {
    try {
      const { rows } = await pool.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM "${table}"`,
      );
      const restoredRows = parseInt(rows[0]!.count, 10);
      const ok = restoredRows === expectedRows;
      results.push({
        table,
        manifest: expectedRows,
        restored: restoredRows,
        status: ok ? "PASS" : "FAIL",
      });
      if (ok) passed++;
      else failed++;
    } catch {
      results.push({
        table,
        manifest: expectedRows,
        restored: -1,
        status: "ERROR (table missing)",
      });
      failed++;
    }
  }

  return { passed, failed, rows: results };
}

async function checkTableCount(
  pool: pg.Pool,
  manifest: Manifest,
): Promise<{ status: CheckStatus; restored: number; expected: number; note: string }> {
  const { rows } = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  const restored = rows.length;
  const expected = manifest.table_count;

  if (restored === expected) {
    return { status: "PASS", restored, expected, note: `${restored} tables` };
  } else if (restored > expected) {
    return {
      status: "WARN",
      restored,
      expected,
      note: `${restored} restored > ${expected} in manifest (schema has grown since backup)`,
    };
  } else {
    return {
      status: "FAIL",
      restored,
      expected,
      note: `${restored} restored < ${expected} in manifest — ${expected - restored} table(s) missing`,
    };
  }
}

async function checkFkConstraints(pool: pg.Pool): Promise<{
  status: "PASS" | "FAIL";
  total: number;
  invalid: Array<{ name: string; child_table: string; parent_table: string }>;
}> {
  const { rows } = await pool.query<{
    conname: string;
    child_table: string;
    parent_table: string;
    convalidated: boolean;
  }>(`
    SELECT conname,
           conrelid::regclass::text  AS child_table,
           confrelid::regclass::text AS parent_table,
           convalidated
    FROM   pg_constraint
    WHERE  contype = 'f'
    AND    connamespace = 'public'::regnamespace
    ORDER  BY conrelid::regclass::text, conname
  `);

  const invalid = rows
    .filter((r) => !r.convalidated)
    .map((r) => ({
      name: r.conname,
      child_table: r.child_table,
      parent_table: r.parent_table,
    }));

  return {
    status: invalid.length === 0 ? "PASS" : "FAIL",
    total: rows.length,
    invalid,
  };
}

async function checkSequences(
  pool: pg.Pool,
): Promise<
  Array<{ table: string; max_id: number; seq_value: number; ok: boolean }>
> {
  const { rows: seqRows } = await pool.query<{
    sequencename: string;
    last_value: number;
  }>(`
    SELECT sequencename, last_value
    FROM   pg_sequences
    WHERE  schemaname = 'public'
  `);

  const results: Array<{
    table: string;
    max_id: number;
    seq_value: number;
    ok: boolean;
  }> = [];

  for (const { sequencename, last_value } of seqRows) {
    const tableName = sequencename.replace(/_id_seq$/, "");
    try {
      const { rows } = await pool.query<{ max_id: number }>(
        `SELECT COALESCE(MAX(id), 0) AS max_id FROM "${tableName}"`,
      );
      const maxId = rows[0]!.max_id;
      results.push({
        table: tableName,
        max_id: maxId,
        seq_value: last_value,
        ok: last_value >= maxId,
      });
    } catch {
      // Table doesn't have an 'id' column or doesn't exist — skip
    }
  }

  return results;
}

async function checkDrizzleSchema(
  pool: pg.Pool,
  manifestTimestamp: string,
): Promise<{ status: CheckStatus; note: string }> {
  const backupMs = new Date(manifestTimestamp).getTime();

  if (backupMs < STAMP_TIMESTAMP_MS) {
    return {
      status: "SKIPPED",
      note: "backup pre-dates migration stamp (2026-06-07T15:16:56Z) — expected",
    };
  }

  try {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM drizzle.__drizzle_migrations`,
    );
    const count = parseInt(rows[0]!.count, 10);
    if (count >= 1) {
      return {
        status: "PASS",
        note: `${count} row(s) in drizzle.__drizzle_migrations`,
      };
    }
    return {
      status: "FAIL",
      note: "0 rows in drizzle.__drizzle_migrations",
    };
  } catch {
    return {
      status: "FAIL",
      note: "drizzle.__drizzle_migrations does not exist",
    };
  }
}

async function checkBootstrapTables(pool: pg.Pool): Promise<{
  data_snapshot_version: CheckStatus;
  deleted_row_tombstones: CheckStatus;
  notes: string[];
}> {
  const notes: string[] = [];
  let dsv: CheckStatus = "FAIL";
  let drt: CheckStatus = "FAIL";

  try {
    const { rows } = await pool.query<{ version: string }>(
      `SELECT version FROM data_snapshot_version WHERE id = 1`,
    );
    if (rows.length === 1) {
      dsv = "PASS";
      notes.push(`data_snapshot_version: row present (version=${rows[0]!.version})`);
    } else {
      dsv = "WARN";
      notes.push(
        "data_snapshot_version: table exists, no row — expected on test restore (no bootstrap has run against this DB)",
      );
    }
  } catch {
    dsv = "FAIL";
    notes.push("data_snapshot_version: table does not exist");
  }

  try {
    await pool.query(`SELECT COUNT(*) FROM deleted_row_tombstones`);
    drt = "PASS";
    notes.push("deleted_row_tombstones: table exists");
  } catch {
    drt = "WARN";
    notes.push(
      "deleted_row_tombstones: table absent — created lazily at runtime; expected on pre-stamp restore",
    );
  }

  return { data_snapshot_version: dsv, deleted_row_tombstones: drt, notes };
}

// ---------------------------------------------------------------------------
// New W1.D1 checks
// ---------------------------------------------------------------------------

/**
 * checkOrphanRows — verifies brand_voice_notes.source_post_id has no rows
 * pointing to a non-existent content_posts.id.
 *
 * WARN  if backup pre-dates the data-cleanup migration (CLEANUP_TIMESTAMP_MS).
 *       Orphans are expected in pre-cleanup backups.
 * FAIL  if backup post-dates cleanup and orphans are still present — indicates
 *       the cleanup migration did not run or a new orphan was introduced.
 * PASS  if 0 orphan rows are found regardless of timestamp.
 */
async function checkOrphanRows(
  pool: pg.Pool,
  manifestTimestamp: string,
): Promise<{ status: CheckStatus; note: string }> {
  const backupMs = new Date(manifestTimestamp).getTime();

  let orphanCount = 0;
  try {
    const { rows } = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n
       FROM brand_voice_notes
       WHERE source_post_id IS NOT NULL
         AND source_post_id NOT IN (SELECT id FROM content_posts)`,
    );
    orphanCount = parseInt(rows[0]!.n, 10);
  } catch (err) {
    return { status: "FAIL", note: `Query failed: ${String(err)}` };
  }

  if (orphanCount === 0) {
    return { status: "PASS", note: "brand_voice_notes.source_post_id: 0 orphan rows" };
  }

  if (backupMs < CLEANUP_TIMESTAMP_MS) {
    return {
      status: "WARN",
      note:
        `brand_voice_notes.source_post_id: ${orphanCount} orphan row(s) — ` +
        `backup pre-dates W1.D2 data cleanup; expected`,
    };
  }

  return {
    status: "FAIL",
    note:
      `brand_voice_notes.source_post_id: ${orphanCount} orphan row(s) — ` +
      `backup post-dates cleanup (${new Date(CLEANUP_TIMESTAMP_MS).toISOString()}); ` +
      `cleanup migration may not have run`,
  };
}

/**
 * checkStatusValues — verifies content_posts.status contains only
 * canonical lowercase values.
 *
 * WARN  if backup pre-dates the data-cleanup migration.
 * FAIL  if backup post-dates cleanup and bad values persist.
 * PASS  if all values are canonical.
 */
async function checkStatusValues(
  pool: pg.Pool,
  manifestTimestamp: string,
): Promise<{ status: CheckStatus; note: string }> {
  const backupMs = new Date(manifestTimestamp).getTime();
  const VALID = new Set(["pending", "approved", "posted", "scheduled", "skipped", "draft"]);

  let badRows: Array<{ status: string; n: string }> = [];
  try {
    const { rows } = await pool.query<{ status: string; n: string }>(
      `SELECT status, count(*)::text AS n FROM content_posts GROUP BY status`,
    );
    badRows = rows.filter((r) => !VALID.has(r.status));
  } catch (err) {
    return { status: "FAIL", note: `Query failed: ${String(err)}` };
  }

  if (badRows.length === 0) {
    return {
      status: "PASS",
      note: "content_posts.status: all values canonical",
    };
  }

  const detail = badRows.map((r) => `"${r.status}"(${r.n})`).join(", ");

  if (backupMs < CLEANUP_TIMESTAMP_MS) {
    return {
      status: "WARN",
      note:
        `content_posts.status: non-canonical value(s) found: ${detail} — ` +
        `backup pre-dates W1.D2 data cleanup; expected`,
    };
  }

  return {
    status: "FAIL",
    note:
      `content_posts.status: non-canonical value(s) found: ${detail} — ` +
      `backup post-dates cleanup; cleanup migration may not have run`,
  };
}

// ---------------------------------------------------------------------------
// Result logging
// ---------------------------------------------------------------------------

async function logDrillResult(result: DrillResult): Promise<void> {
  const line = JSON.stringify(result) + "\n";
  await appendFile(DRILL_RESULTS_PATH, line, "utf-8");
  log("info", "Drill result appended to restore-drill-results.jsonl", {
    path: DRILL_RESULTS_PATH,
    result: result.result,
  });
}

async function appendRestoreMdRow(result: DrillResult): Promise<void> {
  const dateStr = result.date;
  const row = `| ${dateStr} | ${result.backup_id} | ${result.result} | ${result.tables} | ${result.total_rows} | (drill script) |`;

  let content: string;
  try {
    content = await readFile(RESTORE_MD_PATH, "utf-8");
  } catch {
    log("warn", "Could not read RESTORE.md — skipping drill log auto-append", {
      path: RESTORE_MD_PATH,
    });
    return;
  }

  const PENDING = "| *(First drill pending)* | | | | | |";

  if (content.includes(PENDING)) {
    content = content.replace(PENDING, row);
  } else {
    const drillLogIdx = content.indexOf("## Drill Log");
    if (drillLogIdx === -1) {
      log("warn", "Could not find '## Drill Log' in RESTORE.md — skipping auto-append");
      return;
    }
    const afterDrillLog = content.slice(drillLogIdx);
    // Find blank line followed by --- that closes the table
    const tableEndMatch = afterDrillLog.search(/\n\n---/);
    if (tableEndMatch === -1) {
      log("warn", "Could not locate end of Drill Log table — skipping auto-append");
      return;
    }
    const insertAt = drillLogIdx + tableEndMatch;
    content = content.slice(0, insertAt) + "\n" + row + content.slice(insertAt);
  }

  await writeFile(RESTORE_MD_PATH, content, "utf-8");
  log("info", "RESTORE.md Drill Log updated", { path: RESTORE_MD_PATH });
}

// ---------------------------------------------------------------------------
// Summary printer
// ---------------------------------------------------------------------------

function statusLabel(s: string): string {
  return s.padEnd(7);
}

function printSummary(params: {
  backupId: string;
  targetHost: string;
  targetDb: string;
  durationMs: number;
  sha256: "PASS" | "FAIL";
  pgRestore: "COMPLETE" | "FAIL";
  rowCounts: { passed: number; failed: number };
  tableCount: { status: CheckStatus; restored: number; expected: number };
  fk: { status: "PASS" | "FAIL"; total: number };
  sequences: { total: number; allOk: boolean };
  drizzleSchema: { status: CheckStatus; note: string };
  bootstrapDsv: CheckStatus;
  bootstrapDrt: CheckStatus;
  orphanRows: { status: CheckStatus; note: string };
  statusValues: { status: CheckStatus; note: string };
  overallPass: boolean;
  drillLogged: boolean;
  restoreMdUpdated: boolean;
}): void {
  const {
    backupId, targetHost, targetDb, durationMs,
    sha256, pgRestore, rowCounts, tableCount, fk, sequences,
    drizzleSchema, bootstrapDsv, bootstrapDrt,
    orphanRows, statusValues,
    overallPass, drillLogged, restoreMdUpdated,
  } = params;

  const seqStatus: CheckStatus = sequences.allOk ? "PASS" : "FAIL";
  const rowStatus: CheckStatus = rowCounts.failed === 0 ? "PASS" : "FAIL";
  const overallStr = overallPass ? "PASS ✓" : "FAIL ✗";

  printLine("");
  printSep();
  printLine("  RESTORE DRILL SUMMARY");
  printSep("─");
  printLine(`  Backup   : ${backupId}`);
  printLine(`  Target   : ${targetHost} / ${targetDb}`);
  printLine(`  Duration : ${(durationMs / 1000).toFixed(1)}s`);
  printLine("");
  printLine(`  ${"Check".padEnd(36)} Result`);
  printSep("─");
  printLine(`  ${"SHA256 integrity".padEnd(36)} ${statusLabel(sha256)}`);
  printLine(`  ${"pg_restore".padEnd(36)} ${statusLabel(pgRestore)}`);
  printLine(
    `  ${`Row counts (${rowCounts.passed + rowCounts.failed} tables)`.padEnd(36)} ${statusLabel(rowStatus)}— ${rowCounts.passed}/${rowCounts.passed + rowCounts.failed} passed`,
  );
  printLine(
    `  ${"Table count".padEnd(36)} ${statusLabel(tableCount.status)}— ${tableCount.restored} restored / ${tableCount.expected} expected`,
  );
  printLine(
    `  ${"Foreign key constraints".padEnd(36)} ${statusLabel(fk.status)}— ${fk.total} FK(s)`,
  );
  printLine(
    `  ${"Sequences".padEnd(36)} ${statusLabel(seqStatus)}— ${sequences.total} sequence(s)`,
  );
  printLine(
    `  ${"drizzle schema".padEnd(36)} ${statusLabel(drizzleSchema.status)}— ${drizzleSchema.note}`,
  );
  printLine(
    `  ${"data_snapshot_version".padEnd(36)} ${statusLabel(bootstrapDsv)}`,
  );
  printLine(
    `  ${"deleted_row_tombstones".padEnd(36)} ${statusLabel(bootstrapDrt)}`,
  );
  printLine(
    `  ${"Orphan rows".padEnd(36)} ${statusLabel(orphanRows.status)}— ${orphanRows.note}`,
  );
  printLine(
    `  ${"Status values".padEnd(36)} ${statusLabel(statusValues.status)}— ${statusValues.note}`,
  );
  printSep("─");
  printLine(`  OVERALL RESULT: ${overallStr}`);
  printSep("─");

  if (overallPass) {
    printLine("  Next steps:");
    printLine("    1. Run manual app boot verification (docs/RESTORE.md Step 6):");
    printLine(`       NODE_ENV=production DATABASE_URL="<TEST_DATABASE_URL>" \\`);
    printLine(`         pnpm --filter @workspace/api-server run dev`);
    printLine(`       curl http://localhost:\$PORT/api/healthz  # expect {"status":"ok"}`);
    if (drillLogged) {
      printLine("    2. Drill result written to docs/restore-drill-results.jsonl ✓");
    }
    if (restoreMdUpdated) {
      printLine("    3. RESTORE.md Drill Log updated ✓");
    }
    printLine("    4. Commit results:");
    printLine("       git add docs/RESTORE.md docs/restore-drill-results.jsonl");
    printLine('       git commit -m "chore: restore drill result $(date +%Y-%m-%d)"');
    printLine("    5. Drop the test database (Replit → Tools → Database → Delete)");
  } else {
    printLine("  ⚠  One or more checks FAILED.");
    printLine("     Do not use this backup for a production restore until failures are resolved.");
    printLine("     Review individual check output above for details.");
  }

  printSep();
  printLine("");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const startMs = Date.now();
  const { backupKey, manifestKey, targetUrl, confirm } = parseArgs();
  const targetConn = parseConnectionParts(targetUrl);
  const targetInfo = parseHostAndDb(targetUrl);

  // ── Safety gate: refuse if target matches production ───────────────────────
  const prodUrl = process.env["DATABASE_URL"];
  if (prodUrl) {
    const prodInfo = parseHostAndDb(prodUrl);
    if (
      prodInfo.host === targetInfo.host &&
      prodInfo.dbname === targetInfo.dbname
    ) {
      console.error("");
      console.error("ERROR: --target-url resolves to the production database.");
      console.error(`  Production  : ${prodInfo.host} / ${prodInfo.dbname}`);
      console.error(`  Target      : ${targetInfo.host} / ${targetInfo.dbname}`);
      console.error("  Refusing to run a destructive restore against production.");
      console.error("  Provide a separate TEST database URL via --target-url.");
      console.error("");
      process.exit(1);
    }
  }

  // ── Dry-run mode (no --confirm) ────────────────────────────────────────────
  if (!confirm) {
    printLine("");
    printSep();
    printLine("  RESTORE DRILL — DRY RUN (no --confirm)");
    printSep("─");
    printLine(`  Backup      : ${backupKey}`);
    printLine(`  Manifest    : ${manifestKey}`);
    printLine(`  Target host : ${targetInfo.host}`);
    printLine(`  Target DB   : ${targetInfo.dbname}`);
    printLine("");
    printLine("  Steps that WOULD execute with --confirm:");
    printLine("    1. Download manifest from GCS");
    printLine("    2. Download dump from GCS");
    printLine("    3. Verify SHA256 checksum");
    printLine("    4. Run pg_restore --clean --if-exists against target");
    printLine("    5. Verify row counts (all tables)");
    printLine("    6. Verify restored table count matches manifest");
    printLine("    7. Verify FK constraints all convalidated");
    printLine("    8. Verify sequences ≥ max(id)");
    printLine("    9. Check drizzle.__drizzle_migrations (if backup post-stamp)");
    printLine("   10. Check data_snapshot_version + deleted_row_tombstones");
    printLine("   11. Check brand_voice_notes.source_post_id orphan rows");
    printLine("   12. Check content_posts.status canonical values");
    printLine("   13. Write result to docs/restore-drill-results.jsonl");
    printLine("   14. Update docs/RESTORE.md Drill Log");
    printLine("");
    printLine("  To execute the drill, add --confirm:");
    printLine(
      `    tsx scripts/src/verify-restore.ts --backup ${backupKey === "backups/latest/prod.dump" ? "latest" : backupKey} --target-url <TEST_DATABASE_URL> --confirm`,
    );
    printSep();
    printLine("");
    return;
  }

  // ── Confirmed live drill ───────────────────────────────────────────────────
  printLine("");
  printSep();
  printLine("  Virtu Ferries Brand Hub — Restore Drill");
  printLine(`  Backup   : ${backupKey}`);
  printLine(`  Target   : ${targetInfo.host} / ${targetInfo.dbname}`);
  printLine(`  Time     : ${new Date().toISOString()}`);
  printLine("  CONFIRMED — proceeding with destructive restore.");
  printSep();
  printLine("");

  const bucketName = getBucketName();
  const storage = createStorageClient();
  const pgRestorePath = await findBinary("pg_restore");

  // ── Download and parse manifest ────────────────────────────────────────────
  log("info", "Downloading manifest", { key: manifestKey });
  const manifest = (await downloadJson(storage, bucketName, manifestKey)) as Manifest;

  printLine(`  backup_id   : ${manifest.backup_id}`);
  printLine(`  timestamp   : ${manifest.timestamp}`);
  printLine(`  tables      : ${manifest.table_count}`);
  printLine(`  total_rows  : ${manifest.total_rows}`);
  printLine(`  size_bytes  : ${manifest.dump_size_bytes}`);
  printLine(`  sha256      : ${manifest.sha256_checksum}`);
  printLine(`  integrity   : ${manifest.integrity_check}`);
  printLine("");

  // ── Download dump ──────────────────────────────────────────────────────────
  const tempDumpPath = join(tmpdir(), `vfh-restore-drill-${Date.now()}.dump`);
  log("info", "Downloading dump", { key: backupKey, temp: tempDumpPath });
  await downloadToFile(storage, bucketName, backupKey, tempDumpPath);
  log("info", "Dump downloaded");

  // Track check results for summary
  let sha256Status: "PASS" | "FAIL" = "FAIL";
  let pgRestoreStatus: "COMPLETE" | "FAIL" = "FAIL";
  let rowCountResult = { passed: 0, failed: 0 };
  let tableCountResult = { status: "FAIL" as CheckStatus, restored: 0, expected: manifest.table_count };
  let fkResult = { status: "FAIL" as "PASS" | "FAIL", total: 0 };
  let seqAllOk = false;
  let seqTotal = 0;
  let drizzleResult: { status: CheckStatus; note: string } = {
    status: "FAIL",
    note: "not checked",
  };
  let bootstrapDsv: CheckStatus = "FAIL";
  let bootstrapDrt: CheckStatus = "FAIL";
  let orphanRowsResult: { status: CheckStatus; note: string } = { status: "FAIL", note: "not checked" };
  let statusValuesResult: { status: CheckStatus; note: string } = { status: "FAIL", note: "not checked" };
  let overallPass = false;
  let drillLogged = false;
  let restoreMdUpdated = false;

  try {
    // ── SHA256 verification ──────────────────────────────────────────────────
    log("info", "Verifying SHA256 of downloaded file");
    const localChecksum = await sha256File(tempDumpPath);
    const checksumMatch = localChecksum === manifest.sha256_checksum;
    sha256Status = checksumMatch ? "PASS" : "FAIL";
    printLine(
      `SHA256  : ${sha256Status}` +
        (checksumMatch
          ? ""
          : `\n  expected=${manifest.sha256_checksum}\n  got=${localChecksum}`),
    );
    if (!checksumMatch) {
      throw new Error("SHA256 mismatch — backup file may be corrupted");
    }

    // ── pg_restore ────────────────────────────────────────────────────────────
    log("info", "Running pg_restore against target database");
    await runPgRestore(pgRestorePath, tempDumpPath, targetUrl);
    pgRestoreStatus = "COMPLETE";
    log("info", "pg_restore complete");
    printLine("pg_restore : COMPLETE");
    printLine("");

    // ── Verification checks ──────────────────────────────────────────────────
    const pool = new pg.Pool({ connectionString: targetUrl });

    try {
      // Row counts
      printLine("Row count verification:");
      printLine(
        `${"Table".padEnd(36)} ${"Manifest".padStart(9)} ${"Restored".padStart(9)}  Status`,
      );
      printLine("─".repeat(72));

      const rowCountCheck = await verifyRowCounts(pool, manifest);
      rowCountResult = { passed: rowCountCheck.passed, failed: rowCountCheck.failed };

      for (const r of rowCountCheck.rows) {
        const restoredStr = r.restored >= 0 ? String(r.restored) : "ERROR";
        printLine(
          `${r.table.padEnd(36)} ${String(r.manifest).padStart(9)} ${restoredStr.padStart(9)}  ${r.status}`,
        );
      }
      printLine("─".repeat(72));
      printLine(
        `TOTAL  passed=${rowCountCheck.passed}  failed=${rowCountCheck.failed}`,
      );
      printLine("");

      // Table count
      const tcCheck = await checkTableCount(pool, manifest);
      tableCountResult = {
        status: tcCheck.status,
        restored: tcCheck.restored,
        expected: tcCheck.expected,
      };
      printLine(`Table count : ${tcCheck.status} — ${tcCheck.note}`);
      printLine("");

      // FK constraints
      const fkCheck = await checkFkConstraints(pool);
      fkResult = { status: fkCheck.status, total: fkCheck.total };
      printLine(
        `FK constraints : ${fkCheck.status} — ${fkCheck.total} FK(s)${fkCheck.invalid.length > 0 ? " (INVALID:)" : ""}`,
      );
      for (const inv of fkCheck.invalid) {
        printLine(`  INVALID: ${inv.name}  ${inv.child_table} → ${inv.parent_table}`);
      }
      printLine("");

      // Sequences
      printLine("Sequence check:");
      const seqResults = await checkSequences(pool);
      seqAllOk = seqResults.every((s) => s.ok);
      seqTotal = seqResults.length;
      for (const s of seqResults) {
        const status = s.ok ? "PASS" : "FAIL (sequence behind max_id)";
        printLine(
          `  ${s.table.padEnd(34)} max_id=${s.max_id}  seq=${s.seq_value}  ${status}`,
        );
      }
      printLine("");

      // drizzle schema
      drizzleResult = await checkDrizzleSchema(pool, manifest.timestamp);
      printLine(
        `drizzle schema : ${drizzleResult.status} — ${drizzleResult.note}`,
      );
      printLine("");

      // Bootstrap tables
      const btCheck = await checkBootstrapTables(pool);
      bootstrapDsv = btCheck.data_snapshot_version;
      bootstrapDrt = btCheck.deleted_row_tombstones;
      printLine("Bootstrap tables:");
      for (const note of btCheck.notes) {
        printLine(`  ${note}`);
      }
      printLine("");

      // Orphan rows (brand_voice_notes.source_post_id)
      orphanRowsResult = await checkOrphanRows(pool, manifest.timestamp);
      printLine(`Orphan rows    : ${orphanRowsResult.status} — ${orphanRowsResult.note}`);
      printLine("");

      // Status values (content_posts.status)
      statusValuesResult = await checkStatusValues(pool, manifest.timestamp);
      printLine(`Status values  : ${statusValuesResult.status} — ${statusValuesResult.note}`);
      printLine("");

      // ── Overall result ─────────────────────────────────────────────────────
      const warningStatuses: CheckStatus[] = ["WARN", "SKIPPED"];
      overallPass =
        sha256Status === "PASS" &&
        pgRestoreStatus === "COMPLETE" &&
        rowCountResult.failed === 0 &&
        (tableCountResult.status === "PASS" || warningStatuses.includes(tableCountResult.status)) &&
        fkResult.status === "PASS" &&
        seqAllOk &&
        (drizzleResult.status === "PASS" || warningStatuses.includes(drizzleResult.status)) &&
        (bootstrapDsv === "PASS" || warningStatuses.includes(bootstrapDsv)) &&
        (bootstrapDrt === "PASS" || warningStatuses.includes(bootstrapDrt)) &&
        (orphanRowsResult.status === "PASS" || warningStatuses.includes(orphanRowsResult.status)) &&
        (statusValuesResult.status === "PASS" || warningStatuses.includes(statusValuesResult.status));

      // ── Log result ────────────────────────────────────────────────────────
      const drillResult: DrillResult = {
        date: new Date().toISOString().slice(0, 10),
        backup_id: manifest.backup_id,
        backup_timestamp: manifest.timestamp,
        target_host: targetInfo.host,
        target_dbname: targetInfo.dbname,
        result: overallPass ? "PASS" : "FAIL",
        duration_ms: Date.now() - startMs,
        checks: {
          sha256: sha256Status,
          pg_restore: pgRestoreStatus,
          row_counts: {
            passed: rowCountResult.passed,
            failed: rowCountResult.failed,
            status: rowCountResult.failed === 0 ? "PASS" : "FAIL",
          },
          table_count: tableCountResult.status,
          fk_constraints: fkResult.status,
          sequences: seqAllOk ? "PASS" : "FAIL",
          drizzle_schema: drizzleResult.status,
          data_snapshot_version: bootstrapDsv,
          deleted_row_tombstones: bootstrapDrt,
          orphan_rows: orphanRowsResult.status,
          status_values: statusValuesResult.status,
        },
        tables: manifest.table_count,
        total_rows: manifest.total_rows,
      };

      try {
        await logDrillResult(drillResult);
        drillLogged = true;
      } catch (err) {
        log("warn", "Could not write restore-drill-results.jsonl", {
          error: String(err),
        });
      }

      try {
        await appendRestoreMdRow(drillResult);
        restoreMdUpdated = true;
      } catch (err) {
        log("warn", "Could not update RESTORE.md drill log", {
          error: String(err),
        });
      }
    } finally {
      await pool.end();
    }
  } finally {
    await unlink(tempDumpPath).catch(() => {});
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  printSummary({
    backupId: manifest.backup_id,
    targetHost: targetInfo.host,
    targetDb: targetInfo.dbname,
    durationMs: Date.now() - startMs,
    sha256: sha256Status,
    pgRestore: pgRestoreStatus,
    rowCounts: rowCountResult,
    tableCount: tableCountResult,
    fk: fkResult,
    sequences: { total: seqTotal, allOk: seqAllOk },
    drizzleSchema: drizzleResult,
    bootstrapDsv,
    bootstrapDrt,
    orphanRows: orphanRowsResult,
    statusValues: statusValuesResult,
    overallPass,
    drillLogged,
    restoreMdUpdated,
  });

  if (!overallPass) process.exit(1);
}

main().catch((err: unknown) => {
  log("error", "Restore drill failed", {
    error: String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});
