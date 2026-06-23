/**
 * backup-prod.ts — Production database backup
 *
 * Triggered by the "Backup Scheduler" Replit workflow (daily).
 * Never imported by the api-server.
 *
 * Usage:
 *   tsx scripts/src/backup-prod.ts [--dry-run]
 *
 * Required environment variables:
 *   DATABASE_URL                     — production PostgreSQL connection string
 *   PRIVATE_OBJECT_DIR               — Replit Object Storage path (bucket derived from this)
 */

import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { readFile, unlink, writeFile, access, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import pg from "pg";
import { Storage } from "@google-cloud/storage";
// Google Drive secondary backup — @replit/connectors-sdk (google-drive integration)
import { ReplitConnectors } from "@replit/connectors-sdk";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const RETENTION_DAYS = 30;
const LOCK_PATH = join(tmpdir(), "vfh-backup.lock");
const SIDECAR = "http://127.0.0.1:1106";
const MIN_DUMP_BYTES = 50_000;

const isDryRun = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Structured logging (Pino-compatible JSON)
// ---------------------------------------------------------------------------

function log(
  level: "info" | "warn" | "error",
  msg: string,
  data?: Record<string, unknown>,
): void {
  const entry = {
    level,
    type: "backup",
    msg,
    timestamp: new Date().toISOString(),
    ...data,
  };
  (level === "error" ? console.error : console.log)(JSON.stringify(entry));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TableCount {
  rows: number;
}

interface BackupManifest {
  backup_id: string;
  timestamp: string;
  strategy: string;
  pg_version: string;
  database_url_host: string;
  tables: Record<string, TableCount>;
  table_count: number;
  total_rows: number;
  dump_size_bytes: number;
  sha256_checksum: string;
  duration_ms: number;
  integrity_check: "PASSED" | "FAILED";
  toc_table_count: number;
  missing_from_toc: string[];
  dry_run: boolean;
}

// ---------------------------------------------------------------------------
// Lock (mandatory — exits immediately if another backup is running)
// ---------------------------------------------------------------------------

async function acquireLock(): Promise<void> {
  let exists = false;
  try {
    await access(LOCK_PATH);
    exists = true;
  } catch {
    // ENOENT — no lock, good
  }

  if (exists) {
    const lockStat = await stat(LOCK_PATH);
    const ageMs = Date.now() - lockStat.mtimeMs;
    if (ageMs < 2 * 60 * 60 * 1000) {
      throw new Error(
        `Another backup is already running (lock age: ${Math.round(ageMs / 60000)}m). ` +
          `Remove ${LOCK_PATH} manually only if the previous process is confirmed dead.`,
      );
    }
    log("warn", "Stale lock file detected (>2h old) — removing", {
      lock_path: LOCK_PATH,
      age_minutes: Math.round(ageMs / 60000),
    });
    await unlink(LOCK_PATH);
  }

  await writeFile(LOCK_PATH, String(process.pid), { flag: "wx" });
  log("info", "Lock acquired", { pid: process.pid, lock_path: LOCK_PATH });
}

async function releaseLock(): Promise<void> {
  try {
    await unlink(LOCK_PATH);
  } catch {
    log("warn", "Could not release lock file — may need manual cleanup", {
      lock_path: LOCK_PATH,
    });
  }
}

// ---------------------------------------------------------------------------
// GCS client (identical auth pattern to objectStorage.ts)
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
// Database helpers
// ---------------------------------------------------------------------------

function parseHostFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "unknown";
  }
}

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

async function discoverTables(pool: pg.Pool): Promise<string[]> {
  const { rows } = await pool.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
  );
  return rows.map((r) => r.tablename);
}

async function countAllTablesExact(
  pool: pg.Pool,
  tables: string[],
): Promise<Record<string, TableCount>> {
  const counts: Record<string, TableCount> = {};
  for (const table of tables) {
    const { rows } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM "${table}"`,
    );
    counts[table] = { rows: parseInt(rows[0]!.count, 10) };
  }
  return counts;
}

// ---------------------------------------------------------------------------
// pg_dump / pg_restore helpers
// ---------------------------------------------------------------------------

async function findBinary(name: string): Promise<string> {
  const { stdout } = await execFileAsync("which", [name]);
  const path = stdout.trim();
  if (!path) throw new Error(`${name} not found in PATH`);
  return path;
}

async function getPgDumpVersion(pgDumpPath: string): Promise<string> {
  const { stdout } = await execFileAsync(pgDumpPath, ["--version"]);
  return stdout.trim().replace("pg_dump (PostgreSQL) ", "");
}

async function runPgDump(
  pgDumpPath: string,
  databaseUrl: string,
  outPath: string,
): Promise<void> {
  const conn = parseConnectionParts(databaseUrl);

  // Write .pgpass — keeps credentials out of argv and process list
  const pgpassPath = join(tmpdir(), `vfh-pgpass-${Date.now()}`);
  const pgpassLine = `${conn.host}:${conn.port}:${conn.dbname}:${conn.user}:${conn.password}\n`;
  await writeFile(pgpassPath, pgpassLine, { mode: 0o600 });

  // Build child environment — no PASSWORD in args
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
      pgDumpPath,
      [
        "--format=custom",
        "--no-password",
        "--no-privileges",
        "--no-owner",
        `--file=${outPath}`,
      ],
      { env: childEnv, maxBuffer: 512 * 1024 * 1024 },
    );
  } finally {
    await unlink(pgpassPath).catch(() => {});
  }
}

async function checkTocIntegrity(
  pgRestorePath: string,
  dumpPath: string,
  expectedTables: string[],
): Promise<{
  passed: boolean;
  toc_table_count: number;
  missing_from_toc: string[];
}> {
  try {
    const { stdout } = await execFileAsync(pgRestorePath, [
      "--list",
      dumpPath,
    ]);
    const tocTables = new Set<string>();
    for (const line of stdout.split("\n")) {
      const match = /TABLE DATA public (\S+)/.exec(line);
      if (match?.[1]) tocTables.add(match[1]);
    }
    const missing = expectedTables.filter((t) => !tocTables.has(t));
    return {
      passed: missing.length === 0 && tocTables.size > 0,
      toc_table_count: tocTables.size,
      missing_from_toc: missing,
    };
  } catch (err) {
    log("warn", "pg_restore --list failed", { error: String(err) });
    return {
      passed: false,
      toc_table_count: 0,
      missing_from_toc: expectedTables,
    };
  }
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
// Object Storage operations
// ---------------------------------------------------------------------------

async function uploadStream(
  storage: Storage,
  bucketName: string,
  gcsKey: string,
  readable: NodeJS.ReadableStream,
  contentType: string,
): Promise<void> {
  const file = storage.bucket(bucketName).file(gcsKey);
  await pipeline(
    readable,
    file.createWriteStream({ metadata: { contentType }, resumable: false }),
  );
}

async function uploadFile(
  storage: Storage,
  bucketName: string,
  gcsKey: string,
  localPath: string,
  contentType: string,
): Promise<void> {
  await uploadStream(
    storage,
    bucketName,
    gcsKey,
    createReadStream(localPath),
    contentType,
  );
}

async function uploadJson(
  storage: Storage,
  bucketName: string,
  gcsKey: string,
  data: unknown,
): Promise<void> {
  const buf = Buffer.from(JSON.stringify(data, null, 2), "utf-8");
  await uploadStream(
    storage,
    bucketName,
    gcsKey,
    Readable.from([buf]),
    "application/json",
  );
}

async function postUploadSelfTest(
  storage: Storage,
  bucketName: string,
  gcsKey: string,
  expectedChecksum: string,
  expectedSizeBytes: number,
): Promise<void> {
  const file = storage.bucket(bucketName).file(gcsKey);

  // Step 1 — metadata check
  const [metadata] = await file.getMetadata();
  const remoteSize = metadata.size ? Number(metadata.size) : -1;
  if (remoteSize !== expectedSizeBytes) {
    throw new Error(
      `Post-upload size mismatch: local=${expectedSizeBytes} remote=${remoteSize}`,
    );
  }
  log("info", "Self-test: object metadata verified", {
    gcs_key: gcsKey,
    size_bytes: remoteSize,
  });

  // Step 2 — SHA256 re-computation from GCS download
  const hash = createHash("sha256");
  await new Promise<void>((resolve, reject) => {
    const stream = file.createReadStream();
    stream.on("data", (chunk: Buffer) => hash.update(chunk));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  const remoteChecksum = hash.digest("hex");
  if (remoteChecksum !== expectedChecksum) {
    throw new Error(
      `Post-upload SHA256 mismatch: expected=${expectedChecksum} got=${remoteChecksum}`,
    );
  }
  log("info", "Self-test: SHA256 checksum verified", {
    gcs_key: gcsKey,
    checksum: remoteChecksum,
  });
}

async function listDumpKeys(
  storage: Storage,
  bucketName: string,
): Promise<Array<{ key: string; created: Date }>> {
  const [files] = await storage
    .bucket(bucketName)
    .getFiles({ prefix: "backups/daily/" });
  return files
    .filter((f) => f.name.endsWith(".dump"))
    .map((f) => ({
      key: f.name,
      created: new Date(f.metadata["timeCreated"] as string),
    }))
    .sort((a, b) => a.created.getTime() - b.created.getTime());
}

async function pruneOldBackups(
  storage: Storage,
  bucketName: string,
): Promise<number> {
  const dumps = await listDumpKeys(storage, bucketName);
  if (dumps.length <= RETENTION_DAYS) return 0;

  const toDelete = dumps.slice(0, dumps.length - RETENTION_DAYS);
  const bucket = storage.bucket(bucketName);
  let deleted = 0;

  for (const { key } of toDelete) {
    await bucket.file(key).delete({ ignoreNotFound: true });
    await bucket
      .file(key.replace(".dump", ".manifest.json"))
      .delete({ ignoreNotFound: true });
    log("info", "Pruned old backup", { key });
    deleted++;
  }
  return deleted;
}

// ---------------------------------------------------------------------------
// Google Drive secondary backup (via @replit/connectors-sdk)
// ---------------------------------------------------------------------------

const DRIVE_FOLDER_NAME = "157Media DB Backups";
const DRIVE_RETENTION_COUNT = 30;

async function driveGetOrCreateFolder(connectors: ReplitConnectors): Promise<string> {
  const query = `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const listRes = await connectors.proxy(
    "google-drive",
    `/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
    { method: "GET" },
  );
  if (!listRes.ok) {
    throw new Error(`Drive folder search failed: HTTP ${listRes.status}`);
  }
  const listData = (await listRes.json()) as { files: Array<{ id: string; name: string }> };
  if (listData.files.length > 0) return listData.files[0]!.id;

  const createRes = await connectors.proxy("google-drive", "/drive/v3/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!createRes.ok) {
    throw new Error(`Drive folder creation failed: HTTP ${createRes.status}`);
  }
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

async function driveUploadFile(
  connectors: ReplitConnectors,
  localPath: string,
  fileName: string,
  folderId: string,
): Promise<string> {
  const fileContent = await readFile(localPath);
  const boundary = `vfh_backup_${Date.now()}`;
  const metadata = JSON.stringify({ name: fileName, parents: [folderId] });

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
        `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
    ),
    fileContent,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const uploadRes = await connectors.proxy(
    "google-drive",
    `/upload/drive/v3/files?uploadType=multipart&fields=id,name`,
    {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`Drive upload failed: HTTP ${uploadRes.status} — ${text}`);
  }
  const uploaded = (await uploadRes.json()) as { id: string; name: string };
  return uploaded.id;
}

async function drivePruneOldBackups(connectors: ReplitConnectors, folderId: string): Promise<number> {
  const query = `'${folderId}' in parents and name contains '.dump' and trashed=false`;
  const listRes = await connectors.proxy(
    "google-drive",
    `/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime)&orderBy=createdTime`,
    { method: "GET" },
  );
  if (!listRes.ok) return 0;

  const listData = (await listRes.json()) as { files: Array<{ id: string; name: string; createdTime: string }> };
  const files = listData.files.sort((a, b) => a.createdTime.localeCompare(b.createdTime));
  if (files.length <= DRIVE_RETENTION_COUNT) return 0;

  const toDelete = files.slice(0, files.length - DRIVE_RETENTION_COUNT);
  let deleted = 0;
  for (const file of toDelete) {
    const delRes = await connectors.proxy("google-drive", `/drive/v3/files/${file.id}`, { method: "DELETE" });
    if (delRes.ok || delRes.status === 204) {
      log("info", "Pruned old Drive backup", { file_name: file.name });
      deleted++;
    }
  }
  return deleted;
}

async function backupToGoogleDrive(localPath: string, fileName: string): Promise<void> {
  const connectors = new ReplitConnectors();
  const folderId = await driveGetOrCreateFolder(connectors);
  log("info", "Drive backup folder ready", { folder_name: DRIVE_FOLDER_NAME, folder_id: folderId });

  const fileId = await driveUploadFile(connectors, localPath, fileName, folderId);
  log("info", "Drive backup uploaded", { file_id: fileId, file_name: fileName });

  const pruned = await drivePruneOldBackups(connectors, folderId);
  if (pruned > 0) log("info", `Pruned ${pruned} old Drive backup(s)`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const startMs = Date.now();

  log("info", isDryRun ? "Starting backup (DRY RUN)" : "Starting backup");

  // --- Preflight checks ---
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const bucketName = getBucketName();
  log("info", "GCS bucket resolved", { bucket: bucketName });

  const pgDumpPath = await findBinary("pg_dump");
  const pgRestorePath = await findBinary("pg_restore");
  const pgVersion = await getPgDumpVersion(pgDumpPath);
  log("info", "pg_dump located", { path: pgDumpPath, version: pgVersion });

  // --- Acquire lock (mandatory — throws if already locked) ---
  await acquireLock();

  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/:/g, "-")
    .replace(/\.\d{3}Z$/, "Z");
  const backupId = `prod-${timestamp}`;
  const tempDumpPath = join(tmpdir(), `${backupId}.dump`);
  const dumpKey = `backups/daily/${backupId}.dump`;
  const manifestKey = `backups/daily/${backupId}.manifest.json`;

  try {
    // --- Exact row counts for all tables ---
    log("info", "Counting rows (exact COUNT(*) for all tables)");
    const pool = new pg.Pool({ connectionString: databaseUrl });
    let tables: string[];
    let tableCounts: Record<string, TableCount>;

    try {
      tables = await discoverTables(pool);
      log("info", `Discovered ${tables.length} user tables`);

      if (isDryRun) {
        log("info", "DRY RUN: row discovery complete, skipping dump and upload");
        for (const t of tables) log("info", `  table: ${t}`);
        return;
      }

      tableCounts = await countAllTablesExact(pool, tables);
      const totalRows = Object.values(tableCounts).reduce(
        (s, t) => s + t.rows,
        0,
      );
      log("info", "Row counts complete", {
        table_count: tables.length,
        total_rows: totalRows,
      });
    } finally {
      await pool.end();
    }

    // --- pg_dump ---
    log("info", "Running pg_dump", { out: tempDumpPath });
    await runPgDump(pgDumpPath, databaseUrl, tempDumpPath);
    log("info", "pg_dump complete");

    // --- Size + SHA256 ---
    const dumpStat = await stat(tempDumpPath);
    const dumpSizeBytes = dumpStat.size;
    if (dumpSizeBytes < MIN_DUMP_BYTES) {
      throw new Error(
        `Dump file suspiciously small: ${dumpSizeBytes} bytes (min: ${MIN_DUMP_BYTES})`,
      );
    }

    log("info", "Computing SHA256 checksum");
    const sha256Checksum = await sha256File(tempDumpPath);
    log("info", "SHA256 computed", { checksum: sha256Checksum, size_bytes: dumpSizeBytes });

    // --- Integrity check (pg_restore --list) ---
    log("info", "Running integrity check (pg_restore --list)");
    const integrity = await checkTocIntegrity(
      pgRestorePath,
      tempDumpPath,
      tables,
    );
    const integrityStatus = integrity.passed ? "PASSED" : "FAILED";
    log(integrity.passed ? "info" : "warn", `Integrity check: ${integrityStatus}`, {
      toc_table_count: integrity.toc_table_count,
      missing_from_toc: integrity.missing_from_toc,
    });

    // --- Build manifest ---
    const totalRows = Object.values(tableCounts).reduce(
      (s, t) => s + t.rows,
      0,
    );
    const manifest: BackupManifest = {
      backup_id: backupId,
      timestamp: now.toISOString(),
      strategy: "pg_dump --format=custom --no-owner --no-privileges",
      pg_version: pgVersion,
      database_url_host: parseHostFromUrl(databaseUrl),
      tables: tableCounts,
      table_count: tables.length,
      total_rows: totalRows,
      dump_size_bytes: dumpSizeBytes,
      sha256_checksum: sha256Checksum,
      duration_ms: 0,
      integrity_check: integrityStatus,
      toc_table_count: integrity.toc_table_count,
      missing_from_toc: integrity.missing_from_toc,
      dry_run: false,
    };

    // --- Upload dump ---
    const storage = createStorageClient();

    log("info", "Uploading dump", { key: dumpKey });
    await uploadFile(
      storage,
      bucketName,
      dumpKey,
      tempDumpPath,
      "application/octet-stream",
    );
    log("info", "Dump uploaded");

    // --- Post-upload self-test: metadata + SHA256 ---
    log("info", "Running post-upload self-test");
    await postUploadSelfTest(
      storage,
      bucketName,
      dumpKey,
      sha256Checksum,
      dumpSizeBytes,
    );
    log("info", "Post-upload self-test PASSED");

    // --- Upload manifest ---
    log("info", "Uploading manifest", { key: manifestKey });
    await uploadJson(storage, bucketName, manifestKey, manifest);
    log("info", "Manifest uploaded");

    // --- Update latest/ pointers ---
    log("info", "Updating latest/ pointers");
    await uploadFile(
      storage,
      bucketName,
      "backups/latest/prod.dump",
      tempDumpPath,
      "application/octet-stream",
    );
    manifest.duration_ms = Date.now() - startMs;
    await uploadJson(storage, bucketName, "backups/latest/prod.manifest.json", manifest);
    log("info", "latest/ pointers updated");

    // --- Prune ---
    log("info", "Pruning old backups", { retention_days: RETENTION_DAYS });
    const pruned = await pruneOldBackups(storage, bucketName);
    log("info", `Pruned ${pruned} old backup(s)`);

    // --- Google Drive secondary backup (non-fatal) ---
    log("info", "Starting Google Drive secondary backup");
    try {
      await backupToGoogleDrive(tempDumpPath, `${backupId}.dump`);
      log("info", "Google Drive secondary backup complete");
    } catch (driveErr) {
      log("warn", "Google Drive backup failed (non-fatal — primary GCS backup succeeded)", {
        error: String(driveErr),
        stack: driveErr instanceof Error ? driveErr.stack : undefined,
      });
    }

    manifest.duration_ms = Date.now() - startMs;
    log("info", "Backup complete", {
      backup_id: backupId,
      dump_size_bytes: dumpSizeBytes,
      total_rows: totalRows,
      table_count: tables.length,
      sha256_checksum: sha256Checksum,
      integrity_check: integrityStatus,
      duration_ms: manifest.duration_ms,
    });
  } finally {
    await unlink(tempDumpPath).catch(() => {});
    await releaseLock();
  }
}

main().catch((err: unknown) => {
  log("error", "Backup failed", {
    error: String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  process.exit(1);
});
