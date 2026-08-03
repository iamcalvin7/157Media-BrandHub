/**
 * Regression tests for the video upload → processing → ready pipeline.
 *
 * Fixture videos are generated on the fly with the bundled ffmpeg, so the
 * suite is self-contained and runs identically in any environment (the same
 * property that makes production video processing work).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, createReadStream, statSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { tmpdir } from "node:os";
import {
  getFfmpegPath,
  getFfprobePath,
  verifyVideoProcessing,
  analyzeLocalVideo,
  buildCanonicalLocal,
  canonicalPathFor,
  isVideoPath,
  isCanonicalPath,
  getVideoStatuses,
} from "../videoProcessing.js";
import { db, videoDerivativesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

let dir: string;
let ffmpeg: string;

// Fixture builders -----------------------------------------------------------

function gen(args: string[], out: string): string {
  const p = join(dir, out);
  execFileSync(ffmpeg, ["-y", ...args, p], { stdio: "pipe" });
  return p;
}

/** 1s H.264/AAC clip. faststart=true adds +faststart; default leaves moov at end. */
function genH264(out: string, opts: { faststart?: boolean; container?: "mp4" | "mov" } = {}): string {
  const args = [
    "-f", "lavfi", "-i", "testsrc=duration=1:size=128x72:rate=10",
    "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
    "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest",
  ];
  if (opts.faststart) args.push("-movflags", "+faststart");
  return gen(args, out);
}

/** 1s MOV with a non-browser codec (mpeg4 video, pcm audio) — needs transcoding. */
function genIncompatibleMov(out: string): string {
  return gen(
    [
      "-f", "lavfi", "-i", "testsrc=duration=1:size=128x72:rate=10",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
      "-c:v", "mpeg4", "-c:a", "pcm_s16le", "-shortest",
    ],
    out,
  );
}

beforeAll(() => {
  ffmpeg = getFfmpegPath();
  dir = mkdtempSync(join(tmpdir(), "vp-test-"));
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

// ----------------------------------------------------------------------------
// Binary resolution — the "works in production without dev" guarantee.
// Paths must be absolute node_modules paths, independent of PATH / /nix/store.
// ----------------------------------------------------------------------------

describe("bundled binaries", () => {
  it("resolves ffmpeg and ffprobe to absolute paths inside node_modules", () => {
    for (const p of [getFfmpegPath(), getFfprobePath()]) {
      expect(isAbsolute(p)).toBe(true);
      expect(p).toContain("node_modules");
      expect(p).not.toContain("/nix/store");
      expect(statSync(p).size).toBeGreaterThan(0);
    }
  });

  it("startup check verifies both executables and logs versions", async () => {
    const logs: string[] = [];
    const ok = await verifyVideoProcessing({
      info: (o) => logs.push(JSON.stringify(o)),
      error: (o) => logs.push(`ERR ${JSON.stringify(o)}`),
    });
    expect(ok).toBe(true);
    expect(logs.join("")).toContain("ffmpeg version");
    expect(logs.join("")).toContain("ffprobe version");
  });
});

// ----------------------------------------------------------------------------
// Analysis + canonical build scenarios
// ----------------------------------------------------------------------------

describe("analyzeLocalVideo / buildCanonicalLocal", () => {
  it("MP4 with moov at the end → detected non-faststart, remuxed to faststart", async () => {
    const input = genH264("moov-at-end.mp4");
    const analysis = await analyzeLocalVideo(input);
    expect(analysis.faststart).toBe(false); // default ffmpeg output: moov last
    expect(analysis.browserCompatible).toBe(true);

    const out = join(dir, "moov-at-end.canonical.mp4");
    const mode = await buildCanonicalLocal(input, out, analysis);
    expect(mode).toBe("remux");
    const outAnalysis = await analyzeLocalVideo(out);
    expect(outAnalysis.faststart).toBe(true);
    expect(outAnalysis.videoCodec).toBe("h264");
    expect(outAnalysis.audioCodec).toBe("aac");
  });

  it("MP4 already faststart → still produces a valid faststart canonical via remux", async () => {
    const input = genH264("already-fast.mp4", { faststart: true });
    const analysis = await analyzeLocalVideo(input);
    expect(analysis.faststart).toBe(true);
    expect(analysis.browserCompatible).toBe(true);

    const out = join(dir, "already-fast.canonical.mp4");
    const mode = await buildCanonicalLocal(input, out, analysis);
    expect(mode).toBe("remux");
    expect((await analyzeLocalVideo(out)).faststart).toBe(true);
  });

  it("MOV with browser-compatible codecs → remuxed to faststart MP4", async () => {
    const input = genH264("compatible.mov", { container: "mov" });
    const analysis = await analyzeLocalVideo(input);
    expect(analysis.videoCodec).toBe("h264");
    expect(analysis.browserCompatible).toBe(true);

    const out = join(dir, "compatible.canonical.mp4");
    const mode = await buildCanonicalLocal(input, out, analysis);
    expect(mode).toBe("remux");
    const outAnalysis = await analyzeLocalVideo(out);
    expect(outAnalysis.faststart).toBe(true);
    expect(outAnalysis.videoCodec).toBe("h264");
  });

  it("MOV requiring transcoding → transcoded to H.264/AAC yuv420p faststart", async () => {
    const input = genIncompatibleMov("incompatible.mov");
    const analysis = await analyzeLocalVideo(input);
    expect(analysis.browserCompatible).toBe(false);

    const out = join(dir, "incompatible.canonical.mp4");
    const mode = await buildCanonicalLocal(input, out, analysis);
    expect(mode).toBe("transcode");
    const outAnalysis = await analyzeLocalVideo(out);
    expect(outAnalysis.faststart).toBe(true);
    expect(outAnalysis.videoCodec).toBe("h264");
    expect(outAnalysis.audioCodec).toBe("aac");
    expect(outAnalysis.pixFmt).toBe("yuv420p");
  });

  it("processing failure: corrupt input → build throws (job marks status failed)", async () => {
    const input = join(dir, "corrupt.mp4");
    writeFileSync(input, Buffer.from("this is definitely not a video file"));
    const out = join(dir, "corrupt.canonical.mp4");
    await expect(buildCanonicalLocal(input, out)).rejects.toThrow();
  });
});

// ----------------------------------------------------------------------------
// Path helpers
// ----------------------------------------------------------------------------

describe("path helpers", () => {
  it("maps source paths to canonical MP4 paths", () => {
    expect(canonicalPathFor("/objects/uploads/x.mov")).toBe("/objects/uploads/x__canonical.mp4");
    expect(canonicalPathFor("/objects/uploads/x.MP4")).toBe("/objects/uploads/x__canonical.mp4");
    expect(isVideoPath("/objects/uploads/x.mov")).toBe(true);
    expect(isVideoPath("/objects/uploads/x.png")).toBe(false);
    expect(isCanonicalPath("/objects/uploads/x__canonical.mp4")).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// Status lifecycle: video requested before processing completes
// ----------------------------------------------------------------------------

describe("video status lifecycle", () => {
  const testPath = `/objects/uploads/vitest-${Date.now()}.mp4`;

  afterAll(async () => {
    await db.delete(videoDerivativesTable).where(eq(videoDerivativesTable.source_path, testPath));
  });

  it("reports 'processing' (not the original file) while the derivative is being built", async () => {
    // Simulate an in-progress job row
    await db.insert(videoDerivativesTable).values({ source_path: testPath, status: "processing" });

    // Fake storage that would fail loudly if the status check tried to touch GCS
    const fakeStorage = {
      getObjectEntityFile: async () => { throw new Error("should not download during status check"); },
      getObjectEntityFileRef: () => { throw new Error("should not write during status check"); },
    } as never;

    const statuses = await getVideoStatuses(fakeStorage, [testPath]);
    expect(statuses[testPath]).toBeDefined();
    // Never expose a playable asset before the canonical derivative is ready
    expect(statuses[testPath].canonicalPath).toBeNull();
    expect(["processing", "failed"]).toContain(statuses[testPath].status);
  });

  it("reports 'ready' with the canonical path once processing completes", async () => {
    await db
      .update(videoDerivativesTable)
      .set({ status: "ready", canonical_path: canonicalPathFor(testPath) })
      .where(eq(videoDerivativesTable.source_path, testPath));

    const statuses = await getVideoStatuses({} as never, [testPath]);
    expect(statuses[testPath].status).toBe("ready");
    expect(statuses[testPath].canonicalPath).toBe(canonicalPathFor(testPath));
  });
});

// ----------------------------------------------------------------------------
// HTTP range delivery of the finished derivative
// ----------------------------------------------------------------------------

describe("range delivery", () => {
  it("serves 206 partial content with correct Content-Range for the canonical MP4", async () => {
    const { ObjectStorageService } = await import("../objectStorage.js");
    const svc = new ObjectStorageService();

    const local = genH264("range-test.mp4", { faststart: true });
    const size = statSync(local).size;

    // Fake GCS File backed by the local canonical derivative
    const fakeFile = {
      name: "uploads/range-test__canonical.mp4",
      getMetadata: async () => [
        { size: String(size), contentType: "video/mp4", generation: "123", updated: new Date().toISOString(), metadata: {} },
      ],
      createReadStream: (opts?: { start?: number; end?: number }) =>
        createReadStream(local, opts && opts.start !== undefined ? { start: opts.start, end: opts.end } : undefined),
    } as never;

    const response = await svc.downloadObject(fakeFile, 3600, "bytes=0-1023");
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe(`bytes 0-1023/${size}`);
    expect(response.headers.get("Content-Length")).toBe("1024");
    expect(response.headers.get("Accept-Ranges")).toBe("bytes");
    const buf = Buffer.from(await response.arrayBuffer());
    expect(buf.length).toBe(1024);
    // MP4 signature: bytes 4-8 are "ftyp"
    expect(buf.subarray(4, 8).toString()).toBe("ftyp");

    // Open-ended tail range
    const tail = await svc.downloadObject(fakeFile, 3600, `bytes=${size - 100}-`);
    expect(tail.status).toBe(206);
    expect(tail.headers.get("Content-Range")).toBe(`bytes ${size - 100}-${size - 1}/${size}`);
  });
});
