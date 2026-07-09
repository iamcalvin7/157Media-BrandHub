/**
 * googleDrive.ts — Google Drive folder creation via Replit Connectors SDK.
 * Uses the proxy pattern: tokens are injected automatically, never cached.
 * Integration: connection:conn_google-drive_01KVDK47QYGFFQKJBWC99EBGMZ
 */

import { ReplitConnectors } from "@replit/connectors-sdk";
import { db, contentPostsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";

const GHS_BRAND_SLUG = "gozo-highspeed";
const VF_BRAND_SLUG  = "virtu-ferries";

/**
 * Given a parent folder ID from env, creates a subfolder named after the post,
 * patches the post's drive_url, and returns the folder URL (or null on failure).
 */
export async function createDriveFolderForPost(opts: {
  postId: number;
  brandSlug: string;
  market?: string | null;
  title: string;
  month: string;
  scheduledDate?: string | null;
}): Promise<string | null> {
  const parentFolderId = resolveParentFolderId(opts.brandSlug, opts.market);
  if (!parentFolderId) return null;

  try {
    const connectors = new ReplitConnectors();

    // Format: DD.MM.YY — Post Title  (e.g. "18.06.26 — Insland Sea: Dwejra")
    // scheduled_date is YYYY-MM-DD; fall back to no prefix if absent.
    let datePrefix = "";
    if (opts.scheduledDate) {
      const [y, m, d] = opts.scheduledDate.split("-");
      datePrefix = `${d}.${m}.${y?.slice(2)} — `;
    }
    const folderName = opts.title?.trim()
      ? `${datePrefix}${opts.title.trim()}`
      : `${datePrefix}Post #${opts.postId}`;

    const body = JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    });

    const response = await connectors.proxy("google-drive", "/drive/v3/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error({ postId: opts.postId, status: response.status, text }, "googleDrive: folder creation failed");
      return null;
    }

    const data = (await response.json()) as { id?: string };
    const folderId = data.id;
    if (!folderId) {
      logger.error({ postId: opts.postId, data }, "googleDrive: no folder id in response");
      return null;
    }

    const driveUrl = `https://drive.google.com/drive/folders/${folderId}`;

    await db
      .update(contentPostsTable)
      .set({ drive_url: driveUrl })
      .where(eq(contentPostsTable.id, opts.postId));

    logger.info({ postId: opts.postId, folderId, folderName }, "googleDrive: folder created and drive_url saved");
    return driveUrl;
  } catch (err) {
    logger.error({ err, postId: opts.postId }, "googleDrive: unexpected error creating folder");
    return null;
  }
}

/**
 * Returns the Drive parent folder ID for a given brand + market combination,
 * or null if Drive folder creation is not configured for that brand.
 *
 * GHS: single folder (GHS_DRIVE_PARENT_FOLDER_ID)
 * VF:  EN/MT market → VF_DRIVE_EN_PARENT_FOLDER_ID
 *      IT market     → VF_DRIVE_IT_PARENT_FOLDER_ID
 */
function resolveParentFolderId(brandSlug: string, market?: string | null): string | null {
  if (brandSlug === GHS_BRAND_SLUG) {
    const id = process.env.GHS_DRIVE_PARENT_FOLDER_ID;
    if (!id) logger.warn({}, "googleDrive: GHS_DRIVE_PARENT_FOLDER_ID not set — skipping");
    return id ?? null;
  }

  if (brandSlug === VF_BRAND_SLUG) {
    const isItalian = market?.toLowerCase().includes("italian");
    const envKey = isItalian ? "VF_DRIVE_IT_PARENT_FOLDER_ID" : "VF_DRIVE_EN_PARENT_FOLDER_ID";
    const id = process.env[envKey];
    if (!id) logger.warn({ market }, `googleDrive: ${envKey} not set — skipping`);
    return id ?? null;
  }

  return null;
}
