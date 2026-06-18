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

/**
 * Given a parent folder ID from env, creates a subfolder named after the post
 * and patches the post's drive_url with the folder link.
 * Fire-and-forget — never throws to the caller.
 */
export async function createDriveFolderForPost(opts: {
  postId: number;
  brandSlug: string;
  title: string;
  month: string;
}): Promise<void> {
  if (opts.brandSlug !== GHS_BRAND_SLUG) return;

  const parentFolderId = process.env.GHS_DRIVE_PARENT_FOLDER_ID;
  if (!parentFolderId) {
    logger.warn({ postId: opts.postId }, "googleDrive: GHS_DRIVE_PARENT_FOLDER_ID not set — skipping");
    return;
  }

  try {
    const connectors = new ReplitConnectors();

    const folderName = opts.title?.trim()
      ? `${opts.month} — ${opts.title.trim()}`
      : `${opts.month} — Post #${opts.postId}`;

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
      return;
    }

    const data = (await response.json()) as { id?: string };
    const folderId = data.id;
    if (!folderId) {
      logger.error({ postId: opts.postId, data }, "googleDrive: no folder id in response");
      return;
    }

    const driveUrl = `https://drive.google.com/drive/folders/${folderId}`;

    await db
      .update(contentPostsTable)
      .set({ drive_url: driveUrl })
      .where(eq(contentPostsTable.id, opts.postId));

    logger.info({ postId: opts.postId, folderId, folderName }, "googleDrive: folder created and drive_url saved");
  } catch (err) {
    logger.error({ err, postId: opts.postId }, "googleDrive: unexpected error creating folder");
  }
}
