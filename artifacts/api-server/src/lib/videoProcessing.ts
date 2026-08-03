/**
 * Video processing pipeline — upload → processing → ready.
 *
 * Every uploaded MP4/MOV gets a canonical browser-delivery MP4 derivative:
 *   - already H.264 + AAC → remux with `-c copy -movflags +faststart`
 *   - anything else       → transcode to H.264/AAC, yuv420p, +faststart
 *
 * The original upload is never modified; only the canonical derivative is
 * exposed as the playable public asset. State is tracked in the
 * `video_derivatives` table: processing | ready | failed.
 *
 * ffmpeg/ffprobe are bundled npm dependencies (ffmpeg-static / ffprobe-static)
 * resolved to absolute paths in node_modules — no reliance on system PATH or
 * /nix/store, so the pipeline works identically in dev and production.
 */
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { createReadStream, createWriteStream, existsSync } from "node:fs";
import { stat, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { eq, inArray, sql } from "drizzle-orm";
import { db, videoDerivativesTable, type VideoDerivative } from "@workspace/db";
import type { ObjectStorageService } from "./objectStorage.js";
import { getObjectAclPolicy, setObjectAclPolicy } from "./objectAcl.js";

const execFileAsync = promisify(execFile);

export const VIDEO_EXT_RE = /\.(mp4|mov|m4v)$/i;
const CANONICAL_SUFFIX = "__canonical.mp4";

// ---------------------------------------------------------------------------
// Binary resolution — absolute paths from the bundled npm packages only.
// ---------------------------------------------------------------------------

export function getFfmpegPath(): string {
  const p = ffmpegPath as unknown as string | null;
  if (!p || !existsSync(p)) {
    throw new Error(
      `ffmpeg binary not found at "${p ?? "null"}" — the ffmpeg-static package did not install its binary (check pnpm onlyBuiltDependencies).`,
    );
  }
  return p;
}

export function getFfprobePath(): string {
  const p = ffprobeStatic.path;
  if (!p || !existsSync(p)) {
    throw new Error(`ffprobe binary not found at "${p ?? "null"}" (ffprobe-static).`);
  }
  return p;
}

/**
 * Startup check: verify both executables exist and run, log their versions.
 * Returns true when video processing is available. Failures are logged loudly.
 */
export async function verifyVideoProcessing(
  log: { info: (o: unknown, m?: string) => void; error: (o: unknown, m?: string) => void },
): Promise<boolean> {
  try {
    const ffmpeg = getFfmpegPath();
    const ffprobe = getFfprobePath();
    const [mpegOut, probeOut] = await Promise.all([
      execFileAsync(ffmpeg, ["-version"]),
      execFileAsync(ffprobe, ["-version"]),
    ]);
    log.info(
      {
        ffmpegPath: ffmpeg,
        ffmpegVersion: mpegOut.stdout.split("\n")[0],
        ffprobePath: ffprobe,
        ffprobeVersion: probeOut.stdout.split("\n")[0],
      },
      "Video processing available",
    );
    return true;
  } catch (err) {
    log.error(
      { err },
      "VIDEO PROCESSING UNAVAILABLE — uploaded videos cannot be made playable. " +
        "ffmpeg/ffprobe (ffmpeg-static/ffprobe-static npm packages) failed verification.",
    );
    return false;
  }
}

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

export function isVideoPath(objectPath: string): boolean {
  return VIDEO_EXT_RE.test(objectPath);
}

export function isCanonicalPath(objectPath: string): boolean {
  return objectPath.endsWith(CANONICAL_SUFFIX);
}

/** "/objects/uploads/x.mov" -> "/objects/uploads/x__canonical.mp4" */
export function canonicalPathFor(sourcePath: string): string {
  return sourcePath.replace(VIDEO_EXT_RE, "") + CANONICAL_SUFFIX;
}

// ---------------------------------------------------------------------------
// Local-file analysis + canonical build (pure w.r.t. the filesystem — no GCS,
// no DB — so they are directly unit-testable).
// ---------------------------------------------------------------------------

export interface VideoAnalysis {
  videoCodec: string | null;
  audioCodec: string | null;
  pixFmt: string | null;
  /** true when the moov atom precedes mdat (streamable as-is) */
  faststart: boolean;
  /** H.264 + (AAC or no audio) + yuv420p → safe to remux with -c copy */
  browserCompatible: boolean;
}

/**
 * Deterministic faststart detection: walk the top-level MP4/MOV box headers
 * in file order and report whether `moov` appears before `mdat`. Handles
 * 64-bit (largesize) and to-end-of-file (size 0) boxes.
 */
export async function detectFaststart(inputFile: string): Promise<boolean> {
  const { open } = await import("node:fs/promises");
  const fh = await open(inputFile, "r");
  try {
    const { size: fileSize } = await fh.stat();
    let offset = 0;
    const header = Buffer.alloc(16);
    while (offset + 8 <= fileSize) {
      const { bytesRead } = await fh.read(header, 0, 16, offset);
      if (bytesRead < 8) break;
      let boxSize: number = header.readUInt32BE(0);
      const type = header.toString("latin1", 4, 8);
      if (type === "moov") return true;
      if (type === "mdat") return false;
      if (boxSize === 1) {
        if (bytesRead < 16) break;
        boxSize = Number(header.readBigUInt64BE(8));
      } else if (boxSize === 0) {
        break; // box extends to end of file
      }
      if (boxSize < 8) break; // malformed
      offset += boxSize;
    }
    return false;
  } finally {
    await fh.close();
  }
}

export async function analyzeLocalVideo(inputFile: string): Promise<VideoAnalysis> {
  const ffprobe = getFfprobePath();

  const { stdout } = await execFileAsync(ffprobe, [
    "-v", "error",
    "-show_entries", "stream=codec_type,codec_name,pix_fmt",
    "-of", "json",
    inputFile,
  ]);
  const parsed = JSON.parse(stdout) as {
    streams?: Array<{ codec_type?: string; codec_name?: string; pix_fmt?: string }>;
  };
  const streams = parsed.streams ?? [];
  const v = streams.find((s) => s.codec_type === "video");
  const a = streams.find((s) => s.codec_type === "audio");

  const faststart = await detectFaststart(inputFile);

  const videoCodec = v?.codec_name ?? null;
  const audioCodec = a?.codec_name ?? null;
  const pixFmt = v?.pix_fmt ?? null;
  const browserCompatible =
    videoCodec === "h264" &&
    (audioCodec === null || audioCodec === "aac") &&
    (pixFmt === null || pixFmt === "yuv420p" || pixFmt === "yuvj420p");

  return { videoCodec, audioCodec, pixFmt, faststart, browserCompatible };
}

/**
 * Produce the canonical browser-delivery MP4 at `outputFile`.
 * Remuxes when the source is already browser-compatible, transcodes otherwise.
 * Returns which mode was used.
 */
export async function buildCanonicalLocal(
  inputFile: string,
  outputFile: string,
  analysis?: VideoAnalysis,
): Promise<"remux" | "transcode"> {
  const ffmpeg = getFfmpegPath();
  const a = analysis ?? (await analyzeLocalVideo(inputFile));

  const run = async (args: string[]) => {
    await execFileAsync(ffmpeg, ["-y", "-i", inputFile, ...args, outputFile], {
      maxBuffer: 16 * 1024 * 1024,
    });
    const st = await stat(outputFile);
    if (st.size === 0) throw new Error("ffmpeg produced an empty output file");
  };

  if (a.browserCompatible) {
    try {
      await run(["-c", "copy", "-movflags", "+faststart"]);
      return "remux";
    } catch {
      // Fall through to a full transcode — copy can fail on odd containers.
    }
  }

  await run([
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "22",
    "-pix_fmt", "yuv420p",
    // Ensure even dimensions (libx264/yuv420p requirement)
    "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-c:a", "aac",
    "-b:a", "128k",
    "-ar", "48000",
    "-ac", "2",
    "-movflags", "+faststart",
  ]);
  return "transcode";
}

// ---------------------------------------------------------------------------
// End-to-end job: GCS download → build canonical → GCS upload → DB status
// ---------------------------------------------------------------------------

const _inFlight = new Map<string, Promise<void>>();

async function upsertStatus(
  sourcePath: string,
  fields: Partial<Pick<VideoDerivative, "status" | "canonical_path" | "error">>,
): Promise<void> {
  await db
    .insert(videoDerivativesTable)
    .values({
      source_path: sourcePath,
      status: fields.status ?? "processing",
      canonical_path: fields.canonical_path ?? null,
      error: fields.error ?? null,
    })
    .onConflictDoUpdate({
      target: videoDerivativesTable.source_path,
      set: {
        ...(fields.status !== undefined ? { status: fields.status } : {}),
        ...(fields.canonical_path !== undefined ? { canonical_path: fields.canonical_path } : {}),
        ...(fields.error !== undefined ? { error: fields.error } : {}),
        updated_at: sql`now()`,
      },
    });
}

/**
 * Process one uploaded video: mark processing, build the canonical MP4,
 * upload it next to the original, mark ready (or failed). Deduplicates
 * concurrent calls for the same source path. Never throws.
 */
export function processVideo(
  storage: ObjectStorageService,
  sourcePath: string,
): Promise<void> {
  if (!isVideoPath(sourcePath) || isCanonicalPath(sourcePath)) {
    return Promise.resolve();
  }
  const existing = _inFlight.get(sourcePath);
  if (existing) return existing;

  const job = (async () => {
    const id = randomUUID();
    const ext = sourcePath.slice(sourcePath.lastIndexOf(".")).toLowerCase() || ".mp4";
    const tmpIn = join(tmpdir(), `vp_in_${id}${ext}`);
    const tmpOut = join(tmpdir(), `vp_out_${id}.mp4`);
    const cleanup = () => {
      unlink(tmpIn).catch(() => {});
      unlink(tmpOut).catch(() => {});
    };

    try {
      await upsertStatus(sourcePath, { status: "processing", error: null });

      const sourceFile = await storage.getObjectEntityFile(sourcePath);
      await pipeline(sourceFile.createReadStream(), createWriteStream(tmpIn));

      const analysis = await analyzeLocalVideo(tmpIn);
      const mode = await buildCanonicalLocal(tmpIn, tmpOut, analysis);

      const canonicalPath = canonicalPathFor(sourcePath);
      const canonicalFile = storage.getObjectEntityFileRef(canonicalPath);
      await pipeline(
        createReadStream(tmpOut),
        canonicalFile.createWriteStream({
          metadata: { contentType: "video/mp4" },
          resumable: false,
        }),
      );

      // Mirror the original's ACL so the canonical file is servable wherever
      // the original was (e.g. public share pages).
      try {
        const acl = await getObjectAclPolicy(sourceFile);
        if (acl) await setObjectAclPolicy(canonicalFile, acl);
      } catch {
        /* ACL copy is best-effort */
      }

      await upsertStatus(sourcePath, {
        status: "ready",
        canonical_path: canonicalPath,
        error: null,
      });
      console.info(`[video] ${mode} complete: ${sourcePath} -> ${canonicalPath}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[video] processing failed for ${sourcePath}:`, err);
      await upsertStatus(sourcePath, { status: "failed", error: message }).catch(() => {});
    } finally {
      cleanup();
      _inFlight.delete(sourcePath);
    }
  })();

  _inFlight.set(sourcePath, job);
  return job;
}

// ---------------------------------------------------------------------------
// Status lookup (with lazy backfill for legacy videos that predate this table)
// ---------------------------------------------------------------------------

export interface VideoStatus {
  status: "processing" | "ready" | "failed";
  canonicalPath: string | null;
}

/**
 * Return the processing status for each requested source path.
 * Videos never seen before are enqueued for processing automatically
 * (lazy backfill of legacy uploads) and reported as "processing".
 */
export async function getVideoStatuses(
  storage: ObjectStorageService,
  paths: string[],
): Promise<Record<string, VideoStatus>> {
  const videoPaths = [...new Set(paths.filter((p) => isVideoPath(p) && p.startsWith("/objects/")))].slice(0, 100);
  if (videoPaths.length === 0) return {};

  const rows = videoPaths.length
    ? await db
        .select()
        .from(videoDerivativesTable)
        .where(inArray(videoDerivativesTable.source_path, videoPaths))
    : [];
  const byPath = new Map(rows.map((r) => [r.source_path, r]));

  const result: Record<string, VideoStatus> = {};
  for (const p of videoPaths) {
    const row = byPath.get(p);
    if (!row) {
      // Legacy video with no derivative row. Only enqueue after confirming
      // the object actually exists — the endpoint is public, and enqueuing
      // unverified paths would let anyone create DB rows / background work
      // for made-up paths.
      void (async () => {
        try {
          await storage.getObjectEntityFile(p); // throws if missing
        } catch {
          return; // nonexistent object — no row, no processing
        }
        void processVideo(storage, p);
      })();
      result[p] = { status: "processing", canonicalPath: null };
    } else if (row.status === "ready" && row.canonical_path) {
      result[p] = { status: "ready", canonicalPath: row.canonical_path };
    } else if (row.status === "failed") {
      result[p] = { status: "failed", canonicalPath: null };
    } else {
      // processing — if the row is stale (e.g. server restarted mid-job with
      // no in-flight entry), re-enqueue.
      if (!_inFlight.has(p)) void processVideo(storage, p);
      result[p] = { status: "processing", canonicalPath: null };
    }
  }
  return result;
}
