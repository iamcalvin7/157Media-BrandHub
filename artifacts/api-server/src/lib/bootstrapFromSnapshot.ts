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
] as const;

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

export async function bootstrapFromSnapshot(): Promise<void> {
  if (process.env["NODE_ENV"] !== "production") {
    logger.info("Skipping snapshot bootstrap (NODE_ENV !== production)");
    return;
  }

  const client = await pool.connect();
  try {
    const recorded = await getRecordedVersion(client);
    if (recorded === typedSnapshot.version) {
      logger.info(
        { version: typedSnapshot.version },
        "Snapshot already applied, skipping bootstrap",
      );
      return;
    }

    logger.info(
      { from: recorded, to: typedSnapshot.version },
      "Applying data snapshot to production DB",
    );

    await client.query("BEGIN");
    try {
      for (const t of TABLES) {
        const rows = typedSnapshot.tables[t] ?? [];
        await client.query(`TRUNCATE TABLE ${t} RESTART IDENTITY CASCADE`);
        if (rows.length > 0) {
          await client.query(
            `INSERT INTO ${t} SELECT * FROM jsonb_populate_recordset(NULL::${t}, $1::jsonb)`,
            [JSON.stringify(rows)],
          );
          await client.query(
            `SELECT setval(pg_get_serial_sequence($1, 'id'), COALESCE((SELECT MAX(id) FROM ${t}), 1))`,
            [t],
          );
        }
        logger.info({ table: t, rows: rows.length }, "  Seeded table");
      }

      await client.query(
        `INSERT INTO data_snapshot_version (id, version, applied_at)
         VALUES (1, $1, NOW())
         ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version, applied_at = NOW()`,
        [typedSnapshot.version],
      );

      await client.query("COMMIT");
      logger.info(
        { version: typedSnapshot.version },
        "Snapshot bootstrap complete",
      );
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  } finally {
    client.release();
  }
}
