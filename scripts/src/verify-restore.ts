/**
 * verify-restore.ts — Quarterly restore drill
 *
 * Downloads a backup from Object Storage, restores it to a test database,
 * and verifies row counts match the backup manifest.
 *
 * Run against a TEMPORARY test database — NEVER against production.
 *
 * Usage:
 *   tsx scripts/src/verify-restore.ts --backup latest --target-url <TEST_DATABASE_URL>
 *   tsx scripts/src/verify-restore.ts \
 *       --backup backups/daily/prod-2026-06-07T14-00-00Z.dump \
 *       --target-url <TEST_DATABASE_URL>
 *
 * Required environment variables:
 *   PRIVATE_OBJECT_DIR  — Replit Object Storage path (used to derive bucket name)
 *
 * Optional environment variables:
 *   TARGET_DATABASE_URL — alternative to --target-url flag
 */

import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pipeline } from "node:stream/promises";
import pg from "pg";
import { Storage } from "@google-cloud/storage";

const execFileAsync = promisify(execFile);
const SIDECAR = "http://127.0.0.1:1106";

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

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): { backupKey: string; manifestKey: string; targetUrl: string } {
  const args = process.argv.slice(2);
  const backupIdx = args.indexOf("--backup");
  const urlIdx = args.indexOf("--target-url");

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
      "Missing --target-url argument or TARGET_DATABASE_URL env var. " +
        "Provide a test database URL — NEVER use your production DATABASE_URL here.",
    );
  }

  const backupKey =
    backup === "latest" ? "backups/latest/prod.dump" : backup;
  const manifestKey = backup === "latest"
    ? "backups/latest/prod.manifest.json"
    : backup.replace(/\.dump$/, ".manifest.json");

  return { backupKey, manifestKey, targetUrl };
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
// Verification
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { backupKey, manifestKey, targetUrl } = parseArgs();
  const targetConn = parseConnectionParts(targetUrl);

  printLine("");
  printLine("═══════════════════════════════════════════════════════════");
  printLine("  Virtu Ferries Brand Hub — Restore Drill");
  printLine(`  Backup   : ${backupKey}`);
  printLine(`  Target   : ${targetConn.host} / ${targetConn.dbname}`);
  printLine(`  Time     : ${new Date().toISOString()}`);
  printLine("═══════════════════════════════════════════════════════════");
  printLine("");

  const bucketName = getBucketName();
  const storage = createStorageClient();
  const pgRestorePath = await findBinary("pg_restore");

  // --- Download and parse manifest ---
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

  // --- Download dump to temp file ---
  const tempDumpPath = join(tmpdir(), `vfh-restore-drill-${Date.now()}.dump`);
  log("info", "Downloading dump", { key: backupKey, temp: tempDumpPath });
  await downloadToFile(storage, bucketName, backupKey, tempDumpPath);
  log("info", "Dump downloaded");

  try {
    // --- SHA256 verification ---
    log("info", "Verifying SHA256 of downloaded file");
    const localChecksum = await sha256File(tempDumpPath);
    const checksumMatch = localChecksum === manifest.sha256_checksum;
    printLine(
      `SHA256  : ${checksumMatch ? "PASS" : "FAIL"}` +
        (checksumMatch ? "" : `\n  expected=${manifest.sha256_checksum}\n  got=${localChecksum}`),
    );
    if (!checksumMatch) {
      throw new Error("SHA256 mismatch — backup file may be corrupted");
    }

    // --- pg_restore ---
    log("info", "Running pg_restore against target database");
    await runPgRestore(pgRestorePath, tempDumpPath, targetUrl);
    log("info", "pg_restore complete");
    printLine("pg_restore : COMPLETE");
    printLine("");

    // --- Row count verification ---
    printLine("Row count verification:");
    printLine(
      `${"Table".padEnd(36)} ${"Manifest".padStart(9)} ${"Restored".padStart(9)}  Status`,
    );
    printLine("─".repeat(72));

    const pool = new pg.Pool({ connectionString: targetUrl });
    let overallPass = true;

    try {
      const { passed, failed, rows } = await verifyRowCounts(pool, manifest);

      for (const r of rows) {
        const restoredStr = r.restored >= 0 ? String(r.restored) : "ERROR";
        printLine(
          `${r.table.padEnd(36)} ${String(r.manifest).padStart(9)} ${restoredStr.padStart(9)}  ${r.status}`,
        );
        if (r.status !== "PASS") overallPass = false;
      }

      printLine("─".repeat(72));
      printLine(`TOTAL  passed=${passed}  failed=${failed}`);
      printLine("");

      // --- Sequence check ---
      printLine("Sequence check:");
      const seqResults = await checkSequences(pool);
      for (const s of seqResults) {
        const status = s.ok ? "PASS" : "FAIL (sequence behind max_id)";
        printLine(
          `  ${s.table.padEnd(34)} max_id=${s.max_id}  seq=${s.seq_value}  ${status}`,
        );
        if (!s.ok) overallPass = false;
      }
      printLine("");

      // --- Summary ---
      printLine("═══════════════════════════════════════════════════════════");
      const overallStatus = overallPass ? "PASS ✓" : "FAIL ✗";
      printLine(`  OVERALL RESULT: ${overallStatus}`);
      if (overallPass) {
        printLine("  Record this result in docs/RESTORE.md with today's date.");
      } else {
        printLine("  One or more checks failed — do not use this backup for production restore.");
      }
      printLine("═══════════════════════════════════════════════════════════");
      printLine("");

      if (!overallPass) process.exit(1);
    } finally {
      await pool.end();
    }
  } finally {
    await unlink(tempDumpPath).catch(() => {});
  }
}

main().catch((err: unknown) => {
  log("error", "Restore drill failed", {
    error: String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});
