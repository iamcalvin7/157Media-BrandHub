import type pg from "pg";
import { pool } from "@workspace/db";
import { logger } from "./logger.js";
import snapshot from "../data-snapshot.json" with { type: "json" };

const TABLES = [
  "pillars",
  "events",
  "content_posts",
  "brand_voice_notes",
  "past_posts",
  "copywriter_rules",
  "copywriter_feedback",
  "content_ideas",
  "saved_items",
  "media_assets",
  "team_members",
  "voice_profiles",
  "nico_links",
  "brand_templates",
] as const;

// "Content" tables are anything the team creates/edits in the calendar UI.
// Once prod has any rows in one of these tables, the bootstrap leaves it alone
// completely — dev edits, additions, and deletions in these tables never
// affect prod after the first deploy. This is the simplest possible policy
// (no merging, no tombstones) and matches the rule:
// "any content changes in dev don't apply".
//
// "Knowledge base" tables (pillars, brand_voice_notes, copywriter_rules,
// copywriter_feedback, team_members) still merge from dev on every deploy,
// with tombstones honoured for prod-side deletions.
const CONTENT_TABLES: ReadonlySet<string> = new Set([
  "content_posts",
  "events",
  "content_ideas",
  "saved_items",
  "media_assets",
  "past_posts",
  "nico_links",
  "brand_templates",
]);

// "Authoritative" tables: dev is the single source of truth. Whenever the
// snapshot version changes, prod rows for any brand present in the snapshot
// are wiped and replaced by the dev rows (tombstones still honoured). This is
// the right policy for editorial taxonomies that the team curates centrally
// in dev — e.g. content pillars — where prod must not preserve stale values.
const AUTHORITATIVE_TABLES: ReadonlySet<string> = new Set([
  "pillars",
  // team_members has a unique (brand_id, name) index that the per-id merge
  // can't reconcile when a dev row has a different id than the prod row with
  // the same name. Treat it as authoritative — wipe + reseed per brand.
  "team_members",
]);

// One-shot rewrites for legacy text values on prod tables that the snapshot
// bootstrap doesn't touch (CONTENT_TABLES). Idempotent: each call rewrites
// only rows that still hold an old value, so it self-disables once applied.
// Legacy → current pillar name mapping. Always rewrites OLD names to the
// current approved taxonomy — never the reverse. Idempotent: each entry
// rewrites only rows that still hold a stale value, so it self-disables
// once applied. When the pillar set changes, ADD historical names here and
// point them at the current label.
const PILLAR_RENAME_MAP: Record<string, string> = {
  // Original names from the very first taxonomy
  "Why VF": "The Virtu Experience",
  "Why Sicily": "Choose Sicily",
  "Why Malta": "Choose Malta",
  "VF Recommends": "Virtu Recommends",
  "VF Experience": "The Virtu Experience",
  // Names from the previous 6/7-pillar taxonomy (retired 2026-05-15)
  "Choose Virtu": "The Virtu Experience",
  "The Crossing": "The Virtu Experience",
  "The Community": "For the Feed",
};

async function rewriteLegacyPillars(client: pg.PoolClient): Promise<void> {
  for (const [oldName, newName] of Object.entries(PILLAR_RENAME_MAP)) {
    const { rowCount } = await client.query(
      `UPDATE content_posts SET pillar = $2 WHERE pillar = $1`,
      [oldName, newName],
    );
    if (rowCount && rowCount > 0) {
      logger.info(
        { from: oldName, to: newName, rows: rowCount },
        "  Rewrote legacy pillar values on content_posts",
      );
    }
  }
}

// Legacy → current market name mapping. The "English Market" label was
// renamed to "Maltese Market" across the hub, but old prod rows from previous
// snapshot bootstraps still carry the legacy value, which the calendar's
// strict-equality market filter then drops from the mini picker. Idempotent.
const MARKET_RENAME_MAP: Record<string, string> = {
  "English Market": "Maltese Market",
  English: "Maltese Market",
};

async function rewriteLegacyMarkets(client: pg.PoolClient): Promise<void> {
  for (const table of ["content_posts", "past_posts"] as const) {
    for (const [oldName, newName] of Object.entries(MARKET_RENAME_MAP)) {
      const { rowCount } = await client.query(
        `UPDATE ${table} SET market = $2 WHERE market = $1`,
        [oldName, newName],
      );
      if (rowCount && rowCount > 0) {
        logger.info(
          { table, from: oldName, to: newName, rows: rowCount },
          "  Rewrote legacy market values",
        );
      }
    }
  }
}

interface Snapshot {
  version: string;
  tables: Record<string, unknown[]>;
}

const typedSnapshot = snapshot as unknown as Snapshot;

async function getRecordedVersion(client: pg.PoolClient): Promise<string | null> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS data_snapshot_version (
      id INT PRIMARY KEY DEFAULT 1,
      version TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT single_row CHECK (id = 1)
    )
  `);
  const { rows } = await client.query<{ version: string }>(
    `SELECT version FROM data_snapshot_version WHERE id = 1`,
  );
  return rows[0]?.version ?? null;
}

interface ColumnInfo {
  column_name: string;
  data_type: string;
}

async function getColumns(client: pg.PoolClient, table: string): Promise<ColumnInfo[]> {
  const { rows } = await client.query<ColumnInfo>(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table],
  );
  return rows;
}

/**
 * Merge dev snapshot rows into prod, preserving any non-empty values that already exist on prod.
 *
 * Rules per row (matched by id):
 *   - Row exists only in dev snapshot: INSERTed into prod.
 *   - Row exists only in prod (created on the live site): left untouched.
 *   - Row exists in both: per-column merge:
 *       text/varchar columns -> prod's value wins if it is non-null AND non-empty (after trim);
 *                               otherwise dev's value is used.
 *       other columns        -> COALESCE(prod, dev) — prod wins unless prod is NULL.
 *   - The `id` and `created_at` columns are never overwritten.
 *
 * This means: anything saved on the live site survives a republish, while new content
 * authored in the workspace is still pushed live.
 */
async function getTombstonedIds(
  client: pg.PoolClient,
  table: string,
): Promise<Set<number>> {
  // The tombstone table is created lazily by the API on first delete. If it
  // doesn't exist yet, we have no tombstones — return an empty set.
  const { rows: existsRows } = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'deleted_row_tombstones'
     ) AS exists`,
  );
  if (!existsRows[0]?.exists) return new Set();
  const { rows } = await client.query<{ row_id: string }>(
    `SELECT row_id FROM deleted_row_tombstones WHERE table_name = $1`,
    [table],
  );
  return new Set(rows.map((r) => Number(r.row_id)));
}

async function mergeTable(
  client: pg.PoolClient,
  table: string,
  rows: unknown[],
): Promise<{ skipped: number }> {
  if (rows.length === 0) return { skipped: 0 };

  const cols = await getColumns(client, table);
  if (cols.length === 0) {
    logger.warn({ table }, "  Table not found in information_schema; skipping");
    return { skipped: 0 };
  }

  // Honour live-site deletions: skip any rows whose ID was tombstoned by the
  // API on prod. This is what makes "delete on the live site" stick across
  // republishes — without it, every deploy would revive deleted rows from the
  // dev snapshot.
  const tombstoned = await getTombstonedIds(client, table);
  let liveRows = rows;
  if (tombstoned.size > 0) {
    liveRows = rows.filter((r) => {
      const id = (r as { id?: unknown })?.id;
      return typeof id === "number" ? !tombstoned.has(id) : true;
    });
  }
  const skipped = rows.length - liveRows.length;
  if (liveRows.length === 0) return { skipped };

  const TEXT_TYPES = new Set([
    "text",
    "character varying",
    "character",
    "varchar",
  ]);
  const PROTECTED = new Set(["id", "created_at"]);

  const updateCols = cols.filter((c) => !PROTECTED.has(c.column_name));
  const setClauses = updateCols
    .map((c) => {
      const name = `"${c.column_name}"`;
      if (TEXT_TYPES.has(c.data_type)) {
        // Prefer prod's existing non-empty value; otherwise take dev's.
        return `${name} = CASE
          WHEN "${table}".${name} IS NOT NULL AND length(trim("${table}".${name})) > 0
          THEN "${table}".${name}
          ELSE EXCLUDED.${name}
        END`;
      }
      // Non-text: prod wins unless prod is NULL.
      return `${name} = COALESCE("${table}".${name}, EXCLUDED.${name})`;
    })
    .join(",\n        ");

  const sql = `
    INSERT INTO "${table}"
    SELECT * FROM jsonb_populate_recordset(NULL::"${table}", $1::jsonb)
    ON CONFLICT (id) DO UPDATE SET
        ${setClauses}
  `;
  await client.query(sql, [JSON.stringify(liveRows)]);
  return { skipped };
}

// Idempotent prod schema migrations applied on every boot. Each statement is
// safe to re-run, so we don't need a tracking table or per-version gating.
// Add new ALTER/CREATE here when shipping a schema change that prod needs to
// pick up without a separate drizzle-kit push step.
async function applyIdempotentMigrations(client: pg.PoolClient): Promise<void> {
  // 2026-05-18-e: multi-photo posts + client feedback on share links
  await client.query(
    `ALTER TABLE IF EXISTS content_posts
     ADD COLUMN IF NOT EXISTS media_urls jsonb NOT NULL DEFAULT '[]'::jsonb`,
  );
  await client.query(`
    CREATE TABLE IF NOT EXISTS share_post_feedback (
      id serial PRIMARY KEY,
      share_token varchar(64) NOT NULL,
      brand_id integer NOT NULL,
      post_id integer NOT NULL,
      decision text,
      comment text,
      client_name text,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(
    `CREATE INDEX IF NOT EXISTS share_post_feedback_post_idx ON share_post_feedback (post_id)`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS share_post_feedback_brand_idx ON share_post_feedback (brand_id)`,
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS share_post_feedback_token_idx ON share_post_feedback (share_token)`,
  );

  // 2026-05-18-g: per-brand templates (image/video + optional template link)
  await client.query(`
    CREATE TABLE IF NOT EXISTS brand_templates (
      id serial PRIMARY KEY,
      brand_id integer NOT NULL,
      title text NOT NULL,
      description text,
      media_url text NOT NULL,
      media_kind text NOT NULL,
      template_url text,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(
    `CREATE INDEX IF NOT EXISTS brand_templates_brand_idx ON brand_templates (brand_id)`,
  );
}

export async function bootstrapFromSnapshot(): Promise<void> {
  if (process.env["NODE_ENV"] !== "production") {
    logger.info("Skipping snapshot bootstrap (NODE_ENV !== production)");
    return;
  }

  const client = await pool.connect();
  try {
    try {
      await applyIdempotentMigrations(client);
      logger.info("Idempotent schema migrations applied");
    } catch (err) {
      logger.error({ err }, "Idempotent schema migrations failed; continuing");
    }
    const recorded = await getRecordedVersion(client);
    if (recorded === typedSnapshot.version) {
      logger.info(
        { version: typedSnapshot.version },
        "Snapshot already applied, skipping bootstrap",
      );
      return;
    }

    logger.info(
      { from: recorded, to: typedSnapshot.version, mode: "merge" },
      "Merging data snapshot into production DB (live edits preserved)",
    );

    await client.query("BEGIN");
    const tableErrors: { table: string; error: string }[] = [];
    try {
      for (const t of TABLES) {
        const rows = typedSnapshot.tables[t] ?? [];

        // Each table runs in its own savepoint so a failure in one (e.g. a
        // unique-constraint violation in team_members) doesn't roll back the
        // others. Without this, a single bad row could prevent authoritative
        // tables like `pillars` from being applied to prod.
        const savepoint = `sp_${t}`;
        await client.query(`SAVEPOINT ${savepoint}`);
        try {

        // Content tables: dev never overrides prod once prod has any rows.
        // First-time deploys still get seeded from the dev snapshot.
        if (CONTENT_TABLES.has(t)) {
          const { rows: hasRows } = await client.query<{ exists: boolean }>(
            `SELECT EXISTS (SELECT 1 FROM "${t}" LIMIT 1) AS exists`,
          );
          if (hasRows[0]?.exists) {
            logger.info(
              { table: t, devRows: rows.length },
              "  Skipped content table (prod already has rows)",
            );
          } else if (rows.length > 0) {
            await client.query(
              `INSERT INTO "${t}"
               SELECT * FROM jsonb_populate_recordset(NULL::"${t}", $1::jsonb)`,
              [JSON.stringify(rows)],
            );
            logger.info(
              { table: t, devRows: rows.length },
              "  Seeded empty content table from dev snapshot",
            );
          }
        } else if (AUTHORITATIVE_TABLES.has(t)) {
          // Authoritative tables (e.g. pillars): wipe prod rows for every
          // brand present in the dev snapshot, then re-insert dev rows.
          // Tombstones are still honoured so live-site deletions stick.
          const brandIds = Array.from(
            new Set(
              rows
                .map((r) => (r as { brand_id?: unknown })?.brand_id)
                .filter((b): b is number => typeof b === "number"),
            ),
          );
          if (brandIds.length > 0) {
            await client.query(
              `DELETE FROM "${t}" WHERE brand_id = ANY($1::int[])`,
              [brandIds],
            );
          }
          const tombstoned = await getTombstonedIds(client, t);
          const liveRows =
            tombstoned.size > 0
              ? rows.filter((r) => {
                  const id = (r as { id?: unknown })?.id;
                  return typeof id === "number" ? !tombstoned.has(id) : true;
                })
              : rows;
          if (liveRows.length > 0) {
            await client.query(
              `INSERT INTO "${t}"
               SELECT * FROM jsonb_populate_recordset(NULL::"${t}", $1::jsonb)`,
              [JSON.stringify(liveRows)],
            );
          }
          logger.info(
            {
              table: t,
              devRows: rows.length,
              wipedBrands: brandIds.length,
              skipped: rows.length - liveRows.length,
            },
            "  Replaced authoritative table from dev snapshot",
          );
        } else {
          // Knowledge-base tables: full merge with tombstone awareness.
          const { skipped } = await mergeTable(client, t, rows);
          if (skipped > 0) {
            logger.info(
              { table: t, skipped },
              "  Skipped revival of rows deleted on the live site",
            );
          }
          logger.info({ table: t, devRows: rows.length }, "  Merged table");
        }

        // Bump the id sequence past any rows that may have been added on live
        // since the last bootstrap, so future inserts don't collide.
        await client.query(
          `SELECT setval(
             pg_get_serial_sequence($1, 'id'),
             GREATEST(COALESCE((SELECT MAX(id) FROM "${t}"), 0), 1)
           )`,
          [t],
        );

          await client.query(`RELEASE SAVEPOINT ${savepoint}`);
        } catch (tableErr) {
          await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
          await client.query(`RELEASE SAVEPOINT ${savepoint}`);
          const message =
            tableErr instanceof Error ? tableErr.message : String(tableErr);
          tableErrors.push({ table: t, error: message });
          logger.error(
            { table: t, err: tableErr },
            "  Table bootstrap failed; continuing with remaining tables",
          );
        }
      }

      // One-shot legacy data rewrites (idempotent — safe to run every deploy).
      try {
        await client.query(`SAVEPOINT sp_legacy_rewrites`);
        await rewriteLegacyPillars(client);
        await rewriteLegacyMarkets(client);
        await client.query(`RELEASE SAVEPOINT sp_legacy_rewrites`);
      } catch (rewriteErr) {
        await client.query(`ROLLBACK TO SAVEPOINT sp_legacy_rewrites`);
        await client.query(`RELEASE SAVEPOINT sp_legacy_rewrites`);
        logger.error(
          { err: rewriteErr },
          "  Legacy pillar/market rewrite failed; continuing",
        );
      }

      await client.query(
        `INSERT INTO data_snapshot_version (id, version, applied_at)
         VALUES (1, $1, NOW())
         ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version, applied_at = NOW()`,
        [typedSnapshot.version],
      );

      await client.query("COMMIT");
      logger.info(
        {
          version: typedSnapshot.version,
          failedTables: tableErrors,
        },
        tableErrors.length > 0
          ? "Snapshot merge complete (with per-table failures, see above)"
          : "Snapshot merge complete",
      );
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  } finally {
    client.release();
  }
}
