import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import {
  getPostDriveConfigurationStatus,
  verifyPostDriveParentsAccessible,
} from "../lib/googleDrive.js";

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

export default router;
