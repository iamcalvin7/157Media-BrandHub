import { pool } from "@workspace/db";
import { logger } from "./logger.js";

// Names of all tables whose deletes we want to honour across snapshot bootstraps.
// Adding a table here = the bootstrap will skip re-inserting any rows whose IDs
// have been recorded as tombstoned via recordTombstone().
//
// Only knowledge-base tables need tombstones — content tables (content_posts,
// events, content_ideas, saved_items, media_assets, past_posts) are never
// touched by the bootstrap once prod has any data, so prod-side deletes there
// already stick automatically.
export type TombstonedTable =
  | "team_members"
  | "copywriter_feedback"
  | "brand_voice_notes"
  | "pillars";

let tableEnsured = false;

async function ensureTombstonesTable(): Promise<void> {
  if (tableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deleted_row_tombstones (
      table_name VARCHAR(64) NOT NULL,
      row_id BIGINT NOT NULL,
      deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (table_name, row_id)
    )
  `);
  tableEnsured = true;
}

/**
 * Record that a row was deleted on the live site so the next snapshot
 * bootstrap doesn't revive it from the dev snapshot.
 *
 * Safe to call from anywhere — never throws (logs and continues on failure
 * so the actual delete still succeeds).
 *
 * In non-production environments this is a no-op (dev's source-of-truth IS
 * the dev DB itself, so tombstones aren't meaningful there).
 */
export async function recordTombstone(
  table: TombstonedTable,
  id: number,
): Promise<void> {
  if (process.env["NODE_ENV"] !== "production") return;
  if (!Number.isFinite(id)) return;
  try {
    await ensureTombstonesTable();
    await pool.query(
      `INSERT INTO deleted_row_tombstones (table_name, row_id)
       VALUES ($1, $2)
       ON CONFLICT (table_name, row_id) DO NOTHING`,
      [table, id],
    );
  } catch (err) {
    logger.error({ err, table, id }, "Failed to record tombstone");
  }
}
