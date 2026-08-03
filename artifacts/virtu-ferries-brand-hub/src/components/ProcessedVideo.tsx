import { useEffect, useRef, useState, type VideoHTMLAttributes } from "react";
import { Loader2, VideoOff } from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type VideoStatus = {
  status: "processing" | "ready" | "failed";
  canonicalPath: string | null;
};

// ---------------------------------------------------------------------------
// Shared status cache + poller. All ProcessedVideo instances feed their
// object paths into one batched POST /api/storage/video-status request, so a
// grid of 20 video tiles makes one request per poll tick, not 20.
// ---------------------------------------------------------------------------

const statusCache = new Map<string, VideoStatus>();
const listeners = new Map<string, Set<(s: VideoStatus) => void>>();
const pendingPaths = new Set<string>();
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let fetching = false;

function notify(path: string, s: VideoStatus) {
  statusCache.set(path, s);
  listeners.get(path)?.forEach((fn) => fn(s));
}

async function fetchStatuses() {
  if (fetching) return;
  const paths = [...pendingPaths];
  if (paths.length === 0) return;
  fetching = true;
  try {
    const resp = await fetch(`${API}/api/storage/video-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ paths }),
    });
    if (resp.ok) {
      const data = (await resp.json()) as { statuses: Record<string, VideoStatus> };
      for (const p of paths) {
        const s = data.statuses[p];
        if (!s) continue;
        if (s.status === "ready" || s.status === "failed") pendingPaths.delete(p);
        notify(p, s);
      }
    }
  } catch {
    /* transient network error — next poll retries */
  } finally {
    fetching = false;
    schedulePoll();
  }
}

function schedulePoll() {
  if (pollTimer || pendingPaths.size === 0) return;
  pollTimer = setTimeout(() => {
    pollTimer = null;
    void fetchStatuses();
  }, 4000);
}

function subscribe(path: string, fn: (s: VideoStatus) => void): () => void {
  let set = listeners.get(path);
  if (!set) {
    set = new Set();
    listeners.set(path, set);
  }
  set.add(fn);

  const cached = statusCache.get(path);
  if (cached && (cached.status === "ready" || cached.status === "failed")) {
    fn(cached);
  } else {
    pendingPaths.add(path);
    // Kick an immediate fetch for newly-seen paths
    void fetchStatuses();
  }

  return () => {
    set!.delete(fn);
    if (set!.size === 0) listeners.delete(path);
  };
}

/** Extract the "/objects/..." object path from any storage URL, or null. */
export function objectPathFromUrl(url: string): string | null {
  const i = url.indexOf("/objects/");
  if (i < 0) return null;
  return url.slice(i).replace(/[?#].*$/, "");
}

function isProcessableVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v)(\?|#|$)/i.test(url) && objectPathFromUrl(url) !== null;
}

/**
 * Hook: resolve a raw video URL to its playable state.
 * - passthrough: URL isn't an /objects/ MP4/MOV (e.g. bundled /media asset) — play as-is
 * - processing / failed
 * - ready: `playableSrc` points at the canonical browser-delivery MP4
 */
export function useProcessedVideo(src: string): {
  state: "passthrough" | "processing" | "ready" | "failed";
  playableSrc: string | null;
} {
  const processable = isProcessableVideoUrl(src);
  const path = processable ? objectPathFromUrl(src) : null;
  const [status, setStatus] = useState<VideoStatus | null>(() =>
    path ? statusCache.get(path) ?? null : null,
  );
  const pathRef = useRef(path);
  pathRef.current = path;

  useEffect(() => {
    if (!path) return;
    return subscribe(path, (s) => {
      if (pathRef.current === path) setStatus({ ...s });
    });
  }, [path]);

  if (!processable) return { state: "passthrough", playableSrc: src };
  if (!status || status.status === "processing") return { state: "processing", playableSrc: null };
  if (status.status === "failed") return { state: "failed", playableSrc: null };
  return {
    state: "ready",
    playableSrc: status.canonicalPath ? `${API}/api/storage${status.canonicalPath}` : null,
  };
}

// ---------------------------------------------------------------------------
// Drop-in <video> replacement
// ---------------------------------------------------------------------------

type Props = VideoHTMLAttributes<HTMLVideoElement> & {
  src: string;
  /** Compact placeholder (icon only) for small thumbnail tiles */
  compact?: boolean;
};

export default function ProcessedVideo({ src, compact, className, ...videoProps }: Props) {
  const { state, playableSrc } = useProcessedVideo(src);

  if (state === "passthrough" || (state === "ready" && playableSrc)) {
    return <video src={playableSrc ?? src} className={className} {...videoProps} />;
  }

  if (state === "failed") {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1.5 bg-zinc-900 text-zinc-400 ${className ?? ""}`}
        style={{ minHeight: compact ? undefined : 120 }}
      >
        <VideoOff className={compact ? "w-4 h-4" : "w-6 h-6"} />
        {!compact && <span className="text-xs">Video processing failed</span>}
      </div>
    );
  }

  // processing
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1.5 bg-zinc-900 text-zinc-300 ${className ?? ""}`}
      style={{ minHeight: compact ? undefined : 120 }}
    >
      <Loader2 className={`animate-spin ${compact ? "w-4 h-4" : "w-6 h-6"}`} />
      {!compact && <span className="text-xs">Processing video…</span>}
    </div>
  );
}
