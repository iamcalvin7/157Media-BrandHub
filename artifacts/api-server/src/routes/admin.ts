/**
 * admin.ts — Internal admin routes
 *
 * All routes here are protected by requireBrandAccess('admin').
 * Never expose these to unauthenticated callers.
 */

import { Router, type IRouter } from "express";
import { requireBrandAccess } from "../middlewares/requireBrandAccess.js";
import { objectStorageClient } from "../lib/objectStorage.js";
import { logger } from "../lib/logger.js";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBucketName(): string {
  const dir = process.env["PRIVATE_OBJECT_DIR"];
  if (dir) {
    const segment = dir.split("/").filter(Boolean)[0];
    if (segment) return segment;
  }
  const id = process.env["DEFAULT_OBJECT_STORAGE_BUCKET_ID"];
  if (id) return id;
  throw new Error("Cannot determine GCS bucket from PRIVATE_OBJECT_DIR");
}

type BackupStatus = "ok" | "stale" | "critical" | "unavailable";

interface BackupManifest {
  backup_id: string;
  timestamp: string;
  table_count: number;
  total_rows: number;
  dump_size_bytes: number;
  sha256_checksum: string;
  integrity_check: "PASSED" | "FAILED";
  duration_ms: number;
  dry_run: boolean;
  [key: string]: unknown;
}

function deriveStatus(manifest: BackupManifest): BackupStatus {
  if (manifest.integrity_check !== "PASSED") return "critical";
  const ageMs = Date.now() - new Date(manifest.timestamp).getTime();
  const hoursOld = ageMs / (1000 * 60 * 60);
  if (hoursOld < 25) return "ok";
  if (hoursOld < 48) return "stale";
  return "critical";
}

// Simple 5-minute in-memory cache to avoid hammering GCS on every request
let cachedManifest: { manifest: BackupManifest; fetchedAt: number } | null =
  null;
const CACHE_TTL_MS = 5 * 60 * 1000;

// ---------------------------------------------------------------------------
// GET /admin/backup-status
// ---------------------------------------------------------------------------

router.get("/admin/backup-status", requireBrandAccess('admin'), async (_req, res) => {
  try {
    const now = Date.now();

    if (cachedManifest && now - cachedManifest.fetchedAt < CACHE_TTL_MS) {
      const status = deriveStatus(cachedManifest.manifest);
      res.json({ status, manifest: cachedManifest.manifest, cached: true });
      return;
    }

    const bucketName = getBucketName();
    const file = objectStorageClient
      .bucket(bucketName)
      .file("backups/latest/prod.manifest.json");

    const [exists] = await file.exists();
    if (!exists) {
      res.json({
        status: "unavailable" as BackupStatus,
        reason: "No backup manifest found in Object Storage",
        manifest: null,
      });
      return;
    }

    const [content] = await file.download();
    const manifest = JSON.parse(content.toString("utf-8")) as BackupManifest;
    cachedManifest = { manifest, fetchedAt: now };

    const status = deriveStatus(manifest);
    res.json({ status, manifest, cached: false });
  } catch (err) {
    logger.error({ err }, "Failed to fetch backup status from Object Storage");
    res.json({
      status: "unavailable" as BackupStatus,
      reason: "Failed to reach Object Storage",
      manifest: null,
    });
  }
});

// ---------------------------------------------------------------------------
// POST /admin/repair/bvn-orphans
//
// ONE-TIME production data repair. Nulls out brand_voice_notes.source_post_id
// values that reference a content_posts row that no longer exists.
//
// This endpoint exists because Replit's publish validator applies a schema diff
// (DDL only) — migration .sql files are never executed against production.
// The 3 orphan rows (bvn.id=45,84,85) must be cleaned via the running app
// before the FK constraint can be re-added in the next publish.
//
// SAFETY GATES:
//   1. Clerk authentication (authMiddleware applied globally in app.ts)
//   2. requireBrandAccess('admin') — caller must be admin on the brand header
//   3. ?confirm=true query param — prevents accidental GET/browser triggering
//
// IDEMPOTENT: Re-running when already clean returns { affected: 0 }.
// REMOVE THIS ENDPOINT after the FK has been successfully re-added to prod.
// ---------------------------------------------------------------------------

router.post(
  "/admin/repair/bvn-orphans",
  requireBrandAccess("admin"),
  async (req, res): Promise<void> => {
    if (req.query["confirm"] !== "true") {
      res.status(400).json({
        error: "missing_confirm",
        message: "Add ?confirm=true to the request to execute the repair.",
      });
      return;
    }

    try {
      const result = await pool.query(`
        UPDATE brand_voice_notes
        SET    source_post_id = NULL
        WHERE  source_post_id IS NOT NULL
          AND  source_post_id NOT IN (SELECT id FROM content_posts)
      `);

      const affected = result.rowCount ?? 0;
      logger.info({ affected }, "bvn-orphans repair executed");

      res.json({
        ok: true,
        affected,
        message:
          affected === 0
            ? "Already clean — no orphan rows found."
            : `Repaired ${affected} orphan row(s). source_post_id set to NULL.`,
      });
    } catch (err) {
      logger.error({ err }, "bvn-orphans repair failed");
      res.status(500).json({ error: "repair_failed", detail: String(err) });
    }
  },
);

export default router;
