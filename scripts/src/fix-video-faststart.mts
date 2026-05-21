/**
 * One-time script: remux all uploaded MP4/MOV files in object storage
 * so the moov atom is at the START of the file (MP4 faststart).
 * Without faststart, browsers cannot play the video until the entire file
 * is downloaded — they show 0:00 and a black screen.
 *
 * Run: pnpm --filter @workspace/scripts run fix-video-faststart
 */
import { Storage } from "@google-cloud/storage";
import { execFile } from "child_process";
import { promisify } from "util";
import { createWriteStream, createReadStream } from "fs";
import { unlink, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const execFileAsync = promisify(execFile);

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

const PRIVATE_DIR = process.env.PRIVATE_OBJECT_DIR ?? "";
if (!PRIVATE_DIR) {
  console.error("PRIVATE_OBJECT_DIR not set");
  process.exit(1);
}

const dirParts = PRIVATE_DIR.replace(/^\//, "").split("/");
const BUCKET_NAME = dirParts[0]!;
const OBJECT_PREFIX = dirParts.slice(1).join("/");

/** Read first 8 KB of a GCS file and determine if moov comes before mdat */
async function isFaststart(objectName: string): Promise<boolean> {
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(objectName);
  const chunks: Buffer[] = [];
  const stream = file.createReadStream({ start: 0, end: 8191 });
  await new Promise<void>((resolve, reject) => {
    stream.on("data", (c: Buffer) => chunks.push(Buffer.from(c)));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  const buf = Buffer.concat(chunks);

  // Walk top-level MP4 boxes to find order of moov vs mdat
  let pos = 0;
  while (pos + 8 <= buf.length) {
    const size = buf.readUInt32BE(pos);
    const type = buf.subarray(pos + 4, pos + 8).toString("ascii");
    if (type === "moov") return true;
    if (type === "mdat") return false;
    if (size < 8) break;
    pos += size;
  }
  return false; // moov not found in first 8 KB → not faststart
}

/** Download a GCS object to a local temp file */
async function downloadToTemp(objectName: string, tmpPath: string): Promise<void> {
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(objectName);
  await pipeline(file.createReadStream(), createWriteStream(tmpPath));
}

/** Upload a local file back to GCS, replacing the original */
async function uploadFromTemp(objectName: string, tmpPath: string, contentType: string): Promise<void> {
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(objectName);
  await pipeline(
    createReadStream(tmpPath),
    file.createWriteStream({ metadata: { contentType }, resumable: false }),
  );
}

async function main() {
  const bucket = storage.bucket(BUCKET_NAME);
  const uploadsPrefix = `${OBJECT_PREFIX}/uploads/`;
  console.log(`Scanning gs://${BUCKET_NAME}/${uploadsPrefix} for videos…`);

  const [files] = await bucket.getFiles({ prefix: uploadsPrefix });
  const videos = files.filter(f => /\.(mp4|mov|m4v)$/i.test(f.name));
  console.log(`Found ${videos.length} video file(s)`);

  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (const gcsFile of videos) {
    const objectName = gcsFile.name;
    const baseName = objectName.split("/").pop()!;
    process.stdout.write(`  ${baseName} … `);

    try {
      const alreadyFast = await isFaststart(objectName);
      if (alreadyFast) {
        console.log("already faststart, skipping");
        skipped++;
        continue;
      }

      const tmpIn  = join(tmpdir(), `vf_in_${baseName}`);
      const tmpOut = join(tmpdir(), `vf_out_${baseName}`);

      process.stdout.write("downloading… ");
      await downloadToTemp(objectName, tmpIn);
      const inSize = (await stat(tmpIn)).size;
      process.stdout.write(`${(inSize / 1048576).toFixed(1)} MB — remuxing… `);

      await execFileAsync("ffmpeg", [
        "-i", tmpIn,
        "-c", "copy",
        "-movflags", "faststart",
        "-y", tmpOut,
      ]);

      process.stdout.write("uploading… ");
      const ct = /\.mov$/i.test(baseName) ? "video/quicktime" : "video/mp4";
      await uploadFromTemp(objectName, tmpOut, ct);

      await unlink(tmpIn).catch(() => {});
      await unlink(tmpOut).catch(() => {});

      console.log("done ✓");
      fixed++;
    } catch (err) {
      console.log(`FAILED: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\nDone. Fixed: ${fixed}  Already OK: ${skipped}  Failed: ${failed}`);
}

main().catch(err => { console.error(err); process.exit(1); });
