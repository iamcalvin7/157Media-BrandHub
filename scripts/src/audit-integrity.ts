/**
 * audit-integrity.ts — Read-only database integrity audit
 *
 * Checks data integrity, referential consistency, enum value canonicality,
 * sequence safety, missing indexes, and FK coverage against the target DB.
 *
 * Exit codes:
 *   0 — all checks PASS or WARN
 *   1 — one or more checks FAIL
 *
 * Usage:
 *   tsx scripts/src/audit-integrity.ts
 *
 * Required environment variable:
 *   DATABASE_URL — connection string for the database to audit
 *
 * This script is READ-ONLY. It never modifies data or schema.
 */

import pg from "pg";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CheckStatus = "PASS" | "WARN" | "FAIL";

interface CheckResult {
  status: CheckStatus;
  detail: string;
}

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

function getPool(): pg.Pool {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL environment variable is required");
  return new pg.Pool({ connectionString: url, max: 3 });
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

const SEP_WIDE = "═".repeat(65);
const SEP_THIN = "─".repeat(65);

function printLine(s: string): void {
  console.log(s);
}

const COUNTS: Record<CheckStatus, number> = { PASS: 0, WARN: 0, FAIL: 0 };

function printCheck(
  num: number,
  total: number,
  name: string,
  result: CheckResult,
): void {
  COUNTS[result.status]++;
  const label = `[${String(num).padStart(2)}/${total}] ${name}`;
  const prefix = result.status === "FAIL" ? "FAIL " : result.status === "WARN" ? "WARN " : "PASS ";
  printLine(`${label.padEnd(48)} ${prefix}`);
  for (const line of result.detail.split("\n")) {
    if (line.trim()) printLine(`       ${line}`);
  }
}

// ---------------------------------------------------------------------------
// Check 1 — Brand ID orphans (21 brand-scoped tables)
// ---------------------------------------------------------------------------

const BRAND_SCOPED_TABLES = [
  "brand_prints",
  "brand_templates",
  "brand_voice_notes",
  "changelog_entries",
  "content_ideas",
  "content_posts",
  "conversations",
  "copywriter_feedback",
  "copywriter_rules",
  "events",
  "media_assets",
  "nico_links",
  "past_posts",
  "pillars",
  "reposts",
  "saved_items",
  "scraper_jobs",
  "share_post_feedback",
  "shared_collections",
  "team_members",
  "voice_profiles",
] as const;

async function checkBrandIdOrphans(pool: pg.Pool): Promise<CheckResult> {
  const failures: string[] = [];
  for (const table of BRAND_SCOPED_TABLES) {
    const { rows } = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM "${table}" WHERE brand_id NOT IN (SELECT id FROM brands)`,
    );
    const n = parseInt(rows[0]!.n, 10);
    if (n > 0) failures.push(`${table}: ${n} orphan row(s)`);
  }
  if (failures.length === 0) {
    return {
      status: "PASS",
      detail: `All ${BRAND_SCOPED_TABLES.length} brand-scoped tables: 0 orphan rows`,
    };
  }
  return {
    status: "FAIL",
    detail:
      `brand_id orphans found (brand_id not in brands.id):\n` +
      failures.map((f) => `  ${f}`).join("\n"),
  };
}

// ---------------------------------------------------------------------------
// Check 2 — brand_voice_notes.source_post_id orphans
// ---------------------------------------------------------------------------

async function checkSourcePostIdOrphans(pool: pg.Pool): Promise<CheckResult> {
  const { rows } = await pool.query<{ id: number; source_post_id: number }>(
    `SELECT id, source_post_id
     FROM brand_voice_notes
     WHERE source_post_id IS NOT NULL
       AND source_post_id NOT IN (SELECT id FROM content_posts)
     ORDER BY id`,
  );
  if (rows.length === 0) {
    return {
      status: "PASS",
      detail: "brand_voice_notes.source_post_id: 0 orphan rows",
    };
  }
  return {
    status: "WARN",
    detail:
      `brand_voice_notes.source_post_id: ${rows.length} orphan row(s)\n` +
      rows
        .map((r) => `  bvn.id=${r.id} → source_post_id=${r.source_post_id} (not in content_posts)`)
        .join("\n") +
      `\n→ Cleanup scheduled for W1.D2: SET source_post_id = NULL WHERE source_post_id = 48`,
  };
}

// ---------------------------------------------------------------------------
// Check 3 — share_post_feedback.post_id orphans
// ---------------------------------------------------------------------------

async function checkShareFeedbackOrphans(pool: pg.Pool): Promise<CheckResult> {
  const { rows } = await pool.query<{ id: number; post_id: number }>(
    `SELECT id, post_id FROM share_post_feedback
     WHERE post_id NOT IN (SELECT id FROM content_posts)
     ORDER BY id`,
  );
  if (rows.length === 0) {
    return {
      status: "PASS",
      detail: "share_post_feedback.post_id: 0 orphan rows",
    };
  }
  return {
    status: "FAIL",
    detail:
      `share_post_feedback.post_id: ${rows.length} orphan row(s)\n` +
      rows.map((r) => `  id=${r.id}, post_id=${r.post_id}`).join("\n"),
  };
}

// ---------------------------------------------------------------------------
// Check 4 — approval_decisions.post_id orphans
// ---------------------------------------------------------------------------

async function checkApprovalDecisionOrphans(pool: pg.Pool): Promise<CheckResult> {
  const { rows: totalRows } = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM approval_decisions`,
  );
  const totalN = parseInt(totalRows[0]!.n, 10);

  if (totalN === 0) {
    return {
      status: "PASS",
      detail: "approval_decisions: 0 rows — no orphan check needed",
    };
  }

  const { rows } = await pool.query<{ id: number; post_id: number }>(
    `SELECT id, post_id FROM approval_decisions
     WHERE post_id IS NOT NULL
       AND post_id NOT IN (SELECT id FROM content_posts)
     ORDER BY id`,
  );
  if (rows.length === 0) {
    return {
      status: "PASS",
      detail: `approval_decisions.post_id: 0 orphan rows (${totalN} total)`,
    };
  }
  return {
    status: "FAIL",
    detail:
      `approval_decisions.post_id: ${rows.length} orphan row(s)\n` +
      rows.map((r) => `  id=${r.id}, post_id=${r.post_id}`).join("\n"),
  };
}

// ---------------------------------------------------------------------------
// Check 5 — content_posts.status canonical values
// ---------------------------------------------------------------------------

const VALID_POST_STATUSES = new Set([
  "pending",
  "approved",
  "posted",
  "scheduled",
  "skipped",
  "draft",
]);

async function checkContentPostsStatus(pool: pg.Pool): Promise<CheckResult> {
  const { rows } = await pool.query<{ status: string; n: string }>(
    `SELECT status, count(*)::text AS n FROM content_posts GROUP BY status ORDER BY status`,
  );
  const invalid = rows.filter((r) => !VALID_POST_STATUSES.has(r.status));
  const summary = rows.map((r) => `${r.status}(${r.n})`).join(", ");
  if (invalid.length === 0) {
    return {
      status: "PASS",
      detail: `All content_posts.status values are canonical\nValues: ${summary}`,
    };
  }
  return {
    status: "WARN",
    detail:
      `Non-canonical status value(s) found:\n` +
      invalid.map((r) => `  "${r.status}": ${r.n} row(s)`).join("\n") +
      `\nAll values: ${summary}` +
      `\nCanonical set: ${[...VALID_POST_STATUSES].join(", ")}` +
      `\n→ Cleanup scheduled for W1.D2: UPDATE content_posts SET status = lower(status) WHERE status != lower(status)`,
  };
}

// ---------------------------------------------------------------------------
// Check 6 — events.market canonical values
// ---------------------------------------------------------------------------

const VALID_MARKETS = new Set(["both", "Italian", "English"]);

async function checkEventsMarket(pool: pg.Pool): Promise<CheckResult> {
  const { rows } = await pool.query<{ market: string; n: string }>(
    `SELECT market, count(*)::text AS n FROM events GROUP BY market ORDER BY market`,
  );
  const invalid = rows.filter((r) => !VALID_MARKETS.has(r.market));
  const summary = rows.map((r) => `${r.market}(${r.n})`).join(", ");
  if (invalid.length === 0) {
    return {
      status: "PASS",
      detail: `All events.market values are canonical\nValues: ${summary}`,
    };
  }
  return {
    status: "WARN",
    detail:
      `Non-canonical market value(s) found:\n` +
      invalid.map((r) => `  "${r.market}": ${r.n} row(s) — expected title-case`).join("\n") +
      `\nAll values: ${summary}` +
      `\nCanonical set: ${[...VALID_MARKETS].join(", ")}` +
      `\n→ Cleanup scheduled for W1.D2: UPDATE events SET market = initcap(market) WHERE market != initcap(market)`,
  };
}

// ---------------------------------------------------------------------------
// Check 7 — events.type canonical values
// ---------------------------------------------------------------------------

const VALID_EVENT_TYPES = new Set([
  "brand_event",
  "cultural",
  "festival",
  "public_holiday",
  "seasonal",
]);

async function checkEventsType(pool: pg.Pool): Promise<CheckResult> {
  const { rows } = await pool.query<{ type: string; n: string }>(
    `SELECT type, count(*)::text AS n FROM events GROUP BY type ORDER BY type`,
  );
  const invalid = rows.filter((r) => !VALID_EVENT_TYPES.has(r.type));
  const summary = rows.map((r) => `${r.type}(${r.n})`).join(", ");
  if (invalid.length === 0) {
    return {
      status: "PASS",
      detail: `All events.type values are canonical\nValues: ${summary}`,
    };
  }
  return {
    status: "FAIL",
    detail:
      `Non-canonical event type(s) found:\n` +
      invalid.map((r) => `  "${r.type}": ${r.n} row(s)`).join("\n") +
      `\nAll values: ${summary}` +
      `\nCanonical set: ${[...VALID_EVENT_TYPES].join(", ")}`,
  };
}

// ---------------------------------------------------------------------------
// Check 8 — Sequence safety (seq_last_value >= max(id))
// ---------------------------------------------------------------------------

async function checkSequenceSafety(pool: pg.Pool): Promise<CheckResult> {
  const { rows: seqRows } = await pool.query<{
    sequencename: string;
    last_value: string;
  }>(`SELECT sequencename, last_value FROM pg_sequences WHERE schemaname = 'public'`);

  const failures: string[] = [];
  const detail: string[] = [];

  for (const { sequencename, last_value } of seqRows) {
    const tableName = sequencename.replace(/_id_seq$/, "");
    const seqVal = Number(last_value);
    try {
      const { rows } = await pool.query<{ max_id: string }>(
        `SELECT COALESCE(MAX(id), 0)::text AS max_id FROM "${tableName}"`,
      );
      const maxId = parseInt(rows[0]!.max_id, 10);
      const ok = seqVal >= maxId;
      detail.push(
        `${tableName.padEnd(34)} max_id=${String(maxId).padStart(4)}  seq=${String(seqVal).padStart(4)}  ${ok ? "OK" : "BEHIND"}`,
      );
      if (!ok) failures.push(`${tableName}: seq=${seqVal} < max_id=${maxId}`);
    } catch {
      // Table does not have an id column — skip
    }
  }

  if (failures.length === 0) {
    return {
      status: "PASS",
      detail:
        `All ${detail.length} sequence(s) are ≥ max(id)\n` + detail.join("\n"),
    };
  }
  return {
    status: "FAIL",
    detail:
      `${failures.length} sequence(s) behind their table's max(id):\n` +
      failures.map((f) => `  ${f}`).join("\n") +
      `\nFull sequence table:\n` +
      detail.join("\n") +
      `\n→ Fix: SELECT setval(pg_get_serial_sequence('<table>','id'), MAX(id)) FROM "<table>"`,
  };
}

// ---------------------------------------------------------------------------
// Check 9 — Missing recommended indexes
// ---------------------------------------------------------------------------

const RECOMMENDED_INDEXES: Array<{
  name: string;
  table: string;
  columns: string;
  priority: string;
}> = [
  {
    name: "content_posts_brand_idx",
    table: "content_posts",
    columns: "(brand_id)",
    priority: "HIGH — primary calendar table",
  },
  {
    name: "brand_voice_notes_brand_idx",
    table: "brand_voice_notes",
    columns: "(brand_id)",
    priority: "HIGH — queried on every AI call",
  },
  {
    name: "past_posts_brand_idx",
    table: "past_posts",
    columns: "(brand_id)",
    priority: "HIGH — read-heavy archive",
  },
  {
    name: "events_brand_idx",
    table: "events",
    columns: "(brand_id)",
    priority: "HIGH — loaded on every calendar page",
  },
  {
    name: "brand_voice_notes_source_post_idx",
    table: "brand_voice_notes",
    columns: "(source_post_id)",
    priority: "HIGH — required before FK constraint",
  },
  {
    name: "copywriter_feedback_brand_idx",
    table: "copywriter_feedback",
    columns: "(brand_id)",
    priority: "MEDIUM",
  },
  {
    name: "conversations_brand_idx",
    table: "conversations",
    columns: "(brand_id)",
    priority: "MEDIUM",
  },
  {
    name: "content_ideas_brand_idx",
    table: "content_ideas",
    columns: "(brand_id)",
    priority: "MEDIUM",
  },
  {
    name: "saved_items_brand_idx",
    table: "saved_items",
    columns: "(brand_id)",
    priority: "MEDIUM",
  },
  {
    name: "media_assets_brand_idx",
    table: "media_assets",
    columns: "(brand_id)",
    priority: "MEDIUM",
  },
  {
    name: "approval_decisions_post_idx",
    table: "approval_decisions",
    columns: "(post_id)",
    priority: "MEDIUM — supports existing FK",
  },
  {
    name: "copywriter_rules_brand_idx",
    table: "copywriter_rules",
    columns: "(brand_id)",
    priority: "LOW",
  },
  {
    name: "reposts_brand_idx",
    table: "reposts",
    columns: "(brand_id)",
    priority: "LOW",
  },
  {
    name: "nico_links_brand_idx",
    table: "nico_links",
    columns: "(brand_id)",
    priority: "LOW",
  },
  {
    name: "shared_collections_brand_idx",
    table: "shared_collections",
    columns: "(brand_id)",
    priority: "LOW",
  },
];

async function checkMissingIndexes(pool: pg.Pool): Promise<CheckResult> {
  const { rows: existingRows } = await pool.query<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`,
  );
  const existing = new Set(existingRows.map((r) => r.indexname));

  const present = RECOMMENDED_INDEXES.filter((idx) => existing.has(idx.name));
  const missing = RECOMMENDED_INDEXES.filter((idx) => !existing.has(idx.name));

  if (missing.length === 0) {
    return {
      status: "PASS",
      detail: `All ${RECOMMENDED_INDEXES.length} recommended indexes are present`,
    };
  }

  const presentStr =
    present.length > 0
      ? `\nAlready present (${present.length}): ${present.map((i) => i.name).join(", ")}`
      : "";

  return {
    status: "WARN",
    detail:
      `${missing.length}/${RECOMMENDED_INDEXES.length} recommended index(es) missing:\n` +
      missing
        .map(
          (idx) =>
            `  CREATE INDEX CONCURRENTLY ${idx.name}\n` +
            `    ON ${idx.table} ${idx.columns}  [${idx.priority}]`,
        )
        .join("\n") +
      presentStr +
      `\n→ Add via W1.D2 migration (drizzle-kit generate → migrate)`,
  };
}

// ---------------------------------------------------------------------------
// Check 10 — FK coverage
// ---------------------------------------------------------------------------

async function checkFkCoverage(pool: pg.Pool): Promise<CheckResult> {
  const { rows: fkRows } = await pool.query<{
    child_table: string;
    column_name: string;
    parent_table: string;
    delete_rule: string;
  }>(
    `SELECT
       kcu.table_name  AS child_table,
       kcu.column_name,
       ccu.table_name  AS parent_table,
       rc.delete_rule
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
     JOIN information_schema.referential_constraints rc
       ON tc.constraint_name = rc.constraint_name
     JOIN information_schema.constraint_column_usage ccu
       ON rc.unique_constraint_name = ccu.constraint_name
     WHERE tc.table_schema = 'public'
       AND tc.constraint_type = 'FOREIGN KEY'
     ORDER BY kcu.table_name, kcu.column_name`,
  );

  const tablesWithBrandFk = new Set(
    fkRows
      .filter((r) => r.column_name === "brand_id" && r.parent_table === "brands")
      .map((r) => r.child_table),
  );

  const missingBrandFk = BRAND_SCOPED_TABLES.filter(
    (t) => !tablesWithBrandFk.has(t),
  );

  const existingLines = fkRows.map(
    (fk) =>
      `  ${fk.child_table}.${fk.column_name} → ${fk.parent_table}.id  [ON DELETE ${fk.delete_rule}]`,
  );

  if (missingBrandFk.length === 0) {
    return {
      status: "PASS",
      detail:
        `All brand-scoped tables have brand_id FK to brands.id\n` +
        `Existing FKs (${fkRows.length}):\n` +
        existingLines.join("\n"),
    };
  }

  const missingBrandLines = missingBrandFk.map(
    (t) => `  ${t}.brand_id → brands.id  [ON DELETE RESTRICT]  ← missing`,
  );

  const missingOtherLines = [
    "  brand_voice_notes.source_post_id → content_posts.id  [ON DELETE SET NULL]  ← missing",
    "  share_post_feedback.post_id → content_posts.id  [ON DELETE CASCADE]  ← missing",
  ];

  return {
    status: "WARN",
    detail:
      `Existing FKs (${fkRows.length}):\n` +
      existingLines.join("\n") +
      `\n\nMissing brand_id FKs (${missingBrandFk.length} tables):\n` +
      missingBrandLines.join("\n") +
      `\n\nMissing cross-table FKs:\n` +
      missingOtherLines.join("\n") +
      `\n\n→ All ${missingBrandFk.length + 2} missing FKs scheduled for W1.D2 migration`,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const startMs = Date.now();
  const pool = getPool();

  let dbInfo = "unknown";
  try {
    const { rows } = await pool.query<{ addr: string; db: string }>(
      `SELECT inet_server_addr()::text AS addr, current_database() AS db`,
    );
    dbInfo = `${rows[0]?.addr ?? "?"} / ${rows[0]?.db ?? "?"}`;
  } catch {
    // Non-fatal — continue without host info
  }

  const checks: Array<{
    name: string;
    fn: () => Promise<CheckResult>;
  }> = [
    { name: "Brand ID Orphans", fn: () => checkBrandIdOrphans(pool) },
    { name: "source_post_id Orphans", fn: () => checkSourcePostIdOrphans(pool) },
    { name: "share_post_feedback.post_id Orphans", fn: () => checkShareFeedbackOrphans(pool) },
    { name: "approval_decisions.post_id Orphans", fn: () => checkApprovalDecisionOrphans(pool) },
    { name: "content_posts.status Values", fn: () => checkContentPostsStatus(pool) },
    { name: "events.market Values", fn: () => checkEventsMarket(pool) },
    { name: "events.type Values", fn: () => checkEventsType(pool) },
    { name: "Sequence Safety", fn: () => checkSequenceSafety(pool) },
    { name: "Missing Recommended Indexes", fn: () => checkMissingIndexes(pool) },
    { name: "FK Coverage", fn: () => checkFkCoverage(pool) },
  ];

  const TOTAL = checks.length;

  printLine("");
  printLine(SEP_WIDE);
  printLine("  Virtu Ferries Brand Hub — Integrity Audit");
  printLine(`  Time : ${new Date().toISOString()}`);
  printLine(`  DB   : ${dbInfo}`);
  printLine(SEP_WIDE);
  printLine("");

  const results: CheckResult[] = [];
  for (let i = 0; i < checks.length; i++) {
    const { name, fn } = checks[i]!;
    let result: CheckResult;
    try {
      result = await fn();
    } catch (err) {
      result = { status: "FAIL", detail: `Check threw an error: ${String(err)}` };
    }
    results.push(result);
    printCheck(i + 1, TOTAL, name, result);
    printLine("");
  }

  await pool.end();

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
  const anyFail = results.some((r) => r.status === "FAIL");
  const anyWarn = results.some((r) => r.status === "WARN");
  const overallStr = anyFail
    ? "FAIL ✗"
    : anyWarn
      ? "PASS (warnings present — see above)"
      : "PASS ✓";

  printLine(SEP_WIDE);
  printLine("  AUDIT SUMMARY");
  printLine(SEP_THIN);
  printLine(`  Checks   : ${TOTAL}`);
  printLine(`  PASS     : ${COUNTS.PASS}`);
  printLine(`  WARN     : ${COUNTS.WARN}`);
  printLine(`  FAIL     : ${COUNTS.FAIL}`);
  printLine(`  Duration : ${elapsed}s`);
  printLine(SEP_THIN);
  printLine(`  OVERALL  : ${overallStr}`);
  printLine(SEP_WIDE);
  printLine("");

  if (anyFail) process.exit(1);
}

main().catch((err: unknown) => {
  console.error("Audit failed:", String(err));
  process.exit(1);
});
