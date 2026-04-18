import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import sharp from "sharp";
import type { File } from "@google-cloud/storage";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage.js";
import { ObjectPermission } from "../lib/objectAcl.js";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const ALLOWED_THUMB_WIDTHS = [200, 400, 800, 1200];

async function streamThumbnail(file: File, width: number, res: Response): Promise<void> {
  const [metadata] = await file.getMetadata();
  const contentType = (metadata.contentType as string) || "";

  // Only resize raster images. SVG / non-images: serve original.
  const isRaster = /^image\/(jpeg|png|webp|avif|tiff|gif)$/i.test(contentType);
  if (!isRaster) {
    res.setHeader("Content-Type", contentType || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=86400");
    file.createReadStream().pipe(res);
    return;
  }

  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=604800, immutable");

  const transformer = sharp()
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .jpeg({ quality: 78, progressive: true, mozjpeg: true });

  const source = file.createReadStream();
  source.on("error", (err) => {
    console.error("thumb source stream error", err);
    if (!res.headersSent) res.status(500).end();
    else res.end();
  });
  transformer.on("error", (err) => {
    console.error("sharp transform error", err);
    if (!res.headersSent) res.status(500).end();
    else res.end();
  });

  source.pipe(transformer).pipe(res);
}

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 */
router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
  const { name, size, contentType } = req.body as { name?: string; size?: number; contentType?: string };
  if (!name || !contentType) {
    res.status(400).json({ error: "name and contentType are required" });
    return;
  }

  try {
    const uploadURL = await objectStorageService.getObjectEntityUploadURL(name);
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

    res.json({ uploadURL, objectPath, metadata: { name, size, contentType } });
  } catch (error) {
    console.error("Error generating upload URL", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    console.error("Error serving public object", error);
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    // --- Protected route example (uncomment when using replit-auth) ---
    // if (!req.isAuthenticated()) {
    //   res.status(401).json({ error: "Unauthorized" });
    //   return;
    // }
    // const canAccess = await objectStorageService.canAccessObjectEntity({
    //   userId: req.user.id,
    //   objectFile,
    //   requestedPermission: ObjectPermission.READ,
    // });
    // if (!canAccess) {
    //   res.status(403).json({ error: "Forbidden" });
    //   return;
    // }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    console.error("Error serving object", error);
    res.status(500).json({ error: "Failed to serve object" });
  }
});

/**
 * GET /storage/thumb/objects/*?w=400
 * GET /storage/thumb/public-objects/*?w=400
 *
 * Serve a resized JPEG preview of an image asset. Non-images are passed through.
 * Use this for grids/previews; the original endpoints remain for HQ download.
 */
router.get("/storage/thumb/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectFile = await objectStorageService.getObjectEntityFile(`/objects/${wildcardPath}`);
    const w = Number(req.query.w) || 400;
    const width = ALLOWED_THUMB_WIDTHS.includes(w) ? w : 400;
    await streamThumbnail(objectFile, width, res);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    console.error("Error serving thumb", error);
    if (!res.headersSent) res.status(500).json({ error: "Failed to serve thumbnail" });
  }
});

router.get("/storage/thumb/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    const w = Number(req.query.w) || 400;
    const width = ALLOWED_THUMB_WIDTHS.includes(w) ? w : 400;
    await streamThumbnail(file, width, res);
  } catch (error) {
    console.error("Error serving public thumb", error);
    if (!res.headersSent) res.status(500).json({ error: "Failed to serve thumbnail" });
  }
});

export default router;
