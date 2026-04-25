import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useBrand } from "@/lib/brand";
import { queryClient } from "@/lib/queryClient";
import { useBrandContent } from "@/lib/brand-content";
import {
  Globe, Loader2, Play, Trash2, ChevronRight, ChevronDown,
  CheckCircle2, AlertCircle, Clock, ExternalLink, FileText, Search,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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

function JobRow({
  job,
  selected,
  onSelect,
  onDelete,
}: {
  job: ScraperJob;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  let host = job.root_url;
  try { host = new URL(job.root_url).host; } catch { /* keep raw */ }

  return (
    <div
      className={`bg-[#141414] border rounded-2xl px-5 py-4 transition-colors ${
        selected ? "border-[#39A15F]/60" : "border-[#262626] hover:border-[#3A3A3A]"
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
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-sm font-medium text-[#FAFAFA] truncate">{host}</span>
              {statusPill(job.status)}
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
      {job.error && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
          {job.error}
        </div>
      )}
    </div>
  );
}

function PageCard({ page }: { page: ScraperPage }) {
  const [expanded, setExpanded] = useState(false);
  const text = page.content || "";
  const preview = text.length > 240 ? text.slice(0, 240) + "…" : text;

  return (
    <div className="bg-[#141414] border border-[#262626] rounded-xl p-4 hover:border-[#3A3A3A] transition-colors" data-testid={`card-page-${page.id}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-3.5 h-3.5 text-[#39A15F] shrink-0" />
            <h3 className="text-sm font-medium text-[#FAFAFA] truncate">
              {page.title || <span className="text-[#71717A] italic">(no title)</span>}
            </h3>
            <span className="text-[10px] font-mono text-[#52525B] shrink-0">d{page.depth}</span>
            {page.status_code && page.status_code !== 200 && (
              <span className="text-[10px] font-mono text-[#fbbf24] shrink-0">{page.status_code}</span>
            )}
          </div>
          <a
            href={page.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-mono text-[#71717A] hover:text-[#39A15F] truncate"
          >
            {page.url}
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        </div>
      </div>

      {text ? (
        <>
          <p className="text-sm text-[#A1A1AA] font-light whitespace-pre-wrap leading-relaxed">
            {expanded ? text : preview}
          </p>
          {text.length > 240 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-xs text-[#39A15F] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39A15F]/60 rounded"
              data-testid={`button-expand-page-${page.id}`}
            >
              {expanded ? "Show less" : `Show full text (${text.length.toLocaleString()} chars)`}
            </button>
          )}
        </>
      ) : (
        <p className="text-xs text-[#52525B] italic">No text extracted from this page.</p>
      )}
    </div>
  );
}

function JobDetailPanel({ jobId }: { jobId: number }) {
  const [filter, setFilter] = useState("");

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
  const filtered = useMemo(() => {
    if (!filter.trim()) return pages;
    const q = filter.toLowerCase();
    return pages.filter((p) =>
      (p.title || "").toLowerCase().includes(q) ||
      p.url.toLowerCase().includes(q) ||
      (p.content || "").toLowerCase().includes(q),
    );
  }, [pages, filter]);

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-12 text-[#71717A]">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />Loading pages…
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="mt-2 ml-6 space-y-3" data-testid={`panel-job-${jobId}`}>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B] pointer-events-none" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={`Search ${pages.length} page${pages.length === 1 ? "" : "s"}…`}
            className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl pl-10 pr-4 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:ring-2 focus:ring-[#39A15F]/60"
            data-testid={`input-search-pages-${jobId}`}
          />
        </div>
        <span className="text-xs text-[#71717A] tabular-nums">
          {filter ? `${filtered.length} of ${pages.length}` : `${pages.length} pages`}
        </span>
      </div>

      {pages.length === 0 ? (
        <div className="text-sm text-[#71717A] py-8 text-center bg-[#0F0F0F] border border-[#1F1F1F] rounded-xl">
          {data.job.status === "running" || data.job.status === "queued"
            ? "Waiting for the first page to come back…"
            : "No pages were saved on this crawl."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((page) => <PageCard key={page.id} page={page} />)}
          {filtered.length === 0 && (
            <div className="text-sm text-[#71717A] py-6 text-center">No pages match that search.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ScraperPage() {
  const { activeBrandSlug } = useBrand();
  const { brandShortLabel } = useBrandContent();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

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

  const del = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`${API}/api/scraper/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: (_d, id) => {
      if (selectedJobId === id) setSelectedJobId(null);
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
            Crawl any site and store every page as a raw archive. Browse the results below, then copy whatever's
            useful into the {brandPrefix}brand pages.
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
                    onSelect={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
                    onDelete={() => del.mutate(job.id)}
                  />
                  {selectedJobId === job.id && <JobDetailPanel jobId={job.id} />}
                </div>
              ))}
            </div>
          )}
        </section>
      </motion.div>
    </div>
  );
}
