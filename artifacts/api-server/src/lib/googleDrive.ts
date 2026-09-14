/**
 * googleDrive.ts — Google Drive folder creation via Replit Connectors SDK.
 * Uses the proxy pattern: tokens are injected automatically, never cached.
 * Integration: connection:conn_google-drive_01KVDK47QYGFFQKJBWC99EBGMZ
 */

import { ReplitConnectors } from "@replit/connectors-sdk";
import { db, contentPostsTable, marketingRequestsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";

const GHS_BRAND_SLUG = "gozo-highspeed";
const VF_BRAND_SLUG  = "virtu-ferries";
const REQUIRED_POST_DRIVE_ENV_KEYS = [
  "GHS_DRIVE_PARENT_FOLDER_ID",
  "VF_DRIVE_EN_PARENT_FOLDER_ID",
  "VF_DRIVE_IT_PARENT_FOLDER_ID",
] as const;
let postDriveParentsVerifiedAt = 0;
const DRIVE_PROBE_TIMEOUT_MS = 10_000;

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  errorMessage: string,
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export class DriveFolderCreationError extends Error {
  constructor(
    message: string,
    public readonly postId?: number,
  ) {
    super(message);
    this.name = "DriveFolderCreationError";
  }
}

export function getPostDriveConfigurationStatus(): {
  configured: boolean;
  missing: string[];
} {
  const missing = REQUIRED_POST_DRIVE_ENV_KEYS.filter(
    (key) => !process.env[key]?.trim(),
  );
  return { configured: missing.length === 0, missing: [...missing] };
}

export function assertPostDriveConfiguration(): void {
  const { missing } = getPostDriveConfigurationStatus();
  if (missing.length > 0) {
    throw new Error(
      `Google Drive post folders are not configured. Missing environment variables: ${missing.join(", ")}`,
    );
  }
}

export async function verifyPostDriveParentsAccessible(
  maxAgeMs = 0,
  timeoutMs = DRIVE_PROBE_TIMEOUT_MS,
): Promise<void> {
  assertPostDriveConfiguration();
  if (
    maxAgeMs > 0 &&
    postDriveParentsVerifiedAt > 0 &&
    Date.now() - postDriveParentsVerifiedAt < maxAgeMs
  ) {
    return;
  }

  const connectors = new ReplitConnectors();

  for (const key of REQUIRED_POST_DRIVE_ENV_KEYS) {
    const parentFolderId = process.env[key]!.trim();
    let response: Response;
    try {
      response = await withTimeout(
        connectors.proxy(
          "google-drive",
          `/drive/v3/files/${encodeURIComponent(parentFolderId)}?fields=id,mimeType,capabilities(canAddChildren)&supportsAllDrives=true`,
          { method: "GET" },
        ),
        timeoutMs,
        `Google Drive startup check timed out for ${key}`,
      );
    } catch (err) {
      if (err instanceof Error && err.message.includes("timed out")) {
        throw err;
      }
      throw new Error(
        `Google Drive startup check could not access the parent folder configured by ${key}`,
      );
    }

    if (!response.ok) {
      throw new Error(
        `Google Drive startup check could not access the parent folder configured by ${key} (status ${response.status})`,
      );
    }

    const metadata = (await response.json()) as {
      mimeType?: string;
      capabilities?: { canAddChildren?: boolean };
    };
    if (
      metadata.mimeType !== "application/vnd.google-apps.folder" ||
      metadata.capabilities?.canAddChildren !== true
    ) {
      throw new Error(
        `Google Drive parent configured by ${key} is not a writable folder`,
      );
    }
  }

  postDriveParentsVerifiedAt = Date.now();
}

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
  if (!parentFolderId) {
    if (opts.brandSlug === GHS_BRAND_SLUG || opts.brandSlug === VF_BRAND_SLUG) {
      throw new DriveFolderCreationError(
        "Required Google Drive parent folder is not configured",
        opts.postId,
      );
    }
    return null;
  }

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

    // Reuse a folder created by a previous attempt whose DB update failed.
    // appProperties make retries idempotent without exposing the parent ID.
    const q = [
      `'${parentFolderId}' in parents`,
      `appProperties has { key='contentPostId' and value='${opts.postId}' }`,
      "trashed=false",
    ].join(" and ");
    const existingResponse = await connectors.proxy(
      "google-drive",
      `/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      { method: "GET" },
    );
    if (!existingResponse.ok) {
      logger.error(
        { postId: opts.postId, status: existingResponse.status },
        "googleDrive: idempotency lookup failed",
      );
      throw new DriveFolderCreationError(
        `Google Drive rejected the folder lookup with status ${existingResponse.status}`,
        opts.postId,
      );
    }

    const existingData = (await existingResponse.json()) as {
      files?: Array<{ id?: string }>;
    };
    const existingFolderId = existingData.files?.[0]?.id;
    if (existingFolderId) {
      const existingDriveUrl = `https://drive.google.com/drive/folders/${existingFolderId}`;
      await db
        .update(contentPostsTable)
        .set({ drive_url: existingDriveUrl })
        .where(eq(contentPostsTable.id, opts.postId));
      logger.info({ postId: opts.postId }, "googleDrive: existing folder reused");
      return existingDriveUrl;
    }

    const body = JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
      appProperties: { contentPostId: String(opts.postId) },
    });

    const response = await connectors.proxy("google-drive", "/drive/v3/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    if (!response.ok) {
      logger.error({ postId: opts.postId, status: response.status }, "googleDrive: folder creation failed");
      throw new DriveFolderCreationError(
        `Google Drive rejected folder creation with status ${response.status}`,
        opts.postId,
      );
    }

    const data = (await response.json()) as { id?: string };
    const folderId = data.id;
    if (!folderId) {
      logger.error({ postId: opts.postId }, "googleDrive: no folder id in response");
      throw new DriveFolderCreationError(
        "Google Drive did not return a folder id",
        opts.postId,
      );
    }

    const driveUrl = `https://drive.google.com/drive/folders/${folderId}`;

    await db
      .update(contentPostsTable)
      .set({ drive_url: driveUrl })
      .where(eq(contentPostsTable.id, opts.postId));

    logger.info({ postId: opts.postId, folderName }, "googleDrive: folder created and drive_url saved");
    return driveUrl;
  } catch (err) {
    logger.error(
      {
        postId: opts.postId,
        errorCategory:
          err instanceof DriveFolderCreationError
            ? err.name
            : "UnexpectedDriveError",
      },
      "googleDrive: unexpected error creating folder",
    );
    if (err instanceof DriveFolderCreationError) throw err;
    throw new DriveFolderCreationError(
      "Unexpected error while creating the Google Drive folder",
      opts.postId,
    );
  }
}

/**
 * Creates a Drive subfolder for a marketing request and patches its drive_url.
 * Uses VF_MR_DRIVE_EN_FOLDER_ID or VF_MR_DRIVE_IT_FOLDER_ID env vars.
 */
export async function createDriveFolderForMarketingRequest(opts: {
  requestId: number;
  brandSlug: string;
  market?: string | null;
  name: string;
}): Promise<string | null> {
  if (opts.brandSlug !== VF_BRAND_SLUG) return null;

  const isItalian = opts.market?.toLowerCase().includes("italian");
  const envKey = isItalian ? "VF_MR_DRIVE_IT_FOLDER_ID" : "VF_MR_DRIVE_EN_FOLDER_ID";
  const parentFolderId = process.env[envKey];
  if (!parentFolderId) {
    logger.warn({ market: opts.market }, `googleDrive: ${envKey} not set — skipping marketing request folder`);
    return null;
  }

  try {
    const connectors = new ReplitConnectors();
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, "0");
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const yy = String(now.getFullYear()).slice(2);
    const folderName = opts.name?.trim()
      ? `${dd}.${mm}.${yy} — ${opts.name.trim()}`
      : `${dd}.${mm}.${yy} — Request #${opts.requestId}`;

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
      logger.error({ requestId: opts.requestId, status: response.status }, "googleDrive: marketing request folder creation failed");
      return null;
    }

    const data = (await response.json()) as { id?: string };
    const folderId = data.id;
    if (!folderId) {
      logger.error({ requestId: opts.requestId }, "googleDrive: no folder id in response for marketing request");
      return null;
    }

    const driveUrl = `https://drive.google.com/drive/folders/${folderId}`;
    await db
      .update(marketingRequestsTable)
      .set({ drive_url: driveUrl })
      .where(eq(marketingRequestsTable.id, opts.requestId));

    logger.info({ requestId: opts.requestId, folderName }, "googleDrive: marketing request folder created");
    return driveUrl;
  } catch (err) {
    logger.error(
      {
        requestId: opts.requestId,
        errorCategory: err instanceof Error ? err.name : "UnknownDriveError",
      },
      "googleDrive: unexpected error creating marketing request folder",
    );
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
    return id?.trim() || null;
  }

  if (brandSlug === VF_BRAND_SLUG) {
    const isItalian = market?.toLowerCase().includes("italian");
    const envKey = isItalian ? "VF_DRIVE_IT_PARENT_FOLDER_ID" : "VF_DRIVE_EN_PARENT_FOLDER_ID";
    const id = process.env[envKey];
    if (!id) logger.warn({ market }, `googleDrive: ${envKey} not set — skipping`);
    return id?.trim() || null;
  }

  return null;
}
