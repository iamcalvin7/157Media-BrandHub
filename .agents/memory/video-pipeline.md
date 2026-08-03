---
name: Video processing pipeline
description: How uploaded videos become playable, and the ffmpeg-static / moov-detection gotchas
---

## Rule
Uploaded MP4/MOV videos are never played directly. A canonical browser-delivery MP4 (`<base>__canonical.mp4`, H.264/AAC/yuv420p/+faststart) is generated per upload and tracked in `video_derivatives` (processing/ready/failed). The frontend `ProcessedVideo` component polls the public `/api/storage/video-status` endpoint and only plays the canonical file. Legacy videos are lazily backfilled on first status query (only after confirming the object exists — the endpoint is public).

**Why:** Production deploy images have no system ffmpeg (`spawn ffmpeg ENOENT`), and non-faststart or non-H.264 uploads render as black dead players. Serve-time repair was too late ("broken on first view").

**How to apply:** Any new UI that renders an uploaded video must use `ProcessedVideo`/`useProcessedVideo`, never a raw `<video>` with the original URL.

## Gotchas learned the hard way
- `ffmpeg-static` downloads its binary in a *postinstall* script — pnpm blocks it unless `ffmpeg-static` is in `onlyBuiltDependencies` in pnpm-workspace.yaml. Without it, the resolved path exists but the file doesn't.
- `ffmpeg-static`/`ffprobe-static` compute paths via `__dirname`, so they MUST be in esbuild `external` (api-server build.mjs), or the bundled path points at dist/.
- ffprobe `-v trace` output is NOT reliable for moov/mdat order detection — it mentions `moov` while seeking even when the atom is at the end. Use the deterministic top-level box walker `detectFaststart()` in `videoProcessing.ts` instead.
- Regression tests generate fixtures with the bundled ffmpeg (`vitest run` in api-server); default ffmpeg output on modern versions may already be faststart for some muxers — assert via the box walker, not assumptions.
