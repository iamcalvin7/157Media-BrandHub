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
// POST /admin/grant-all-admin
// ONE-TIME: grants admin access on all brands to a hardcoded list of users.
// Protected by requireBrandAccess('admin') — only Calvin can call this.
// REMOVE after use.
// ---------------------------------------------------------------------------

router.post("/admin/grant-all-admin", requireBrandAccess("admin"), async (_req, res): Promise<void> => {
  const emails = [
    "ayrton1galea@gmail.com",
    "samantha@collins.uk.com",
    "thebinkycreative@gmail.com",
  ];

  try {
    const { rows: brands } = await pool.query<{ id: number }>(`SELECT id FROM brands`);
    const { rows: users } = await pool.query<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE email = ANY($1::text[])`,
      [emails],
    );

    let inserted = 0;
    for (const user of users) {
      for (const brand of brands) {
        const r = await pool.query(
          `INSERT INTO user_brand_access (user_id, brand_id, role)
           VALUES ($1, $2, 'admin')
           ON CONFLICT (user_id, brand_id) DO UPDATE SET role = 'admin'`,
          [user.id, brand.id],
        );
        inserted += r.rowCount ?? 0;
      }
    }

    logger.info({ inserted, users: users.map(u => u.email) }, "grant-all-admin executed");
    res.json({ ok: true, inserted, users: users.map(u => u.email), brands: brands.length });
  } catch (err) {
    logger.error({ err }, "grant-all-admin failed");
    res.status(500).json({ error: "failed", detail: String(err) });
  }
});

export default router;
