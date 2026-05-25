import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Camera, Plus, Trash2, ExternalLink, Loader2, Video, Mic,
  Image as ImageIcon, Music, FileText, ArrowLeft, ListChecks, ChevronRight,
  ClipboardList, CheckCircle2, Circle, Clock, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/brand";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type Kind = "video" | "voiceover" | "image" | "audio" | "other";
type RequestKind = "video" | "photo" | "audio" | "other";
type RequestStatus = "pending" | "in_progress" | "done";

interface NicoLink {
  id: number;
  kind: string;
  name: string | null;
  date: string | null;
  url: string;
  notes: string | null;
  createdAt: string;
}

interface NicoRequest {
  id: number;
  title: string;
  kind: string;
  description: string | null;
  time_note: string | null;
  format: string | null;
  script: string | null;
  visual_direction: string | null;
  visual_refs: string | null;
  due_date: string | null;
  status: string;
  notes: string | null;
  drive_url: string | null;
  createdAt: string;
}

type VisualRef = { type: "visual" | "reference"; url: string };

function parseVisualRefs(raw: string | null): VisualRef[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as VisualRef[]; } catch { return []; }
}

function ExpandableText({ label, text, labelClass }: { label: string; text: string; labelClass?: string }) {
  const [expanded, setExpanded] = useState(false);
  const LINE_LIMIT = 3;
  const lines = text.split("\n");
  const isLong = lines.length > LINE_LIMIT || text.length > 200;
  const shown = !isLong || expanded ? text : lines.slice(0, LINE_LIMIT).join("\n");
  return (
    <div>
      <span className={cn("not-italic font-medium text-[#71717A]", labelClass)}>{label}: </span>
      <span className="text-xs text-[#A1A1AA] leading-relaxed whitespace-pre-wrap">{shown}</span>
      {isLong && (
        <button type="button" onClick={() => setExpanded(e => !e)} className="ml-1.5 text-[10px] font-semibold text-[#39A15F] hover:underline">
          {expanded ? "less" : "more"}
        </button>
      )}
    </div>
  );
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
  ig_format: string | null;
  cross_post: boolean | null;
}

const KIND_OPTIONS: { value: Kind; label: string; icon: React.ElementType; color: string }[] = [
  { value: "video", label: "Video", icon: Video, color: "text-red-400" },
  { value: "voiceover", label: "Voiceover", icon: Mic, color: "text-sky-400" },
  { value: "image", label: "Image", icon: ImageIcon, color: "text-amber-400" },
  { value: "audio", label: "Audio", icon: Music, color: "text-purple-400" },
  { value: "other", label: "Other", icon: FileText, color: "text-zinc-400" },
];

const REQUEST_KIND_OPTIONS: { value: RequestKind; label: string; icon: React.ElementType; color: string }[] = [
  { value: "video", label: "Video", icon: Video, color: "text-red-400" },
  { value: "photo", label: "Photo", icon: ImageIcon, color: "text-amber-400" },
  { value: "audio", label: "Audio", icon: Music, color: "text-purple-400" },
  { value: "other", label: "Other", icon: FileText, color: "text-zinc-400" },
];

const STATUS_CONFIG: Record<RequestStatus, { label: string; icon: React.ElementType; classes: string; next: RequestStatus }> = {
  pending:    { label: "Pending",     icon: Circle,        classes: "bg-zinc-100 text-zinc-500 border-zinc-200",            next: "in_progress" },
  in_progress:{ label: "In progress", icon: Clock,         classes: "bg-amber-50 text-amber-600 border-amber-200",          next: "done" },
  done:       { label: "Done",        icon: CheckCircle2,  classes: "bg-emerald-50 text-emerald-600 border-emerald-200",    next: "pending" },
};

function kindMeta(k: string) {
  return KIND_OPTIONS.find(o => o.value === k) ?? KIND_OPTIONS[KIND_OPTIONS.length - 1];
}

function requestKindMeta(k: string) {
  return REQUEST_KIND_OPTIONS.find(o => o.value === k) ?? REQUEST_KIND_OPTIONS[REQUEST_KIND_OPTIONS.length - 1];
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
  return p.platform;
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
  const [requests, setRequests] = useState<NicoRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddRequest, setShowAddRequest] = useState(false);
  const { setActiveBrandSlug } = useBrand();
  const [, navigate] = useLocation();

  async function load() {
    setLoading(true);
    try {
      const [linksRes, postsRes, requestsRes] = await Promise.all([
        fetch(`${API}/api/nico-links`),
        fetch(`${API}/api/nico-posts`),
        fetch(`${API}/api/nico-requests`),
      ]);
      if (linksRes.ok) setItems(await linksRes.json());
      if (postsRes.ok) setPosts(await postsRes.json());
      if (requestsRes.ok) setRequests(await requestsRes.json());
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
    await fetch(`${API}/api/nico-links/${id}`, { method: "DELETE" });
  }

  async function handleDeleteRequest(id: number) {
    setRequests(prev => prev.filter(r => r.id !== id));
    await fetch(`${API}/api/nico-requests/${id}`, { method: "DELETE" });
  }

  async function cycleStatus(req: NicoRequest) {
    const cfg = STATUS_CONFIG[req.status as RequestStatus] ?? STATUS_CONFIG.pending;
    const next = cfg.next;
    setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: next } : r));
    await fetch(`${API}/api/nico-requests/${req.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
  }

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

        {/* General Requests */}
        <section>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-[#39A15F]" />
              <h2 className="text-sm font-semibold tracking-tight text-[#18181B]">General requests</h2>
              <span className="text-xs text-[#A1A1AA]">{loading ? "—" : requests.length}</span>
            </div>
            <button
              onClick={() => setShowAddRequest(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#39A15F] hover:text-[#2f8a50] border border-[#39A15F]/30 hover:border-[#39A15F]/60 bg-[#39A15F]/05 hover:bg-[#39A15F]/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New request
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-[#E4E4E7] bg-[#FFFFFF] p-10 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-[#A1A1AA]" />
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E4E4E7] bg-[#FFFFFF] p-10 text-center">
              <ClipboardList className="w-7 h-7 text-[#3F3F46] mx-auto mb-3" />
              <p className="text-sm text-[#A1A1AA]">No general requests yet.</p>
              <button
                onClick={() => setShowAddRequest(true)}
                className="mt-4 text-sm font-semibold text-[#39A15F] hover:text-[#48b572]"
              >
                Create the first one →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map(req => {
                const kMeta = requestKindMeta(req.kind);
                const KIcon = kMeta.icon;
                const sCfg = STATUS_CONFIG[req.status as RequestStatus] ?? STATUS_CONFIG.pending;
                const SIcon = sCfg.icon;
                return (
                  <div
                    key={req.id}
                    className="rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] px-4 py-3.5 flex items-start gap-4"
                  >
                    {/* Kind icon */}
                    <div className="mt-0.5 shrink-0">
                      <KIcon className={cn("w-4 h-4", kMeta.color)} />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Title row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-[#18181B] leading-snug">{req.title}</p>
                        {req.format && (
                          <span className="text-[10px] font-medium text-[#71717A] bg-[#F4F4F5] border border-[#E4E4E7] px-1.5 py-0.5 rounded-md whitespace-nowrap">{req.format}</span>
                        )}
                        {req.time_note && (
                          <span className="text-[10px] font-medium text-[#71717A] bg-[#F4F4F5] border border-[#E4E4E7] px-1.5 py-0.5 rounded-md whitespace-nowrap">{req.time_note}</span>
                        )}
                        {req.due_date && (
                          <span className="text-[10px] text-[#A1A1AA] whitespace-nowrap">Due {fmtDate(req.due_date)}</span>
                        )}
                      </div>
                      {/* Expandable text fields */}
                      {req.description && <ExpandableText label="Brief" text={req.description} />}
                      {req.visual_direction && <ExpandableText label="Visual" text={req.visual_direction} />}
                      {req.script && <ExpandableText label="Script" text={req.script} />}
                      {/* Links row */}
                      <div className="flex items-center gap-3 flex-wrap pt-0.5">
                        {req.notes && (
                          <span className="text-[10px] text-[#A1A1AA] italic truncate max-w-[30ch]">{req.notes}</span>
                        )}
                        {parseVisualRefs(req.visual_refs).map((r, i) => (
                          <a
                            key={i}
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[10px] text-[#1e82b4] hover:underline capitalize"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {r.type === "visual" ? "Visual ref" : "Reference"}
                          </a>
                        ))}
                        {req.drive_url && (
                          <a
                            href={req.drive_url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[10px] text-[#39A15F] hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Drive
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Status pill — click to cycle */}
                    <button
                      type="button"
                      onClick={() => cycleStatus(req)}
                      title="Click to advance status"
                      className={cn(
                        "shrink-0 inline-flex items-center gap-1.5 text-[10px] font-semibold border rounded-full px-2.5 py-1 transition-colors whitespace-nowrap",
                        sCfg.classes,
                      )}
                    >
                      <SIcon className="w-3 h-3" />
                      {sCfg.label}
                    </button>

                    {/* Delete */}
                    <div className="shrink-0 mt-0.5">
                      <DeleteButton onConfirm={() => handleDeleteRequest(req.id)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Tagged posts */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ListChecks className="w-4 h-4 text-[#39A15F]" />
            <h2 className="text-sm font-semibold tracking-tight text-[#18181B]">Posts tagged for you</h2>
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
              {posts.map((p, i) => {
                const title = p.title?.trim() || p.caption.split("\n")[0].slice(0, 80) || "Untitled post";
                const color = p.brand_primary_color ?? "#39A15F";
                const prevDate = i > 0 ? posts[i - 1]!.scheduled_date : null;
                const newDay = p.scheduled_date !== prevDate;
                const isIT = p.market?.toLowerCase().includes("italian") ?? false;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (p.brand_slug) setActiveBrandSlug(p.brand_slug);
                      navigate(`/content-calendar?post=${p.id}`);
                    }}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-3.5 transition-colors text-left group",
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

                    {/* Status + drive */}
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
                      <ChevronRight className="w-4 h-4 text-[#D4D4D8] group-hover:text-[#A1A1AA] transition-colors" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Raw asset links */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-4 h-4 text-[#39A15F]" />
            <h2 className="text-sm font-semibold tracking-tight text-[#18181B]">Asset links</h2>
            <span className="text-xs text-[#A1A1AA]">{loading ? "—" : items.length}</span>
          </div>

          {loading ? (
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
          )}
        </section>
      </div>

      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onSaved={(item) => { setItems(prev => [item, ...prev]); setShowAdd(false); }}
        />
      )}

      {showAddRequest && (
        <AddRequestModal
          onClose={() => setShowAddRequest(false)}
          onSaved={(req) => { setRequests(prev => [req, ...prev]); setShowAddRequest(false); }}
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
        throw new Error(e.error || "Failed to save");
      }
      onSaved(await r.json());
    } catch (err: any) {
      setError(err.message || "Failed to save");
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

function ExpandableTextarea({
  value, onChange, placeholder, label, optional = true,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; label: string; optional?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const inputCls = "w-full px-3 py-2.5 text-sm rounded-lg border border-[#E4E4E7] bg-[#FFFFFF] text-[#18181B] placeholder:text-[#A1A1AA] focus:border-[#39A15F] focus:outline-none focus:ring-1 focus:ring-[#39A15F]/30 resize-none";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[10px] uppercase tracking-wider text-[#71717A] font-semibold">
          {label}{optional && <span className="normal-case text-[#A1A1AA] font-normal ml-1">(optional)</span>}
        </label>
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="inline-flex items-center gap-0.5 text-[10px] text-[#A1A1AA] hover:text-[#39A15F] transition-colors"
        >
          {expanded ? <><ChevronUp className="w-3 h-3" />Collapse</> : <><ChevronDown className="w-3 h-3" />Expand</>}
        </button>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={expanded ? 8 : 2}
        className={inputCls}
      />
    </div>
  );
}

function AddRequestModal({ onClose, onSaved }: { onClose: () => void; onSaved: (req: NicoRequest) => void }) {
  const [kind, setKind] = useState<RequestKind>("video");
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState("");
  const [timeNote, setTimeNote] = useState("");
  const [description, setDescription] = useState("");
  const [visualDirection, setVisualDirection] = useState("");
  const [script, setScript] = useState("");
  const [visualRefs, setVisualRefs] = useState<VisualRef[]>([{ type: "visual", url: "" }]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) { setError("A title is required."); return; }
    setSaving(true);
    try {
      const filledRefs = visualRefs.filter(r => r.url.trim());
      const r = await fetch(`${API}/api/nico-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          kind,
          format: format.trim() || null,
          time_note: timeNote.trim() || null,
          description: description.trim() || null,
          visual_direction: visualDirection.trim() || null,
          script: script.trim() || null,
          visual_refs: filledRefs.length ? JSON.stringify(filledRefs) : null,
          due_date: dueDate || null,
          notes: notes.trim() || null,
          drive_url: driveUrl.trim() || null,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || "Failed to save");
      }
      onSaved(await r.json());
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const inputCls = "w-full px-3 py-2.5 text-sm rounded-lg border border-[#E4E4E7] bg-[#FFFFFF] text-[#18181B] placeholder:text-[#A1A1AA] focus:border-[#39A15F] focus:outline-none focus:ring-1 focus:ring-[#39A15F]/30";
  const labelCls = "text-[10px] uppercase tracking-wider text-[#71717A] font-semibold mb-1.5 block";
  const opt = <span className="normal-case text-[#A1A1AA] font-normal ml-1">(optional)</span>;

  function updateRef(idx: number, patch: Partial<VisualRef>) {
    setVisualRefs(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }
  function removeRef(idx: number) {
    setVisualRefs(prev => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [{ type: "visual", url: "" }];
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden text-[#18181B]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#E4E4E7]">
          <div>
            <h2 className="text-lg font-bold">New general request</h2>
            <p className="text-xs text-[#A1A1AA] mt-0.5">For production work not tied to a social post</p>
          </div>
          <button onClick={onClose} className="text-[#71717A] hover:text-[#18181B] p-1 rounded-lg hover:bg-[#F4F4F5]" aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Type */}
          <div>
            <label className={labelCls}>Type</label>
            <div className="grid grid-cols-4 gap-2">
              {REQUEST_KIND_OPTIONS.map(k => {
                const Icon = k.icon;
                const active = kind === k.value;
                return (
                  <button key={k.value} type="button" onClick={() => setKind(k.value)}
                    className={cn("flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all",
                      active ? "border-[#39A15F] bg-[#39A15F]/10" : "border-[#E4E4E7] text-[#A1A1AA] hover:border-[#3F3F46]"
                    )}>
                    <Icon className={cn("w-4 h-4", active ? "text-[#39A15F]" : k.color)} />
                    <span className={cn("text-[11px] font-semibold", active ? "text-[#39A15F]" : "")}>{k.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className={labelCls}>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Website hero video — summer 2026" autoFocus className={inputCls} />
          </div>

          {/* Due date */}
          <div>
            <label className={labelCls}>Due date{opt}</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputCls} />
          </div>

          {/* Format + Time — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Format{opt}</label>
              <input type="text" value={format} onChange={e => setFormat(e.target.value)}
                placeholder="e.g. 16:9, Reel…" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Time{opt}</label>
              <input type="text" value={timeNote} onChange={e => setTimeNote(e.target.value)}
                placeholder="e.g. 30s, 1 min…" className={inputCls} />
            </div>
          </div>

          {/* Description */}
          <ExpandableTextarea label="Description" value={description} onChange={setDescription}
            placeholder="What's needed, key shots, deliverables…" />

          {/* Visual Direction */}
          <ExpandableTextarea label="Visual Direction" value={visualDirection} onChange={setVisualDirection}
            placeholder="Mood, colour palette, style, tone…" />

          {/* Script */}
          <ExpandableTextarea label="Script" value={script} onChange={setScript}
            placeholder="Full script or talking points…" />

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes{opt}</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Anything else Nico should know…" rows={2}
              className={inputCls + " resize-none w-full"} />
          </div>

          {/* Visual refs — multi-entry */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <button type="button"
                onClick={() => setVisualRefs(prev => [...prev, { type: "visual", url: "" }])}
                className="w-6 h-6 flex items-center justify-center rounded-full bg-[#1e82b4]/10 text-[#1e82b4] hover:bg-[#1e82b4]/20 transition-colors"
                title="Add link">
                <Plus className="w-3.5 h-3.5" />
              </button>
              <label className={cn(labelCls, "mb-0")}>Visual refs{opt}</label>
            </div>
            <div className="space-y-2">
              {visualRefs.map((ref, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select value={ref.type} onChange={e => updateRef(idx, { type: e.target.value as VisualRef["type"] })}
                    className="shrink-0 border border-[#E4E4E7] rounded-lg px-2 py-2.5 text-[10px] font-semibold text-[#71717A] bg-[#FAFAFA] focus:outline-none focus:ring-1 focus:ring-[#1e82b4]/30 [color-scheme:light] cursor-pointer">
                    <option value="visual">Visual ref</option>
                    <option value="reference">Reference</option>
                  </select>
                  <input type="url" value={ref.url} onChange={e => updateRef(idx, { url: e.target.value })}
                    placeholder="https://…" className={inputCls + " flex-1"} />
                  <button type="button" onClick={() => removeRef(idx)}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[#71717A] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Drive folder */}
          <div>
            <label className={labelCls}>Drive folder{opt}</label>
            <input type="url" value={driveUrl} onChange={e => setDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/…" className={inputCls} />
          </div>

          {error && (
            <div className="text-xs text-red-300 bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E4E4E7]">
            <button type="button" onClick={onClose} className="text-sm text-[#A1A1AA] hover:text-[#18181B] font-medium px-3 py-2">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-1.5 text-sm font-semibold text-black bg-[#39A15F] hover:bg-[#2f8a50] px-4 py-2 rounded-lg disabled:opacity-50">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Create request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
