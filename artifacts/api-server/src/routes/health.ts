import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import {
  getPostDriveConfigurationStatus,
  verifyPostDriveParentsAccessible,
} from "../lib/googleDrive.js";
import { requireBrandAccess } from "../middlewares/requireBrandAccess.js";
import { contentPostsTable, db } from "@workspace/db";
import { and, count, eq, isNull, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/readyz", async (_req, res) => {
  const drive = getPostDriveConfigurationStatus();
  if (!drive.configured) {
    res.status(503).json({
      status: "not_ready",
      google_drive_post_folders: drive,
    });
    return;
  }

  try {
    await verifyPostDriveParentsAccessible(60_000);
  } catch {
    res.status(503).json({
      status: "not_ready",
      google_drive_post_folders: {
        ...drive,
        access: "unavailable",
      },
    });
    return;
  }

  res.json({
    status: "ready",
    google_drive_post_folders: {
      ...drive,
      access: "verified",
    },
  });
});

router.get(
  "/drive-status",
  requireBrandAccess("viewer"),
  async (req, res) => {
    const configuration = getPostDriveConfigurationStatus();
    let access: "verified" | "unavailable" = "unavailable";

    if (configuration.configured) {
      try {
        await verifyPostDriveParentsAccessible(60_000);
        access = "verified";
      } catch {
        access = "unavailable";
      }
    }

    const [missingResult] = await db
      .select({ value: count() })
      .from(contentPostsTable)
      .where(
        and(
          eq(contentPostsTable.brand_id, req.brandId),
          or(
            isNull(contentPostsTable.drive_url),
            eq(contentPostsTable.drive_url, ""),
          ),
        ),
      );
    const unresolvedPosts = missingResult?.value ?? 0;

    res.json({
      healthy:
        configuration.configured &&
        access === "verified" &&
        unresolvedPosts === 0,
      configuration: {
        configured: configuration.configured,
        missing: configuration.missing,
      },
      access,
      unresolved_posts: unresolvedPosts,
    });
  },
);

export default router;
