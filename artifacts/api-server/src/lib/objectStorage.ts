import { Storage, File } from "@google-cloud/storage";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { createReadStream, createWriteStream } from "fs";
import { unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl.js";

const execFileAsync = promisify(execFile);

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;

      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  async downloadObject(
    file: File,
    cacheTtlSec: number = 3600,
    rangeHeader?: string,
    ifNoneMatch?: string,
    ifModifiedSince?: string,
  ): Promise<Response> {
    const [metadata] = await file.getMetadata();
    const aclPolicy = await getObjectAclPolicy(file);
    const isPublic = aclPolicy?.visibility === "public";
    const totalSize = metadata.size ? Number(metadata.size) : undefined;

    // Use GCS generation as ETag (changes on every re-upload) and updated
    // timestamp as Last-Modified so browsers can revalidate stale cache entries.
    const generation = metadata.generation ? String(metadata.generation) : null;
    const etag = generation
      ? `"${generation}"`
      : metadata.etag
        ? `"${String(metadata.etag)}"`
        : null;
    const lastModifiedRaw = metadata.updated ? String(metadata.updated) : null;
    const lastModified = lastModifiedRaw
      ? new Date(lastModifiedRaw).toUTCString()
      : null;

    // Conditional-GET: 304 Not Modified
    if (ifNoneMatch && etag) {
      const clientTags = ifNoneMatch.split(",").map((t) => t.trim());
      if (clientTags.includes(etag) || clientTags.includes("*")) {
        return new Response(null, { status: 304 });
      }
    } else if (!ifNoneMatch && ifModifiedSince && lastModified) {
      const sinceTime = new Date(ifModifiedSince).getTime();
      const modTime = new Date(lastModified).getTime();
      if (!isNaN(sinceTime) && !isNaN(modTime) && modTime <= sinceTime) {
        return new Response(null, { status: 304 });
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": (metadata.contentType as string) || "application/octet-stream",
      "Cache-Control": `${isPublic ? "public" : "private"}, max-age=${cacheTtlSec}, must-revalidate`,
      "Accept-Ranges": "bytes",
    };
    if (etag) headers["ETag"] = etag;
    if (lastModified) headers["Last-Modified"] = lastModified;

    if (rangeHeader && totalSize !== undefined) {
      const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2] ? Math.min(parseInt(match[2], 10), totalSize - 1) : totalSize - 1;
        const chunkSize = end - start + 1;
        headers["Content-Range"] = `bytes ${start}-${end}/${totalSize}`;
        headers["Content-Length"] = String(chunkSize);
        const nodeStream = file.createReadStream({ start, end });
        const webStream = Readable.toWeb(nodeStream) as ReadableStream;
        return new Response(webStream, { status: 206, headers });
      }
    }

    if (totalSize !== undefined) {
      headers["Content-Length"] = String(totalSize);
    }
    const nodeStream = file.createReadStream();
    const webStream = Readable.toWeb(nodeStream) as ReadableStream;
    return new Response(webStream, { headers });
  }

  /**
   * Reliably ensure an uploaded MP4/MOV has faststart (moov before mdat).
   * Uses ffprobe for atom-order detection — handles extended-size atoms and
   * large intermediate atoms that the old 8 KB probe window missed.
   * Downloads the file to a temp path, checks with ffprobe, remuxes only if
   * needed, then replaces the GCS object. Intended to be called fire-and-forget
   * right after a client upload completes (from the /uploads/process endpoint).
   * Returns a resolved promise regardless of outcome — errors are only logged.
   */
  async processVideoFaststart(file: File): Promise<void> {
    if (!/\.(mp4|mov|m4v)$/i.test(file.name)) return;

    const id = randomUUID();
    const tmpIn  = join(tmpdir(), `vf_in_${id}.mp4`);
    const tmpOut = join(tmpdir(), `vf_out_${id}.mp4`);
    const cleanup = () => { unlink(tmpIn).catch(() => {}); unlink(tmpOut).catch(() => {}); };

    try {
      // Download full file from GCS to local temp
      await pipeline(file.createReadStream(), createWriteStream(tmpIn));

      // Use ffprobe to detect atom order — reliable for all container layouts
      let needsFix = false;
      try {
        const { stderr } = await execFileAsync("ffprobe", ["-v", "trace", "-i", tmpIn]);
        const match = /\b(moov|mdat)\b/i.exec(stderr);
        needsFix = match?.[1]?.toLowerCase() === "mdat";
      } catch (probeErr: unknown) {
        // ffprobe exits non-zero on warnings; stderr still has trace output
        const stderr = (probeErr as { stderr?: string }).stderr ?? "";
        const match = /\b(moov|mdat)\b/i.exec(stderr);
        // If we can't detect atom order, assume it needs a fix to be safe
        needsFix = match ? match[1].toLowerCase() === "mdat" : true;
      }

      if (!needsFix) {
        console.info(`[faststart] ${file.name} already OK`);
        cleanup();
        return;
      }

      await execFileAsync("ffmpeg", ["-i", tmpIn, "-c", "copy", "-movflags", "faststart", "-y", tmpOut]);
      const ct = /\.mov$/i.test(file.name) ? "video/quicktime" : "video/mp4";
      await pipeline(
        createReadStream(tmpOut),
        file.createWriteStream({ metadata: { contentType: ct }, resumable: false }),
      );
      console.info(`[faststart] fixed ${file.name}`);
    } catch (err) {
      console.error(`[faststart] failed for ${file.name}:`, err);
    } finally {
      cleanup();
    }
  }

  /**
   * In-memory set of GCS object names confirmed OK (or already repaired) this
   * server session. Prevents re-downloading the same file on every serve.
   */
  private readonly _faststartChecked = new Set<string>();

  /**
   * Fire-and-forget serve-time safety net for files uploaded before upload-time
   * processing was added. Uses ffprobe (reliable for all atom layouts) and
   * caches results so each file is probed at most once per server session.
   */
  triggerFaststartIfNeeded(file: File): void {
    if (!/\.(mp4|mov|m4v)$/i.test(file.name)) return;
    if (this._faststartChecked.has(file.name)) return;
    // Mark immediately so concurrent requests don't queue duplicate repairs
    this._faststartChecked.add(file.name);
    void this.processVideoFaststart(file);
  }

  async getObjectEntityUploadURL(originalName?: string): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const ext = originalName?.includes(".")
      ? originalName.substring(originalName.lastIndexOf(".")).toLowerCase()
      : "";
    const fullPath = `${privateObjectDir}/uploads/${objectId}${ext}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json() as { signed_url: string };
  return signedURL;
}
