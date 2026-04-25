import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useBrand } from "@/lib/brand";
import { queryClient } from "@/lib/queryClient";
import { useBrandContent } from "@/lib/brand-content";
import {
  Globe, Loader2, Play, Trash2, ChevronRight, ChevronDown,
  CheckCircle2, AlertCircle, Clock, ExternalLink, FileText, Search,
  EyeOff, Eye, RotateCcw, Copy, Check,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type ScraperJob = {
  id: number;
  brand_id: number;
  root_url: string;
  status: "queued" | "running" | "done" | "failed";
  error: string | null;
  page_count: number;
  max_pages: number;
  max_depth: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
};

type ScraperPage = {
  id: number;
  job_id: number;
  url: string;
  title: string | null;
  content: string | null;
  status_code: number | null;
  depth: number;
  fetched_at: string;
};

type JobDetail = { job: ScraperJob; pages: ScraperPage[] };

// ---------- reviewed-state persistence (localStorage per job) ----------

function reviewedKey(jobId: number) {
  return `scraper:reviewed:job-${jobId}`;
}

function useReviewedPages(jobId: number) {
  const [reviewed, setReviewed] = useState<Set<number>>(() => new Set());

  // Load on mount / job change
  useEffect(() => {
    try {
      const raw = localStorage.getItem(reviewedKey(jobId));
      if (raw) {
        const arr = JSON.parse(raw) as number[];
        setReviewed(new Set(arr));
      } else {
        setReviewed(new Set());
      }
    } catch {
      setReviewed(new Set());
    }
  }, [jobId]);

  const persist = useCallback(
    (next: Set<number>) => {
      try {
        localStorage.setItem(reviewedKey(jobId), JSON.stringify([...next]));
      } catch {
        // storage full or disabled — silently ignore, in-memory state still works
      }
    },
    [jobId],
  );

  const toggle = useCallback(
    (pageId: number) => {
      setReviewed((prev) => {
        const next = new Set(prev);
        if (next.has(pageId)) next.delete(pageId);
        else next.add(pageId);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const reset = useCallback(() => {
    setReviewed(new Set());
    try {
      localStorage.removeItem(reviewedKey(jobId));
    } catch {
      /* ignore */
    }
  }, [jobId]);

  return { reviewed, toggle, reset };
}

// ---------- small UI helpers ----------

function statusPill(status: ScraperJob["status"]) {
  const map: Record<ScraperJob["status"], { label: string; cls: string; icon: React.ReactNode }> = {
    queued: { label: "Queued", cls: "bg-[#1A1A1A] text-[#A1A1AA] border-[#2A2A2A]", icon: <Clock className="w-3 h-3" /> },
    running: { label: "Crawling", cls: "bg-[#39A15F]/15 text-[#39A15F] border-[#39A15F]/30", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    done: { label: "Done", cls: "bg-[#39A15F]/15 text-[#39A15F] border-[#39A15F]/30", icon: <CheckCircle2 className="w-3 h-3" /> },
    failed: { label: "Failed", cls: "bg-red-500/15 text-red-400 border-red-500/30", icon: <AlertCircle className="w-3 h-3" /> },
  };
  const m = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-medium ${m.cls}`}>
      {m.icon}
      {m.label}
    </span>
  );
}

function splitUrl(rawUrl: string): { host: string; path: string } {
  try {
    const u = new URL(rawUrl);
    const path = `${u.pathname}${u.search}` || "/";
    return { host: u.host, path };
  } catch {
    return { host: "", path: rawUrl };
  }
}

// Scraped HTML often becomes text with long runs of blank lines, leading
// whitespace, and "menu link link link" navigation droppings. Tidy this up
// so the displayed body actually looks like prose, not a void.
function cleanScrapedText(raw: string): string {
  return raw
    // Normalize line endings
    .replace(/\r\n?/g, "\n")
    // Strip trailing whitespace on every line
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, "").replace(/^[ \t]+/, (m) => (l.trim() ? m : "")))
    .join("\n")
    // Collapse 3+ consecutive newlines down to a single blank line
    .replace(/\n{3,}/g, "\n\n")
    // Collapse 4+ spaces in the middle of a line down to 2 (preserves indentation a bit)
    .replace(/([^\n]) {4,}/g, "$1  ")
    .trim();
}

function firstSnippet(raw: string, limit = 180): string {
  const cleaned = cleanScrapedText(raw).replace(/\n+/g, " · ");
  return cleaned.length > limit ? cleaned.slice(0, limit) + "…" : cleaned;
}

// ---------- start form ----------

function StartForm({ onStarted }: { onStarted: (job: ScraperJob) => void }) {
  const [rootUrl, setRootUrl] = useState("");
  const [maxPages, setMaxPages] = useState(200);
  const [error, setError] = useState<string | null>(null);

  const start = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API}/api/scraper/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rootUrl, maxPages, maxDepth: 5 }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Request failed (${res.status})`);
      }
      return (await res.json()) as ScraperJob;
    },
    onSuccess: (job) => {
      setRootUrl("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["scraper-jobs"] });
      onStarted(job);
    },
    onError: (err: Error) => setError(err.message),
  });

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#39A15F]/15 border border-[#39A15F]/30 flex items-center justify-center shrink-0">
          <Globe className="w-5 h-5 text-[#39A15F]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#FAFAFA]">Crawl a website</h2>
          <p className="text-sm text-[#A1A1AA] font-light mt-0.5">
            Enter a starting URL. The crawler follows internal links across the same host and stores every page it finds.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-3">
        <input
          type="url"
          inputMode="url"
          placeholder="https://example.com"
          value={rootUrl}
          onChange={(e) => setRootUrl(e.target.value)}
          disabled={start.isPending}
          className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:ring-2 focus:ring-[#39A15F]/60 focus:border-transparent disabled:opacity-60"
          data-testid="input-scraper-url"
        />
        <input
          type="number"
          min={1}
          max={500}
          value={maxPages}
          onChange={(e) => setMaxPages(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
          disabled={start.isPending}
          aria-label="Max pages"
          title="Max pages"
          className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-4 py-2.5 text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#39A15F]/60 disabled:opacity-60"
          data-testid="input-scraper-max-pages"
        />
        <button
          onClick={() => {
            if (!rootUrl.trim()) {
              setError("Enter a URL to start.");
              return;
            }
            start.mutate();
          }}
          disabled={start.isPending}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#39A15F] hover:bg-[#2F8C50] text-white font-medium transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39A15F]/70"
          data-testid="button-start-scrape"
        >
          {start.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Start crawl
        </button>
      </div>
      <div className="flex items-center justify-between text-xs text-[#71717A]">
        <span>Same host only · depth 5 · respects robots.txt</span>
        {error && <span className="text-red-400" data-testid="text-scraper-error">{error}</span>}
      </div>
    </div>
  );
}

// ---------- job row (with progress bar) ----------

function JobRow({
  job,
  selected,
  reviewedCount,
  onSelect,
  onDelete,
}: {
  job: ScraperJob;
  selected: boolean;
  reviewedCount: number;
  onSelect: () => void;
  onDelete: () => void;
}) {
  let host = job.root_url;
  try { host = new URL(job.root_url).host; } catch { /* keep raw */ }

  const total = Math.max(job.page_count, 1);
  const pagesPct = Math.min(100, Math.round((job.page_count / Math.max(job.max_pages, 1)) * 100));
  const reviewedPct = Math.min(100, Math.round((reviewedCount / total) * 100));

  return (
    <div
      className={`bg-[#141414] border rounded-2xl px-5 py-4 transition-all ${
        selected ? "border-[#39A15F]/60 shadow-[0_0_0_1px_rgba(57,161,95,0.15)]" : "border-[#262626] hover:border-[#3A3A3A]"
      }`}
      data-testid={`row-job-${job.id}`}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onSelect}
          className="flex-1 flex items-center gap-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39A15F]/60 rounded-lg"
        >
          {selected ? (
            <ChevronDown className="w-4 h-4 text-[#71717A] shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-[#71717A] shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <span className="text-sm font-medium text-[#FAFAFA] truncate">{host}</span>
              {statusPill(job.status)}
              {job.page_count > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#39A15F]/90 bg-[#39A15F]/10 border border-[#39A15F]/20 rounded-md px-1.5 py-0.5">
                  <CheckCircle2 className="w-3 h-3" />
                  {reviewedCount} / {job.page_count} reviewed
                </span>
              )}
            </div>
            <div className="text-xs text-[#71717A] font-mono truncate">{job.root_url}</div>
          </div>
          <div className="hidden md:flex flex-col items-end gap-0.5 shrink-0">
            <span className="text-sm text-[#FAFAFA] tabular-nums">
              {job.page_count} <span className="text-[#71717A]">/ {job.max_pages} pages</span>
            </span>
            <span className="text-xs text-[#71717A]">
              {job.finished_at
                ? `finished ${formatDistanceToNow(new Date(job.finished_at), { addSuffix: true })}`
                : job.started_at
                  ? `started ${formatDistanceToNow(new Date(job.started_at), { addSuffix: true })}`
                  : `created ${formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}`}
            </span>
          </div>
        </button>
        <button
          onClick={() => {
            if (confirm("Delete this crawl and all its pages?")) onDelete();
          }}
          className="p-2 rounded-lg text-[#71717A] hover:text-red-400 hover:bg-red-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
          aria-label="Delete crawl"
          data-testid={`button-delete-job-${job.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* progress bar — pages crawled (base) overlaid with reviewed (green) */}
      {job.page_count > 0 && (
        <div className="mt-3 ml-7">
          <div className="relative h-1.5 rounded-full bg-[#1F1F1F] overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-[#39A15F]/25"
              style={{ width: `${pagesPct}%` }}
              aria-hidden
            />
            <div
              className="absolute inset-y-0 left-0 bg-[#39A15F]"
              style={{ width: `${(pagesPct * reviewedPct) / 100}%` }}
              aria-hidden
            />
          </div>
        </div>
      )}

      {job.error && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
          {job.error}
        </div>
      )}
    </div>
  );
}

// ---------- page row (compact list with reveal-on-click) ----------

function PageRow({
  page,
  reviewed,
  onToggle,
}: {
  page: ScraperPage;
  reviewed: boolean;
  onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = page.content || "";
  const cleaned = useMemo(() => cleanScrapedText(text), [text]);
  const snippet = useMemo(() => firstSnippet(text), [text]);
  const { host, path } = splitUrl(page.url);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(cleaned);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available — silently ignore */
    }
  }

  return (
    <div
      className={`group relative bg-[#141414] border rounded-xl transition-all ${
        reviewed
          ? "border-[#39A15F]/40"
          : "border-[#262626] hover:border-[#3A3A3A]"
      }`}
      data-testid={`card-page-${page.id}`}
    >
      {reviewed && (
        <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-[#39A15F]" aria-hidden />
      )}

      {/* Compact clickable row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left flex items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39A15F]/60 rounded-xl"
      >
        {/* Big, obvious checkbox */}
        <span
          role="checkbox"
          aria-checked={reviewed}
          aria-label={reviewed ? "Mark page as not reviewed" : "Mark page as reviewed"}
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              onToggle();
            }
          }}
          data-testid={`checkbox-page-${page.id}`}
          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 transition-all cursor-pointer ${
            reviewed
              ? "bg-[#39A15F] border-[#39A15F] text-white"
              : "bg-transparent border-[#3A3A3A] hover:border-[#39A15F]/80 hover:bg-[#39A15F]/5 text-transparent"
          }`}
        >
          <Check className="w-4 h-4" strokeWidth={3} />
        </span>

        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`text-sm font-semibold truncate ${
                reviewed ? "text-[#71717A] line-through decoration-[#39A15F]/40" : "text-[#FAFAFA]"
              }`}
            >
              {page.title || <span className="italic text-[#71717A]">(no title)</span>}
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1F1F1F] text-[#71717A] shrink-0">
              d{page.depth}
            </span>
            {page.status_code && page.status_code !== 200 && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                {page.status_code}
              </span>
            )}
            {text && (
              <span className="text-[10px] font-mono text-[#52525B] shrink-0">
                {cleaned.length.toLocaleString()} chars
              </span>
            )}
          </div>

          {/* Path */}
          <div className="text-xs font-mono mt-0.5 truncate" title={page.url}>
            <span className="text-[#52525B]">{host}</span>
            <span className="text-[#A1A1AA]">{path}</span>
          </div>

          {/* One-line snippet (only when collapsed) */}
          {!expanded && text && (
            <p className="text-xs text-[#71717A] mt-1.5 truncate font-light">
              {snippet}
            </p>
          )}
          {!expanded && !text && (
            <p className="text-xs text-[#52525B] italic mt-1.5">No text extracted from this page.</p>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-[#52525B] shrink-0 transition-transform ${
            expanded ? "rotate-180 text-[#39A15F]" : "group-hover:text-[#A1A1AA]"
          }`}
        />
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-[#1F1F1F] px-4 py-3 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={page.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0A0A0A] border border-[#2A2A2A] text-xs text-[#A1A1AA] hover:text-[#39A15F] hover:border-[#39A15F]/40 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Open original
            </a>
            {text && (
              <button
                type="button"
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors ${
                  copied
                    ? "bg-[#39A15F]/15 text-[#39A15F] border-[#39A15F]/40"
                    : "bg-[#0A0A0A] border-[#2A2A2A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#3A3A3A]"
                }`}
                data-testid={`button-copy-page-${page.id}`}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy text"}
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs transition-colors ${
                reviewed
                  ? "bg-[#39A15F]/15 text-[#39A15F] border-[#39A15F]/40 hover:bg-[#39A15F]/25"
                  : "bg-[#0A0A0A] text-[#A1A1AA] border-[#2A2A2A] hover:border-[#39A15F]/40 hover:text-[#39A15F]"
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              {reviewed ? "Marked reviewed" : "Mark as reviewed"}
            </button>
          </div>

          {text ? (
            <div className="rounded-lg bg-[#0A0A0A] border border-[#1F1F1F] p-3 max-h-80 overflow-y-auto">
              <pre className="text-[13px] text-[#D4D4D8] font-light whitespace-pre-wrap leading-relaxed font-sans">
                {cleaned}
              </pre>
            </div>
          ) : (
            <p className="text-xs text-[#52525B] italic">No text extracted from this page.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- job detail panel ----------

function JobDetailPanel({
  jobId,
  onReviewedCountChange,
}: {
  jobId: number;
  onReviewedCountChange: (count: number) => void;
}) {
  const [filter, setFilter] = useState("");
  const [hideReviewed, setHideReviewed] = useState(false);
  const { reviewed, toggle, reset } = useReviewedPages(jobId);

  const { data, isLoading } = useQuery<JobDetail>({
    queryKey: ["scraper-job", jobId],
    queryFn: async () => {
      const res = await fetch(`${API}/api/scraper/jobs/${jobId}`);
      if (!res.ok) throw new Error("Failed to load job");
      return res.json();
    },
    refetchInterval: (q) => {
      const status = q.state.data?.job.status;
      return status === "running" || status === "queued" ? 2000 : false;
    },
  });

  const pages = data?.pages || [];

  // Bubble reviewed count up to the parent JobRow so the chip + bar update.
  useEffect(() => {
    const validIds = new Set(pages.map((p) => p.id));
    let count = 0;
    reviewed.forEach((id) => { if (validIds.has(id)) count++; });
    onReviewedCountChange(count);
  }, [reviewed, pages, onReviewedCountChange]);

  const filtered = useMemo(() => {
    let list = pages;
    if (filter.trim()) {
      const q = filter.toLowerCase();
      list = list.filter((p) =>
        (p.title || "").toLowerCase().includes(q) ||
        p.url.toLowerCase().includes(q) ||
        (p.content || "").toLowerCase().includes(q),
      );
    }
    if (hideReviewed) list = list.filter((p) => !reviewed.has(p.id));
    return list;
  }, [pages, filter, hideReviewed, reviewed]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-12 text-[#71717A]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading pages…
      </div>
    );
  }
  if (!data) return null;

  const reviewedInJob = pages.reduce((acc, p) => acc + (reviewed.has(p.id) ? 1 : 0), 0);
  const remaining = pages.length - reviewedInJob;

  return (
    <div className="mt-2 ml-6 space-y-3" data-testid={`panel-job-${jobId}`}>
      {/* Sticky-feel toolbar */}
      <div className="bg-[#0F0F0F] border border-[#1F1F1F] rounded-xl p-3 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B] pointer-events-none" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={`Search ${pages.length} page${pages.length === 1 ? "" : "s"}…`}
              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg pl-10 pr-4 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:ring-2 focus:ring-[#39A15F]/60"
              data-testid={`input-search-pages-${jobId}`}
            />
          </div>
          <button
            onClick={() => setHideReviewed((v) => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
              hideReviewed
                ? "bg-[#39A15F]/15 text-[#39A15F] border-[#39A15F]/40"
                : "bg-[#0A0A0A] text-[#A1A1AA] border-[#2A2A2A] hover:border-[#3A3A3A]"
            }`}
            data-testid={`button-hide-reviewed-${jobId}`}
          >
            {hideReviewed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {hideReviewed ? "Hiding reviewed" : "Hide reviewed"}
          </button>
          {reviewedInJob > 0 && (
            <button
              onClick={() => {
                if (confirm("Reset all reviewed marks for this crawl?")) reset();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#2A2A2A] bg-[#0A0A0A] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[#3A3A3A] text-xs font-medium transition-colors"
              data-testid={`button-reset-reviewed-${jobId}`}
              title="Untick every page in this crawl"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset ticks
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-[11px] text-[#71717A] tabular-nums px-1">
          <span>
            <span className="text-[#FAFAFA] font-medium">{pages.length}</span> total
          </span>
          <span className="text-[#39A15F]">
            <span className="font-medium">{reviewedInJob}</span> reviewed
          </span>
          <span>
            <span className="text-[#FAFAFA] font-medium">{remaining}</span> remaining
          </span>
          {filter && (
            <span className="ml-auto">
              showing <span className="text-[#FAFAFA] font-medium">{filtered.length}</span>
            </span>
          )}
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="text-sm text-[#71717A] py-8 text-center bg-[#0F0F0F] border border-[#1F1F1F] rounded-xl">
          {data.job.status === "running" || data.job.status === "queued"
            ? "Waiting for the first page to come back…"
            : "No pages were saved on this crawl."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((page) => (
            <PageRow
              key={page.id}
              page={page}
              reviewed={reviewed.has(page.id)}
              onToggle={() => toggle(page.id)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="text-sm text-[#71717A] py-6 text-center">
              {hideReviewed && pages.length > 0
                ? "Every page in this crawl is ticked. Nice work."
                : "No pages match that search."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- page ----------

export default function ScraperPage() {
  const { activeBrandSlug } = useBrand();
  const { brandShortLabel } = useBrandContent();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [reviewedCounts, setReviewedCounts] = useState<Record<number, number>>({});

  const { data: jobs = [], isLoading } = useQuery<ScraperJob[]>({
    queryKey: ["scraper-jobs", activeBrandSlug],
    queryFn: async () => {
      const res = await fetch(`${API}/api/scraper/jobs`);
      if (!res.ok) throw new Error("Failed to load jobs");
      return res.json();
    },
    refetchInterval: (q) => {
      const list = q.state.data || [];
      return list.some((j) => j.status === "running" || j.status === "queued") ? 2000 : false;
    },
  });

  // Hydrate reviewed counts for collapsed jobs from localStorage so the
  // "X / N reviewed" chip is accurate before a job is opened.
  useEffect(() => {
    if (!jobs.length) return;
    const next: Record<number, number> = {};
    for (const job of jobs) {
      try {
        const raw = localStorage.getItem(reviewedKey(job.id));
        if (raw) {
          const arr = JSON.parse(raw) as number[];
          next[job.id] = Array.isArray(arr) ? arr.length : 0;
        } else {
          next[job.id] = 0;
        }
      } catch {
        next[job.id] = 0;
      }
    }
    setReviewedCounts((prev) => ({ ...next, ...prev }));
    // we only want this on the set of job ids changing, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.map((j) => j.id).join(",")]);

  const del = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API}/api/scraper/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: (_d, id) => {
      if (selectedJobId === id) setSelectedJobId(null);
      try { localStorage.removeItem(reviewedKey(id)); } catch { /* ignore */ }
      queryClient.invalidateQueries({ queryKey: ["scraper-jobs"] });
    },
  });

  const brandPrefix = brandShortLabel ? `${brandShortLabel} ` : "";

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 pb-24"
      >
        <header className="space-y-3">
          <h1 className="font-extrabold text-4xl md:text-5xl text-[#FAFAFA] tracking-tight">Site Scraper</h1>
          <p className="text-lg text-[#A1A1AA] font-light max-w-2xl">
            Crawl any site and store every page as a raw archive. Tick pages off as you copy what's
            useful into the {brandPrefix}brand pages — your ticks stay on this device.
          </p>
        </header>

        <StartForm onStarted={(job) => setSelectedJobId(job.id)} />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#FAFAFA]">Past crawls</h2>
            {jobs.length > 0 && (
              <span className="text-xs text-[#71717A] tabular-nums">{jobs.length} total</span>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 text-[#39A15F] animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12 bg-[#141414] border border-[#262626] rounded-2xl">
              <Globe className="w-8 h-8 text-[#39A15F]/40 mx-auto mb-3" />
              <p className="text-sm text-[#71717A]">No crawls yet. Start one above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <div key={job.id}>
                  <JobRow
                    job={job}
                    selected={selectedJobId === job.id}
                    reviewedCount={reviewedCounts[job.id] ?? 0}
                    onSelect={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
                    onDelete={() => del.mutate(job.id)}
                  />
                  {selectedJobId === job.id && (
                    <JobDetailPanel
                      jobId={job.id}
                      onReviewedCountChange={(count) =>
                        setReviewedCounts((prev) =>
                          prev[job.id] === count ? prev : { ...prev, [job.id]: count }
                        )
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </motion.div>
    </div>
  );
}
