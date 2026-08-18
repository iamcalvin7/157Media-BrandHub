import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Camera, Plus, Trash2, ExternalLink, Loader2, Video, Mic,
  Image as ImageIcon, Music, FileText, ArrowLeft, ListChecks, ChevronRight,
  ChevronDown, ChevronUp, ClipboardList, CheckCircle2, X, Upload, Download,
  FileVideo, FileImage, File as FileIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/brand";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type Kind = "video" | "voiceover" | "image" | "audio" | "other";

interface NicoLink {
  id: number;
  kind: string;
  name: string | null;
  date: string | null;
  url: string;
  notes: string | null;
  createdAt: string;
}

interface NicoMarketingRequest {
  id: number;
  brand_id: number;
  brand_name: string | null;
  brand_slug: string | null;
  name: string;
  request_type: string | null;
  sizes: string[] | null;
  designer: string | null;
  deadline: string | null;
  market: string | null;
  status: string;
  notes: string | null;
  drive_url: string | null;
  created_at: string;
}

interface NicoPost {
  id: number;
  brand_id: number;
  brand_name: string | null;
  brand_slug: string | null;
  brand_primary_color: string | null;
  title: string | null;
  caption: string;
  visual_direction: string | null;
  platform: string;
  pillar: string;
  format: string;
  market: string | null;
  status: string;
  creative_status: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  assigned_to: string | null;
  notes: string | null;
  drive_url: string | null;
  media_url: string | null;
  link_url: string | null;
  visual_reference_url: string | null;
  ig_format: string | null;
  cross_post: boolean | null;
  deliverable_urls: string[] | null;
}

const KIND_OPTIONS: { value: Kind; label: string; icon: React.ElementType; color: string }[] = [
  { value: "video", label: "Video", icon: Video, color: "text-red-400" },
  { value: "voiceover", label: "Voiceover", icon: Mic, color: "text-sky-400" },
  { value: "image", label: "Image", icon: ImageIcon, color: "text-amber-400" },
  { value: "audio", label: "Audio", icon: Music, color: "text-purple-400" },
  { value: "other", label: "Other", icon: FileText, color: "text-zinc-400" },
];

function kindMeta(k: string) {
  return KIND_OPTIONS.find(o => o.value === k) ?? KIND_OPTIONS[KIND_OPTIONS.length - 1];
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtDateShort(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
  });
}

function platformLabel(p: NicoPost): string {
  if (p.platform === "Both" || p.cross_post) return "Facebook · Instagram";
  // GHS posts may store a comma list of channels ("Facebook,Instagram,Story")
  return p.platform.split(",").map(s => s.trim()).filter(Boolean).join(" · ");
}

function formatLabel(f: string): string {
  return f.replace(" - ", " · ");
}

function hostnameOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export default function Nico() {
  const [items, setItems] = useState<NicoLink[]>([]);
  const [posts, setPosts] = useState<NicoPost[]>([]);
  const [marketingJobs, setMarketingJobs] = useState<NicoMarketingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [postsExpanded, setPostsExpanded] = useState(false);
  const [assetsExpanded, setAssetsExpanded] = useState(true);
  const [selectedPost, setSelectedPost] = useState<NicoPost | null>(null);
  const [selectedJob, setSelectedJob] = useState<NicoMarketingRequest | null>(null);
  const { setActiveBrandSlug } = useBrand();
  const [, navigate] = useLocation();

  async function load() {
    setLoading(true);
    try {
      const [linksRes, postsRes, jobsRes] = await Promise.all([
        fetch(`${API}/api/nico-links`),
        fetch(`${API}/api/nico-posts`),
        fetch(`${API}/api/nico-marketing-requests`),
      ]);
      if (linksRes.ok) setItems(await linksRes.json());
      if (postsRes.ok) setPosts(await postsRes.json());
      if (jobsRes.ok) setMarketingJobs(await jobsRes.json());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function markPostDelivered(id: number) {
    setPosts(prev => prev.filter(p => p.id !== id));
    await fetch(`${API}/api/nico-posts/${id}/mark-delivered`, { method: "PATCH" });
  }

  async function handleDelete(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
    await fetch(`${API}/api/nico-links/${id}`, { method: "DELETE" });
  }

  const POSTS_PAGE = 5;
  const visiblePosts = postsExpanded ? posts : posts.slice(0, POSTS_PAGE);
  const hiddenPostsCount = posts.length - POSTS_PAGE;

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#18181B] selection:bg-[#39A15F] selection:text-black">
      <header className="px-6 sm:px-10 py-6 flex items-center justify-between gap-3 border-b border-[#E4E4E7]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-[#39A15F] grid place-items-center text-black font-bold">
            <span className="text-sm tracking-tight">BH</span>
          </div>
          <div className="text-sm font-medium text-[#A1A1AA]">Brand Hub</div>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E4E4E7] hover:border-[#39A15F]/50 bg-[#FAFAFA] hover:bg-[#F4F4F5] text-[#A1A1AA] hover:text-[#18181B] text-xs font-medium pl-2.5 pr-3 py-1.5 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Brands
        </Link>
      </header>

      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10 space-y-12">
        {/* Title block */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#A1A1AA] mb-3">
              <Camera className="w-3.5 h-3.5 text-[#39A15F]" />
              Videographer drop-zone
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#18181B]">Nico</h1>
            <p className="text-sm text-[#A1A1AA] mt-2 max-w-2xl leading-relaxed">
              Drop links to videos, voiceovers, images and other raw assets here. Posts tagged for Nico Bazan in any brand's calendar also appear below.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="shrink-0 inline-flex items-center gap-1.5 bg-[#39A15F] hover:bg-[#2f8a50] text-black text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add link
          </button>
        </div>

        {/* Marketing jobs assigned to Nico */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-4 h-4 text-[#1e82b4]" />
            <h2 className="text-sm font-semibold tracking-tight text-[#18181B]">Marketing requests</h2>
            <span className="text-xs text-[#A1A1AA]">{loading ? "—" : marketingJobs.length}</span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-[#E4E4E7] bg-[#FFFFFF] p-10 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-[#A1A1AA]" />
            </div>
          ) : marketingJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E4E4E7] bg-[#FFFFFF] p-8 text-center">
              <p className="text-sm text-[#A1A1AA]">No marketing requests assigned to you yet.</p>
              <p className="text-xs text-[#A1A1AA] mt-1">Set <span className="font-medium text-[#18181B]">Nico Bazan</span> as the designer on a request to see it here.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E4E4E7] bg-[#FFFFFF] overflow-hidden">
              {marketingJobs.map((job, i) => {
                const isIT = job.market?.toLowerCase().includes("italian") ?? false;
                const statusColors: Record<string, string> = {
                  pending: "bg-zinc-100 text-zinc-500 border-zinc-200",
                  in_progress: "bg-amber-50 text-amber-600 border-amber-200",
                  done: "bg-emerald-50 text-emerald-600 border-emerald-200",
                };
                const statusLabels: Record<string, string> = {
                  pending: "Pending",
                  in_progress: "In progress",
                  done: "Done",
                };
                return (
                  <div
                    key={job.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedJob(job)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setSelectedJob(job); }}
                    className={cn(
                      "flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors",
                      i > 0 ? "border-t border-[#E4E4E7]" : "",
                      isIT ? "bg-amber-50/40 hover:bg-amber-50/70" : "bg-sky-50/20 hover:bg-sky-50/50",
                    )}
                  >
                    {/* Deadline */}
                    <div className="w-14 shrink-0 text-right">
                      <span className="text-[11px] font-medium text-[#A1A1AA] whitespace-nowrap leading-tight block">
                        {fmtDateShort(job.deadline)}
                      </span>
                    </div>

                    {/* Blue accent bar */}
                    <div className="w-0.5 h-8 rounded-full shrink-0 bg-[#1e82b4]" />

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        {job.brand_name && (
                          <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#1e82b4]/10 text-[#1e82b4]">
                            {job.brand_name}
                          </span>
                        )}
                        {job.market && (
                          <span className={cn(
                            "inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                            isIT ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                          )}>
                            {isIT ? "IT" : "EN"}
                          </span>
                        )}
                        {job.request_type && (
                          <span className="text-[10px] uppercase tracking-wider text-[#A1A1AA]">{job.request_type}</span>
                        )}
                        {job.sizes && job.sizes.length > 0 && (
                          <span className="text-[10px] text-[#A1A1AA]">{job.sizes.join(", ")}</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-[#18181B] truncate leading-snug">{job.name}</p>
                      {job.notes && (
                        <p className="text-[11px] text-[#A1A1AA] truncate mt-0.5 leading-snug">{job.notes}</p>
                      )}
                    </div>

                    {/* Status + drive */}
                    <div className="shrink-0 flex items-center gap-3">
                      <span className={cn(
                        "text-[10px] font-semibold border rounded-full px-2.5 py-1 whitespace-nowrap",
                        statusColors[job.status] ?? statusColors.pending,
                      )}>
                        {statusLabels[job.status] ?? job.status}
                      </span>
                      {job.drive_url && (
                        <a
                          href={job.drive_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#1e82b4] hover:text-[#1a6fa0] transition-colors"
                          title="Open Drive folder"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Social content */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ListChecks className="w-4 h-4 text-[#39A15F]" />
            <h2 className="text-sm font-semibold tracking-tight text-[#18181B]">Social content</h2>
            <span className="text-xs text-[#A1A1AA]">{loading ? "—" : posts.length}</span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-[#E4E4E7] bg-[#FFFFFF] p-10 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-[#A1A1AA]" />
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E4E4E7] bg-[#FFFFFF] p-10 text-center">
              <p className="text-sm text-[#A1A1AA]">
                No posts assigned to <span className="text-[#18181B] font-medium">Nico Bazan</span> yet.
              </p>
              <p className="text-xs text-[#A1A1AA] mt-1.5">
                In any brand's Content Calendar, set the assignee on a post to "Nico Bazan" and it will appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E4E4E7] bg-[#FFFFFF] overflow-hidden">
              {visiblePosts.map((p, i) => {
                const title = p.title?.trim() || p.caption.split("\n")[0].slice(0, 80) || "Untitled post";
                const color = p.brand_primary_color ?? "#39A15F";
                const prevDate = i > 0 ? posts[i - 1]!.scheduled_date : null;
                const newDay = p.scheduled_date !== prevDate;
                const isIT = p.market?.toLowerCase().includes("italian") ?? false;
                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPost(p)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setSelectedPost(p); }}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-3.5 transition-colors text-left group cursor-pointer",
                      newDay && i > 0 ? "border-t border-[#E4E4E7]" : "",
                      isIT ? "bg-amber-50/40 hover:bg-amber-50/70" : "bg-sky-50/20 hover:bg-sky-50/50",
                    )}
                  >
                    {/* Date */}
                    <div className="w-14 shrink-0 text-right">
                      <span className="text-[11px] font-medium text-[#A1A1AA] whitespace-nowrap leading-tight block">
                        {fmtDateShort(p.scheduled_date)}
                      </span>
                      {p.scheduled_time && (
                        <span className="text-[10px] text-[#C4C4C8] leading-tight block">{p.scheduled_time}</span>
                      )}
                    </div>

                    {/* Color accent bar */}
                    <div className="w-0.5 h-8 rounded-full shrink-0" style={{ background: color }} />

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span
                          className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: `${color}1a`, color }}
                        >
                          {p.brand_name ?? `Brand #${p.brand_id}`}
                        </span>
                        <span className={cn(
                          "inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                          isIT ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
                        )}>
                          {isIT ? "IT" : "EN"}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-[#A1A1AA]">
                          {platformLabel(p)} · {formatLabel(p.format)}
                          {p.ig_format ? ` / ${p.ig_format}` : ""}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[#18181B] truncate leading-snug">{title}</p>
                      {p.visual_direction && (
                        <p className="text-[11px] text-[#A1A1AA] truncate mt-0.5 leading-snug">{p.visual_direction}</p>
                      )}
                    </div>

                    {/* Status + drive + delivered */}
                    <div className="shrink-0 flex items-center gap-3">
                      <span className="text-[10px] uppercase tracking-wider text-[#A1A1AA] hidden sm:block">
                        {p.creative_status ?? "To Do"}
                      </span>
                      {p.drive_url && (
                        <a
                          href={p.drive_url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-[#39A15F] hover:text-[#2f8a50] transition-colors"
                          title="Open Drive folder"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        title="Mark as delivered — removes from list"
                        onClick={e => { e.stopPropagation(); markPostDelivered(p.id); }}
                        className="text-[#A1A1AA] hover:text-emerald-600 hover:bg-emerald-50 p-1 rounded-lg transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-[#D4D4D8] group-hover:text-[#A1A1AA] transition-colors" />
                    </div>
                  </div>
                );
              })}
              {!postsExpanded && hiddenPostsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setPostsExpanded(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-[#1e82b4] hover:bg-[#F4F4F5] border-t border-[#E4E4E7] transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  See {hiddenPostsCount} more
                </button>
              )}
              {postsExpanded && posts.length > POSTS_PAGE && (
                <button
                  type="button"
                  onClick={() => setPostsExpanded(false)}
                  className="w-full flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-[#A1A1AA] hover:bg-[#F4F4F5] border-t border-[#E4E4E7] transition-colors"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  Show fewer
                </button>
              )}
            </div>
          )}
        </section>

        {/* Raw asset links */}
        <section>
          <button
            type="button"
            onClick={() => setAssetsExpanded(e => !e)}
            className="flex items-center gap-2 mb-4 w-full text-left group"
          >
            <Camera className="w-4 h-4 text-[#39A15F]" />
            <h2 className="text-sm font-semibold tracking-tight text-[#18181B]">Asset links</h2>
            <span className="text-xs text-[#A1A1AA]">{loading ? "—" : items.length}</span>
            <span className="ml-auto">
              {assetsExpanded
                ? <ChevronUp className="w-4 h-4 text-[#A1A1AA] group-hover:text-[#18181B] transition-colors" />
                : <ChevronDown className="w-4 h-4 text-[#A1A1AA] group-hover:text-[#18181B] transition-colors" />
              }
            </span>
          </button>

          {assetsExpanded && (loading ? (
            <div className="rounded-2xl border border-[#E4E4E7] bg-[#FFFFFF] p-10 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-[#A1A1AA]" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E4E4E7] bg-[#FFFFFF] p-10 text-center">
              <Camera className="w-7 h-7 text-[#3F3F46] mx-auto mb-3" />
              <p className="text-sm text-[#A1A1AA]">No links yet.</p>
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 text-sm font-semibold text-[#39A15F] hover:text-[#48b572]"
              >
                Add the first one →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#E4E4E7] bg-[#FFFFFF]">
              <table className="w-full text-sm">
                <thead className="bg-[#FAFAFA] border-b border-[#E4E4E7]">
                  <tr>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">Type</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">Name</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">Date</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#71717A]">Link</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const meta = kindMeta(it.kind);
                    const Icon = meta.icon;
                    return (
                      <tr key={it.id} className="border-b border-[#F4F4F5] last:border-0 hover:bg-[#FAFAFA]">
                        <td className="px-4 py-3 align-middle">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA]">
                            <Icon className={cn("w-3.5 h-3.5", meta.color)} />
                            <span className="capitalize">{it.kind}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle text-[#18181B] font-semibold">
                          {it.name?.trim() || <span className="text-[#A1A1AA] italic font-normal">Untitled</span>}
                        </td>
                        <td className="px-4 py-3 align-middle text-[#A1A1AA] whitespace-nowrap">{fmtDate(it.date)}</td>
                        <td className="px-4 py-3 align-middle">
                          <a
                            href={it.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[#39A15F] hover:underline break-all"
                          >
                            <span className="truncate max-w-[42ch]">{hostnameOf(it.url)}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          {it.notes && (
                            <p className="text-xs text-[#71717A] mt-1 line-clamp-2 whitespace-pre-wrap">{it.notes}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-middle text-right">
                          <DeleteButton onConfirm={() => handleDelete(it.id)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      </div>

      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onSaved={(item) => { setItems(prev => [item, ...prev]); setShowAdd(false); }}
        />
      )}

      {selectedPost && (
        <PostBriefModal
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onDelivered={() => { markPostDelivered(selectedPost.id); setSelectedPost(null); }}
          onOpenCalendar={() => {
            if (selectedPost.brand_slug) setActiveBrandSlug(selectedPost.brand_slug);
            navigate(`/content-calendar?post=${selectedPost.id}`);
            setSelectedPost(null);
          }}
        />
      )}

      {selectedJob && (
        <JobBriefModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <div className="flex items-center justify-end gap-1">
        <button onClick={onConfirm} className="text-[11px] font-semibold text-white bg-red-600 hover:bg-red-500 px-2 py-1 rounded-md">Delete</button>
        <button onClick={() => setConfirm(false)} className="text-[11px] text-[#71717A] hover:text-[#A1A1AA] px-1">Cancel</button>
      </div>
    );
  }
  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-[#A1A1AA] hover:text-red-400 p-1 rounded-md transition-colors"
      title="Delete"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: (item: NicoLink) => void }) {
  const [kind, setKind] = useState<Kind>("video");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError("A link is required.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/nico-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          name: name.trim() || null,
          url: url.trim(),
          date: date || null,
          notes: notes.trim() || null,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error((e as any).error || "Failed to save");
      }
      onSaved(await r.json());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden text-[#18181B]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#E4E4E7]">
          <h2 className="text-lg font-bold">Add a link</h2>
          <button onClick={onClose} className="text-[#71717A] hover:text-[#18181B] p-1 rounded-lg hover:bg-[#F4F4F5]" aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#71717A] font-semibold mb-2 block">Type</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {KIND_OPTIONS.map(k => {
                const Icon = k.icon;
                const active = kind === k.value;
                return (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKind(k.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all",
                      active
                        ? "border-[#39A15F] bg-[#39A15F]/10 text-[#39A15F]"
                        : "border-[#E4E4E7] text-[#A1A1AA] hover:border-[#3F3F46]"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", active ? "text-[#39A15F]" : k.color)} />
                    <span className="text-[11px] font-semibold">{k.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#71717A] font-semibold mb-1.5 block">Name of content</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Pozzallo sunset b-roll"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#E4E4E7] bg-[#FFFFFF] text-[#18181B] placeholder:text-[#A1A1AA] focus:border-[#39A15F] focus:outline-none focus:ring-1 focus:ring-[#39A15F]/30"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#71717A] font-semibold mb-1.5 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#E4E4E7] bg-[#FFFFFF] text-[#18181B] focus:border-[#39A15F] focus:outline-none focus:ring-1 focus:ring-[#39A15F]/30"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#71717A] font-semibold mb-1.5 block">Link</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://…"
              autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#E4E4E7] bg-[#FFFFFF] text-[#18181B] placeholder:text-[#A1A1AA] focus:border-[#39A15F] focus:outline-none focus:ring-1 focus:ring-[#39A15F]/30"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#71717A] font-semibold mb-1.5 block">Notes <span className="normal-case text-[#A1A1AA] font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anything the team should know…"
              rows={2}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#E4E4E7] bg-[#FFFFFF] text-[#18181B] placeholder:text-[#A1A1AA] focus:border-[#39A15F] focus:outline-none focus:ring-1 focus:ring-[#39A15F]/30 resize-none"
            />
          </div>

          {error && (
            <div className="text-xs text-red-300 bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E4E4E7]">
            <button type="button" onClick={onClose} className="text-sm text-[#A1A1AA] hover:text-[#18181B] font-medium px-3 py-2">Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 text-sm font-semibold text-black bg-[#39A15F] hover:bg-[#2f8a50] px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Post Brief Modal ───────────────────────────────────────────────────────

function PostBriefModal({
  post, onClose, onDelivered, onOpenCalendar,
}: {
  post: NicoPost;
  onClose: () => void;
  onDelivered: () => void;
  onOpenCalendar: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const [delivUrls, setDelivUrls] = useState<string[]>(post.deliverable_urls ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    setUploadErr(null);
    const accumulated: string[] = [...delivUrls];
    try {
      for (const file of files) {
        const metaRes = await fetch(`${API}/api/nico-posts/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
        });
        if (!metaRes.ok) {
          const j = await metaRes.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? "Upload failed");
        }
        const { uploadURL, objectPath } = await metaRes.json() as { uploadURL: string; objectPath: string };
        const putRes = await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!putRes.ok) throw new Error("Storage upload failed");
        // Fire-and-forget: fix moov atom order so the video is playable immediately on first view
        if (file.type.startsWith("video/")) {
          fetch(`${API}/api/storage/uploads/process`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ objectPath }),
          }).catch(() => {});
        }
        accumulated.push(objectPath);
      }
      const patchRes = await fetch(`${API}/api/nico-posts/${post.id}/deliverables`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliverable_urls: accumulated }),
      });
      if (!patchRes.ok) throw new Error("Failed to save deliverables");
      setDelivUrls(accumulated);
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function removeDeliverable(idx: number) {
    const next = delivUrls.filter((_, i) => i !== idx);
    const patchRes = await fetch(`${API}/api/nico-posts/${post.id}/deliverables`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliverable_urls: next }),
    });
    if (patchRes.ok) setDelivUrls(next);
  }

  function fileIcon(path: string) {
    if (/\.(mp4|mov|webm|avi)$/i.test(path)) return <FileVideo className="w-4 h-4 shrink-0 text-[#A1A1AA]" />;
    if (/\.(png|jpe?g|gif|webp|svg)$/i.test(path)) return <FileImage className="w-4 h-4 shrink-0 text-[#A1A1AA]" />;
    return <FileIcon className="w-4 h-4 shrink-0 text-[#A1A1AA]" />;
  }

  const title = post.title?.trim() || post.caption.split("\n")[0].slice(0, 80) || "Untitled post";
  const color = post.brand_primary_color ?? "#39A15F";
  const isIT = post.market?.toLowerCase().includes("italian") ?? false;

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-0.5">{label}</p>
      <p className="text-sm text-[#18181B] leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto text-[#18181B]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[#E4E4E7]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {post.brand_name && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: `${color}1a`, color }}>
                  {post.brand_name}
                </span>
              )}
              <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", isIT ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700")}>
                {isIT ? "IT" : "EN"}
              </span>
              <span className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">
                {platformLabel(post)}
                {" · "}{post.format.replace(" - ", " · ")}
                {post.ig_format ? ` / ${post.ig_format}` : ""}
              </span>
            </div>
            <h2 className="text-base font-bold leading-snug">{title}</h2>
            {post.scheduled_date && (
              <p className="text-xs text-[#A1A1AA] mt-0.5">{fmtDate(post.scheduled_date)}{post.scheduled_time ? ` · ${post.scheduled_time}` : ""}</p>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 text-[#A1A1AA] hover:text-[#18181B] p-1 rounded-lg hover:bg-[#F4F4F5]" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {post.visual_direction ? (
            <Row label="Visual Direction" value={post.visual_direction} />
          ) : (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-0.5">Visual Direction</p>
              <p className="text-sm text-[#A1A1AA] italic">Not specified</p>
            </div>
          )}

          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-1.5">Links</p>
            {(() => {
              const visualRefs = (post.visual_reference_url ?? "")
                .split("\n").map(s => s.trim()).filter(Boolean);
              const hasAny = post.link_url || visualRefs.length > 0;
              if (!hasAny) return <p className="text-sm text-[#A1A1AA] italic">No links</p>;
              return (
                <div className="space-y-1.5">
                  {post.link_url && (
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider bg-[#E4E4E7] text-[#71717A] px-1.5 py-0.5 rounded">Link</span>
                      <a href={post.link_url} target="_blank" rel="noreferrer" className="text-sm text-[#1e82b4] hover:underline break-all inline-flex items-center gap-1 min-w-0">
                        <span className="truncate">{post.link_url}</span><ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}
                  {visualRefs.map((url, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded">Visual ref</span>
                      <a href={url} target="_blank" rel="noreferrer" className="text-sm text-[#1e82b4] hover:underline break-all inline-flex items-center gap-1 min-w-0">
                        <span className="truncate">{url}</span><ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold">
                Deliverables{delivUrls.length > 0 ? ` · ${delivUrls.length}` : ""}
              </p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#39A15F] hover:text-[#2f8a50] disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                {uploading ? "Uploading…" : "Upload file"}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={e => { const fs = Array.from(e.target.files ?? []); if (fs.length) handleFiles(fs); }}
            />
            {uploadErr && (
              <p className="text-xs text-red-500 mb-2">{uploadErr}</p>
            )}
            {delivUrls.length === 0 && !uploading && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center gap-1.5 py-5 border-2 border-dashed border-[#E4E4E7] rounded-xl text-[#A1A1AA] hover:border-[#39A15F]/40 hover:text-[#39A15F] transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span className="text-xs font-medium">Drop files or click to upload</span>
              </button>
            )}
            {delivUrls.length > 0 && (
              <div className="space-y-1.5">
                {delivUrls.map((raw, idx) => {
                  const serve = raw.startsWith("/objects/") ? `${API}/api/storage${raw}` : raw;
                  const filename = raw.split("/").pop() ?? `file-${idx + 1}`;
                  return (
                    <div key={raw} className="flex items-center gap-2 bg-[#F4F4F5] border border-[#E4E4E7] rounded-lg px-3 py-2">
                      {fileIcon(raw)}
                      <span className="flex-1 text-xs font-medium text-[#18181B] truncate">{filename}</span>
                      <a href={serve} target="_blank" rel="noreferrer" download className="text-[#A1A1AA] hover:text-[#39A15F] p-0.5" title="Download">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button type="button" onClick={() => removeDeliverable(idx)} className="text-[#A1A1AA] hover:text-red-500 p-0.5" title="Remove">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-1">Google Drive Folder</p>
            {post.drive_url ? (
              <a href={post.drive_url} target="_blank" rel="noreferrer" className="text-sm text-[#39A15F] hover:underline break-all inline-flex items-center gap-1">
                {post.drive_url} <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <p className="text-sm text-[#A1A1AA] italic">No folder linked</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 p-4 border-t border-[#E4E4E7]">
          <button
            type="button"
            onClick={onOpenCalendar}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA] hover:text-[#18181B] px-3 py-1.5 rounded-lg hover:bg-[#F4F4F5] transition-colors"
          >
            Open in calendar →
          </button>
          <div className="ml-auto">
            <button
              type="button"
              onClick={onDelivered}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark delivered
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Job Brief Modal ────────────────────────────────────────────────────────

function JobBriefModal({ job, onClose }: { job: NicoMarketingRequest; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const isIT = job.market?.toLowerCase().includes("italian") ?? false;
  const statusColors: Record<string, string> = {
    pending: "bg-zinc-100 text-zinc-500 border-zinc-200",
    in_progress: "bg-amber-50 text-amber-600 border-amber-200",
    done: "bg-emerald-50 text-emerald-600 border-emerald-200",
  };
  const statusLabels: Record<string, string> = {
    pending: "Pending", in_progress: "In progress", done: "Done",
  };

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-0.5">{label}</p>
      <p className="text-sm text-[#18181B] leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto text-[#18181B]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[#E4E4E7]">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {job.brand_name && (
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#1e82b4]/10 text-[#1e82b4]">
                  {job.brand_name}
                </span>
              )}
              {job.market && (
                <span className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded", isIT ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700")}>
                  {isIT ? "IT" : "EN"}
                </span>
              )}
              {job.request_type && (
                <span className="text-[10px] uppercase tracking-wider text-[#A1A1AA]">{job.request_type}</span>
              )}
              <span className={cn("text-[10px] font-semibold border rounded-full px-2 py-0.5 ml-auto", statusColors[job.status] ?? statusColors.pending)}>
                {statusLabels[job.status] ?? job.status}
              </span>
            </div>
            <h2 className="text-base font-bold leading-snug">{job.name}</h2>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {job.deadline && <p className="text-xs text-[#A1A1AA]">Due {fmtDate(job.deadline)}</p>}
              {job.sizes && job.sizes.length > 0 && (
                <p className="text-xs text-[#A1A1AA]">{job.sizes.join(", ")}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 text-[#A1A1AA] hover:text-[#18181B] p-1 rounded-lg hover:bg-[#F4F4F5]" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {job.notes && <Row label="Brief" value={job.notes} />}
          {!job.notes && (
            <p className="text-sm text-[#A1A1AA] italic">No brief provided for this request.</p>
          )}
        </div>

        {/* Footer */}
        {job.drive_url && (
          <div className="flex items-center gap-2 p-4 border-t border-[#E4E4E7]">
            <a
              href={job.drive_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e82b4] border border-[#1e82b4]/30 hover:border-[#1e82b4]/60 px-3 py-1.5 rounded-lg hover:bg-[#1e82b4]/05 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Drive folder
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
