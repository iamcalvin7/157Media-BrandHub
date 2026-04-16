import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, X, AlertTriangle,
  CheckCircle2, XCircle, Clock, Archive, Facebook,
  Instagram, Globe, Loader2, ExternalLink, Plus,
  Trash2, Link2, Upload, ImageIcon, Film, RefreshCw,
  FileUp, History, Check, Pencil
} from "lucide-react";
import { usePillars } from "@/hooks/usePillars";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PostStatus = "pending" | "approved" | "rejected" | "archived";

interface ContentPost {
  id: number;
  title: string | null;
  market: string;
  platform: string;
  pillar: string;
  tone_register: string;
  format: string;
  caption: string;
  visual_direction: string;
  cta: string | null;
  media_url: string | null;
  link_url: string | null;
  cross_post: boolean | null;
  recurring: boolean;
  month: string;
  scheduled_date: string | null;
  status: PostStatus;
  approval: { decision: string; rejection_reason: string | null } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}


const API = import.meta.env.BASE_URL.replace(/\/$/, "");

function statusConfig(status: PostStatus) {
  switch (status) {
    case "approved":
      return { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle2 };
    case "rejected":
      return { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle };
    case "archived":
      return { label: "Archived", color: "bg-gray-100 text-gray-500", icon: Archive };
    default:
      return { label: "Draft", color: "bg-amber-50 text-amber-700", icon: Clock };
  }
}

function marketBadge(market: string) {
  return market.toLowerCase().includes("italian")
    ? "bg-[#1e82b4]/10 text-[#1e82b4]"
    : "bg-[#f6a610]/10 text-[#f6a610]";
}

function marketShort(market: string) {
  return market.toLowerCase().includes("italian") ? "IT" : "EN";
}

function platformIcon(platform: string) {
  if (platform.toLowerCase().includes("instagram")) return Instagram;
  if (platform.toLowerCase().includes("facebook")) return Facebook;
  return Globe;
}


// ─── Card Detail Modal ────────────────────────────────────────────────────────

function CardDetailModal({ post, onClose, onDeleted, onEdit = () => {} }: { post: ContentPost; onClose: () => void; onDeleted: () => void; onEdit?: () => void }) {
  const sc = statusConfig(post.status);
  const Icon = sc.icon;
  const PlatIcon = platformIcon(post.platform);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await fetch(`${API}/api/content/posts/${post.id}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  const isImage = post.media_url && /\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(post.media_url);
  const isVideo = post.media_url && /\.(mp4|mov|webm|avi)(\?|$)/i.test(post.media_url);
  const mediaServePath = post.media_url?.startsWith("/objects/")
    ? `${API}/api/storage${post.media_url}`
    : post.media_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-xs font-bold px-2 py-1 rounded-full", marketBadge(post.market))}>
              {marketShort(post.market)}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              <PlatIcon className="w-3 h-3" />
              {post.platform}
            </span>
            <span className={cn("text-xs px-2 py-1 rounded-full flex items-center gap-1", sc.color)}>
              <Icon className="w-3 h-3" />
              {sc.label}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Pillar</p>
              <p className="text-sm font-semibold text-gray-900">{post.pillar}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Format</p>
              <p className="text-sm font-semibold text-gray-900">{post.format}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Tone Register</p>
              <p className="text-sm font-semibold text-gray-900">{post.tone_register}</p>
            </div>
            {post.scheduled_date && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Scheduled</p>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(post.scheduled_date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </p>
              </div>
            )}
          </div>

          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Caption</p>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-4 border border-gray-100">
              {post.caption}
            </p>
          </div>

          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Visual Direction</p>
            <p className="text-sm text-gray-700 italic">{post.visual_direction}</p>
          </div>

          {/* Media preview */}
          {post.media_url && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Media</p>
              {isImage ? (
                <img src={mediaServePath!} alt="Post media" className="w-full max-h-64 object-contain rounded-xl border border-gray-100 bg-gray-50" />
              ) : isVideo ? (
                <video src={mediaServePath!} controls className="w-full max-h-64 rounded-xl border border-gray-100 bg-black" />
              ) : (
                <a href={mediaServePath!} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-[#1e82b4] hover:underline">
                  <Film className="w-4 h-4" /> View media
                </a>
              )}
            </div>
          )}

          {/* Link */}
          {post.link_url && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Link</p>
              <a href={post.link_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-[#1e82b4] hover:underline break-all">
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                {post.link_url}
              </a>
            </div>
          )}

          {post.cross_post && (
            <div className="flex items-center gap-2 text-[#1e82b4] text-sm font-medium">
              <ExternalLink className="w-4 h-4" />
              Cross-post to Instagram
            </div>
          )}

          {post.approval && (
            <div className={cn("rounded-xl p-4 border", post.approval.decision === "approved" ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100")}>
              <p className="text-xs font-semibold mb-1 capitalize">{post.approval.decision}</p>
              {post.approval.rejection_reason && (
                <p className="text-sm text-gray-700">{post.approval.rejection_reason}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer with edit + delete */}
        <div className="px-6 pb-6 flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-600 font-medium">Delete this post?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-sm font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Yes, delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete post
            </button>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { onClose(); onEdit(); }}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#1e82b4] hover:text-[#1a6d99] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit post
            </button>
            <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 font-medium">Close</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Event type config ─────────────────────────────────────────────────────────

interface CalEvent {
  id: number;
  title: string;
  date: string;
  end_date: string | null;
  market: string;
  type: string;
  recurring: boolean;
}

function eventDotColor(type: string): string {
  switch (type) {
    case "public_holiday": return "bg-red-400";
    case "festival":       return "bg-purple-400";
    case "seasonal":       return "bg-amber-400";
    case "cultural":       return "bg-blue-400";
    case "brand_event":    return "bg-[#1e82b4]";
    default:               return "bg-gray-400";
  }
}

function eventPillColor(type: string): string {
  switch (type) {
    case "public_holiday": return "bg-red-50 text-red-600 border-red-100";
    case "festival":       return "bg-purple-50 text-purple-600 border-purple-100";
    case "seasonal":       return "bg-amber-50 text-amber-700 border-amber-100";
    case "cultural":       return "bg-blue-50 text-blue-600 border-blue-100";
    case "brand_event":    return "bg-[#1e82b4]/8 text-[#1e82b4] border-[#1e82b4]/20";
    default:               return "bg-gray-50 text-gray-500 border-gray-100";
  }
}

// ─── Stacked Calendar ─────────────────────────────────────────────────────────

function CalendarGrid({
  year, month, posts, events, onCardClick,
}: {
  year: number;
  month: number;
  posts: ContentPost[];
  events: CalEvent[];
  onCardClick: (post: ContentPost) => void;
}) {
  const total = daysInMonth(year, month);
  const mk = toMonthKey(year, month);

  const postsByDate: Record<string, ContentPost[]> = {};
  for (const p of posts) {
    const key = p.scheduled_date ?? "unscheduled";
    if (!postsByDate[key]) postsByDate[key] = [];
    postsByDate[key].push(p);
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const unscheduled = posts.filter(p => !p.scheduled_date);

  const days = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div className="space-y-0 divide-y divide-gray-100">
      {days.map(day => {
        const dateStr = `${mk}-${String(day).padStart(2, "0")}`;
        const dayPosts = postsByDate[dateStr] ?? [];
        const isToday = isCurrentMonth && day === today.getDate();
        const d = new Date(year, month, day);
        const dayName = d.toLocaleString("en-GB", { weekday: "short" });
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

        // Events active on this day (single-day or spanning)
        const dayEvents = events.filter(e => {
          const end = e.end_date ?? e.date;
          return e.date <= dateStr && end >= dateStr;
        });

        // First day of this month (for spanning events that started before the month)
        const firstOfMonth = `${mk}-01`;

        // Show pill only on the event's start day — or the 1st of the month if it started earlier
        const pillEvents = dayEvents.filter(e =>
          e.date === dateStr || (e.date < firstOfMonth && dateStr === firstOfMonth)
        );

        return (
          <div
            key={day}
            className={cn(
              "flex gap-5 px-1 py-3 transition-colors",
              dayPosts.length > 0 || dayEvents.length > 0 ? "hover:bg-gray-50/60" : "",
              isWeekend && dayPosts.length === 0 && dayEvents.length === 0 ? "opacity-40" : ""
            )}
          >
            {/* Date column */}
            <div className="w-16 shrink-0 flex flex-col items-center pt-1">
              <span className={cn(
                "text-[10px] font-semibold uppercase tracking-wider",
                isToday ? "text-[#1e82b4]" : "text-gray-400"
              )}>
                {dayName}
              </span>
              <div className={cn(
                "w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold mt-0.5",
                isToday ? "bg-[#1e82b4] text-white" : "text-gray-700"
              )}>
                {day}
              </div>
              {/* Event dots */}
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[40px]">
                  {dayEvents.slice(0, 3).map(e => (
                    <div key={e.id} className={cn("w-1.5 h-1.5 rounded-full", eventDotColor(e.type))} title={e.title} />
                  ))}
                  {dayEvents.length > 3 && <div className="text-[8px] text-gray-400 font-bold leading-none">+{dayEvents.length - 3}</div>}
                </div>
              )}
            </div>

            {/* Posts + event pills */}
            <div className="flex-1 min-w-0">
              {/* Event pills — only on start day (or 1st of month for spanning events) */}
              {pillEvents.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {pillEvents.map(e => (
                    <span
                      key={e.id}
                      className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border truncate max-w-[220px]", eventPillColor(e.type))}
                      title={e.end_date && e.end_date !== e.date ? `${e.title} (until ${e.end_date})` : e.title}
                    >
                      {e.title}
                      {e.end_date && e.end_date !== e.date && " →"}
                    </span>
                  ))}
                </div>
              )}

              {dayPosts.length === 0 && dayEvents.length === 0 ? (
                <div className="h-10 flex items-center">
                  <div className="h-px w-full bg-gray-100" />
                </div>
              ) : dayPosts.length === 0 ? (
                <div className="h-2" />
              ) : (
                <div className="space-y-2 py-0.5">
                  {dayPosts.map(post => (
                    <PostRow key={post.id} post={post} onClick={() => onCardClick(post)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {unscheduled.length > 0 && (
        <div className="mt-4 pt-4 px-1">
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              <p className="text-xs font-semibold uppercase tracking-wider">
                {unscheduled.length} post{unscheduled.length > 1 ? "s" : ""} without a date
              </p>
            </div>
            <div className="space-y-2">
              {unscheduled.map(post => (
                <PostRow key={post.id} post={post} onClick={() => onCardClick(post)} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Post Row (used in stacked view) ─────────────────────────────────────────

function PostRow({ post, onClick }: { post: ContentPost; onClick: () => void }) {
  const sc = statusConfig(post.status);
  const Icon = sc.icon;
  const PlatIcon = platformIcon(post.platform);

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-[#1e82b4]/30 hover:shadow-sm transition-all group"
    >
      {/* Status stripe */}
      <div className={cn("w-1 h-8 rounded-full shrink-0", sc.color.includes("green") ? "bg-green-400" : sc.color.includes("red") ? "bg-red-400" : "bg-amber-300")} />

      {/* Market + platform */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", marketBadge(post.market))}>
          {marketShort(post.market)}
        </span>
        <PlatIcon className="w-3.5 h-3.5 text-gray-400" />
      </div>

      {/* Title + format */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-gray-900">
            {post.title?.trim() || post.pillar}
          </p>
          {post.recurring && <RefreshCw className="w-3 h-3 text-violet-400 shrink-0" title="Repeats yearly" />}
        </div>
        <p className="text-[11px] text-gray-400 truncate">{post.pillar} · {post.format}</p>
      </div>

      {/* Caption preview */}
      <p className="hidden md:block text-[12px] text-gray-400 truncate max-w-[260px] font-light">{post.caption}</p>

      {/* Status */}
      <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full shrink-0", sc.color)}>
        <Icon className="w-3 h-3" />
        {sc.label}
      </span>
    </button>
  );
}

// ─── New / Edit Post Modal ────────────────────────────────────────────────────

const FORMATS = ["Single Image", "Carousel", "Reel", "Video"];
const TONE_REGISTERS = ["Destination Spotlight", "Offer / Promotion", "Journey Moment", "Community & Culture", "Behind the Scenes", "UGC / Social Proof", "Educational", "Operational"];

interface NewPostForm {
  market: string;
  platform: string;
  pillar: string;
  format: string;
  title: string;
  caption: string;
  visual_direction: string;
  visual_reference_url: string;
  cross_post: boolean;
  scheduled_date: string;
  status: string;
  attachment_type: "none" | "upload" | "link";
  link_url: string;
  recurring: boolean;
}

function NewPostModal({
  monthKey,
  editPost,
  onClose,
  onSaved,
}: {
  monthKey: string;
  editPost?: ContentPost;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [year, mon] = monthKey.split("-").map(Number);
  const today = new Date();
  const defaultDate = today.getFullYear() === year && today.getMonth() + 1 === mon
    ? today.toISOString().slice(0, 10)
    : `${monthKey}-01`;

  const { allPillars, englishPillars, italianPillars } = usePillars();

  const [form, setForm] = useState<NewPostForm>(() => {
    if (editPost) {
      return {
        market: editPost.market,
        platform: editPost.platform,
        pillar: editPost.pillar,
        format: editPost.format,
        title: editPost.title ?? "",
        caption: editPost.caption,
        visual_direction: editPost.visual_direction,
        visual_reference_url: "",
        cross_post: editPost.cross_post ?? false,
        scheduled_date: editPost.scheduled_date ?? defaultDate,
        status: editPost.status,
        attachment_type: editPost.link_url ? "link" : "none",
        link_url: editPost.link_url ?? "",
        recurring: editPost.recurring,
      };
    }
    return {
      market: "English Market",
      platform: "Facebook",
      pillar: allPillars[0] ?? "Why VF",
      format: FORMATS[0],
      title: "",
      caption: "",
      visual_direction: "",
      visual_reference_url: "",
      cross_post: false,
      scheduled_date: defaultDate,
      status: "pending",
      attachment_type: "none",
      link_url: "",
      recurring: false,
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "done">("idle");
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);

  function set<K extends keyof NewPostForm>(key: K, val: NewPostForm[K]) {
    setForm(f => {
      const next = { ...f, [key]: val };
      // Instagram only available for English market
      if (key === "market" && val === "Italian Market" && next.platform === "Instagram") {
        next.platform = "Facebook";
        next.cross_post = false;
      }
      // cross_post only for English FB
      if ((key === "platform" && val !== "Facebook") || (key === "market" && val === "Italian Market")) {
        next.cross_post = false;
      }
      return next;
    });
  }

  async function handleFileChange(file: File) {
    setSelectedFile(file);
    setUploadProgress("uploading");
    setError("");
    try {
      const urlResp = await fetch(`${API}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlResp.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlResp.json();
      await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      setUploadedPath(objectPath);
      setUploadProgress("done");
    } catch {
      setError("Upload failed — please try again.");
      setUploadProgress("idle");
      setSelectedFile(null);
    }
  }

  async function save() {
    if (form.attachment_type === "upload" && uploadProgress !== "done") {
      setError("Please wait for the upload to complete.");
      return;
    }
    setSaving(true); setError("");
    try {
      const payload = {
        market: form.market,
        platform: form.platform,
        pillar: form.pillar,
        title: form.title.trim() || null,
        format: form.format,
        caption: form.caption.trim(),
        visual_direction: form.visual_direction.trim(),
        visual_reference_url: form.visual_reference_url.trim() || null,
        media_url: form.attachment_type === "upload" ? (uploadedPath || null) : null,
        link_url: form.attachment_type === "link" ? (form.link_url.trim() || null) : null,
        cross_post: form.cross_post,
        recurring: form.recurring,
        month: monthKey,
        scheduled_date: form.scheduled_date || null,
        status: form.status,
      };
      let resp: Response;
      if (editPost) {
        resp = await fetch(`${API}/api/content/posts/${editPost.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        resp = await fetch(`${API}/api/content/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([payload]),
        });
      }
      if (!resp.ok) throw new Error("Failed");
      onSaved();
    } catch {
      setError("Failed to save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  const isEnglish = form.market === "English Market";
  const isFB = form.platform === "Facebook";

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/20 focus:border-[#1e82b4] bg-white";
  const labelCls = "text-[10px] font-semibold text-gray-500 uppercase tracking-widest block mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">{editPost ? "Edit post" : "Add a post"}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(year, mon - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" })}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Market + Platform */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Market</label>
              <select value={form.market} onChange={e => set("market", e.target.value)} className={inputCls}>
                <option value="English Market">English</option>
                <option value="Italian Market">Italian</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Platform</label>
              <select value={form.platform} onChange={e => set("platform", e.target.value)} className={inputCls}>
                <option value="Facebook">Facebook</option>
                {isEnglish && <option value="Instagram">Instagram</option>}
              </select>
            </div>
          </div>

          {/* Date + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Scheduled date</label>
              <input
                type="date"
                value={form.scheduled_date}
                min={`${monthKey}-01`}
                max={`${monthKey}-${new Date(year, mon, 0).getDate()}`}
                onChange={e => set("scheduled_date", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} className={inputCls}>
                <option value="pending">Draft</option>
                <option value="approved">Approved</option>
              </select>
            </div>
          </div>

          {/* Pillar + Format */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Pillar</label>
              <select value={form.pillar} onChange={e => set("pillar", e.target.value)} className={inputCls}>
                {(form.market === "Italian Market" ? italianPillars : englishPillars).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Format</label>
              <select value={form.format} onChange={e => set("format", e.target.value)} className={inputCls}>
                {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* Content title */}
          <div>
            <label className={labelCls}>Content title <span className="text-gray-300 normal-case font-normal">(optional)</span></label>
            <input
              type="text"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g. Summer opening · Dog Day feature · Valletta sunset Reel"
              className={inputCls}
            />
          </div>

          {/* Caption */}
          <div>
            <label className={labelCls}>Caption <span className="font-normal normal-case text-gray-300">optional</span></label>
            <textarea
              value={form.caption}
              onChange={e => set("caption", e.target.value)}
              placeholder={isEnglish && !isFB ? "Write an Instagram-native caption…" : "Write the full post copy…"}
              rows={5}
              className={`${inputCls} resize-none font-light leading-relaxed`}
            />
          </div>

          {/* Visual direction */}
          <div>
            <label className={labelCls}>Visual direction <span className="font-normal normal-case text-gray-300">optional</span></label>
            <textarea
              value={form.visual_direction}
              onChange={e => set("visual_direction", e.target.value)}
              placeholder="What should the image or video show?"
              rows={2}
              className={`${inputCls} resize-none font-light`}
            />
          </div>

          {/* Visual reference link */}
          <div>
            <label className={labelCls}>Visual reference <span className="text-gray-300 normal-case font-normal">(optional)</span></label>
            <input
              type="url"
              value={form.visual_reference_url}
              onChange={e => set("visual_reference_url", e.target.value)}
              placeholder="https://drive.google.com/… or any reference link"
              className={inputCls}
            />
          </div>

          {/* Attachment — upload or link */}
          <div>
            <label className={labelCls}>Attachment <span className="text-gray-300 normal-case font-normal">(optional)</span></label>
            <div className="flex gap-2 mb-3">
              {(["none", "upload", "link"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { set("attachment_type", t); setSelectedFile(null); setUploadedPath(null); setUploadProgress("idle"); }}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
                    form.attachment_type === t
                      ? "bg-[#1e82b4] text-white border-[#1e82b4]"
                      : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                  )}
                >
                  {t === "none" && "None"}
                  {t === "upload" && <><Upload className="w-3 h-3" /> Upload</>}
                  {t === "link" && <><Link2 className="w-3 h-3" /> Link</>}
                </button>
              ))}
            </div>

            {form.attachment_type === "upload" && (
              <div>
                <label className={cn(
                  "flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors",
                  uploadProgress === "done" ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-[#1e82b4]/40 bg-gray-50"
                )}>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }}
                    disabled={uploadProgress === "uploading"}
                  />
                  {uploadProgress === "idle" && (
                    <>
                      <div className="flex gap-2 text-gray-400">
                        <ImageIcon className="w-5 h-5" />
                        <Film className="w-5 h-5" />
                      </div>
                      <p className="text-sm text-gray-500">Click to select image or video</p>
                      <p className="text-xs text-gray-400">JPG, PNG, GIF, MP4, MOV, WebM</p>
                    </>
                  )}
                  {uploadProgress === "uploading" && (
                    <div className="flex items-center gap-2 text-[#1e82b4]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Uploading {selectedFile?.name}…</span>
                    </div>
                  )}
                  {uploadProgress === "done" && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">{selectedFile?.name} uploaded</span>
                    </div>
                  )}
                </label>
              </div>
            )}

            {form.attachment_type === "link" && (
              <input
                type="url"
                value={form.link_url}
                onChange={e => set("link_url", e.target.value)}
                placeholder="https://virtuferries.com/…"
                className={inputCls}
              />
            )}
          </div>

          {/* Cross-post toggle — English FB only */}
          {isEnglish && isFB && (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => set("cross_post", !form.cross_post)}
                className={cn(
                  "w-10 h-5 rounded-full transition-colors relative shrink-0",
                  form.cross_post ? "bg-[#1e82b4]" : "bg-gray-200"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full bg-white shadow absolute top-0.5 transition-transform",
                  form.cross_post ? "translate-x-5" : "translate-x-0.5"
                )} />
              </div>
              <span className="text-sm text-gray-700">Cross-post to Instagram</span>
            </label>
          )}

          {/* Recurring toggle */}
          <button
            type="button"
            onClick={() => set("recurring", !form.recurring)}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left transition-all",
              form.recurring
                ? "border-[#1e82b4]/40 bg-[#1e82b4]/5"
                : "border-gray-200 bg-white hover:border-gray-300"
            )}
          >
            <div className={cn(
              "w-9 h-5 rounded-full relative transition-colors shrink-0",
              form.recurring ? "bg-[#1e82b4]" : "bg-gray-200"
            )}>
              <div className={cn(
                "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                form.recurring ? "translate-x-4" : "translate-x-0.5"
              )} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Repeats every year</p>
              <p className="text-xs text-gray-400 font-light">Tag this as an annual post — e.g. a Christmas post, an anniversary post</p>
            </div>
          </button>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="px-6 pb-6 flex items-center gap-3">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 font-medium">Cancel</button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white font-semibold px-6 rounded-xl disabled:opacity-50"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : "Save post"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse a single CSV line handling quoted fields
  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuote) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') { inQuote = false; }
        else { cur += ch; }
      } else {
        if (ch === '"') { inQuote = true; }
        else if (ch === ',') { fields.push(cur.trim()); cur = ""; }
        else { cur += ch; }
      }
    }
    fields.push(cur.trim());
    return fields;
  };

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ""; });
    return obj;
  });
}

// Normalise column names from common export formats to our standard
function normaliseRow(row: Record<string, string>): { date: string; time: string; platform: string; caption: string; direction: string } {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      const val = row[k] ?? row[k.replace(/_/g, " ")] ?? "";
      if (val) return val;
    }
    return "";
  };
  return {
    date:      get("date", "scheduled_date", "post_date"),
    time:      get("time", "scheduled_time", "post_time"),
    platform:  get("platform", "channel", "network"),
    caption:   get("caption", "copy", "text", "content", "message"),
    direction: get("direction", "visual_direction", "creative_direction", "brief", "notes"),
  };
}

// ─── Import History Modal ──────────────────────────────────────────────────────

interface ParsedRow {
  date: string;
  time: string;
  platform: string;
  caption: string;
  direction: string;
  market: string;
}

function ImportHistoryModal({ onClose, onImported }: { onClose: () => void; onImported: (count: number) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv")) { setError("Please upload a .csv file."); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsed = parseCsv(text);
        if (parsed.length === 0) { setError("No rows found. Check the file has headers and data."); return; }
        const normalised: ParsedRow[] = parsed.map(r => {
          const n = normaliseRow(r);
          // Auto-detect market from platform
          const market = n.platform.toLowerCase().includes("italian") || n.platform.toLowerCase().includes("it ") ? "Italian" : "English";
          return { ...n, market };
        }).filter(r => r.caption);
        if (normalised.length === 0) { setError("Could not find a caption/copy column."); return; }
        setRows(normalised);
        setError("");
      } catch {
        setError("Could not parse the file. Make sure it's a valid CSV.");
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API}/api/content/past-posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows.map(r => ({
          date: r.date,
          time: r.time || undefined,
          platform: r.platform,
          caption: r.caption,
          direction: r.direction || undefined,
          market: r.market || undefined,
        }))),
      });
      if (!resp.ok) throw new Error("Import failed");
      const data = await resp.json();
      setImportedCount(data.imported ?? rows.length);
      setDone(true);
      onImported(data.imported ?? rows.length);
    } catch {
      setError("Import failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1e82b4]/10 flex items-center justify-center">
              <History className="w-4 h-4 text-[#1e82b4]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-gray-900">Import Past Content</h2>
              <p className="text-[11px] text-gray-400">Upload your previous calendar CSV to teach the AI your style</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {done ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                <Check className="w-7 h-7 text-green-500" />
              </div>
              <div>
                <p className="text-base font-extrabold text-gray-900">
                  {importedCount} posts imported
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  The AI will now reference your past content when generating new ideas.
                </p>
              </div>
              <Button onClick={onClose} className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white text-xs font-semibold px-6 py-2 rounded-xl mt-2">
                Done
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
                  dragging ? "border-[#1e82b4] bg-[#1e82b4]/5" : "border-gray-200 hover:border-[#1e82b4]/40 hover:bg-gray-50"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                  <FileUp className="w-5 h-5 text-gray-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">Drop your CSV here, or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">Export from Google Sheets or Excel as CSV</p>
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />

              {/* Expected format */}
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Expected columns</p>
                <div className="flex flex-wrap gap-2">
                  {["date", "time", "caption", "platform", "direction"].map(col => (
                    <span key={col} className="text-[11px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-md font-mono">{col}</span>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-2">Column names are flexible — the importer will try to match common variations automatically.</p>
              </div>

              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </>
          ) : (
            <>
              {/* Preview */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600">{rows.length} rows found — preview:</p>
                <button onClick={() => setRows([])} className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-left">
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Platform</th>
                      <th className="px-3 py-2 font-semibold">Market</th>
                      <th className="px-3 py-2 font-semibold">Caption</th>
                      <th className="px-3 py-2 font-semibold">Direction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.slice(0, 8).map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50/60">
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.date}</td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{r.platform}</td>
                        <td className="px-3 py-2">
                          <select
                            value={r.market}
                            onChange={e => setRows(prev => prev.map((row, ri) => ri === i ? { ...row, market: e.target.value } : row))}
                            className="text-[11px] border border-gray-200 rounded-md px-1.5 py-0.5 bg-white"
                          >
                            <option value="English">English</option>
                            <option value="Italian">Italian</option>
                            <option value="both">Both</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate">{r.caption}</td>
                        <td className="px-3 py-2 text-gray-500 max-w-[160px] truncate">{r.direction}</td>
                      </tr>
                    ))}
                    {rows.length > 8 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-2 text-[11px] text-gray-400 text-center">+ {rows.length - 8} more rows</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </>
          )}
        </div>

        {!done && rows.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 shrink-0">
            <button onClick={() => setRows([])} className="text-sm text-gray-400 hover:text-gray-600 font-medium">Back</button>
            <Button
              onClick={handleImport}
              disabled={loading}
              className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white text-xs font-semibold px-6 py-2 rounded-xl flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Import {rows.length} posts
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContentCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null);
  const [editPost, setEditPost] = useState<ContentPost | null>(null);
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loadedEventsYear, setLoadedEventsYear] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);

  const monthKey = toMonthKey(year, month);

  const fetchPosts = useCallback(async (mk: string) => {
    setLoading(true);
    try {
      const resp = await fetch(`${API}/api/content/posts?month=${mk}`);
      if (resp.ok) {
        const data = await resp.json();
        setPosts(data.posts ?? data);
        setLoadedMonth(mk);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async (yr: number) => {
    try {
      const resp = await fetch(`${API}/api/events?year=${yr}`);
      if (resp.ok) {
        const data: CalEvent[] = await resp.json();
        setEvents(data);
        setLoadedEventsYear(yr);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  if (loadedMonth !== monthKey && !loading) {
    fetchPosts(monthKey);
  }

  if (loadedEventsYear !== year) {
    fetchEvents(year);
  }

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const isPast = monthKey < toMonthKey(now.getFullYear(), now.getMonth());

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-extrabold text-gray-900">Content Calendar</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-gray-800 min-w-[140px] text-center">
                {monthLabel(year, month)}
              </span>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {isPast && (
              <span className="text-[11px] bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                Past
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {loading && <Loader2 className="w-4 h-4 text-gray-300 animate-spin" />}
            <div className="hidden sm:flex items-center gap-3 text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Draft
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Approved
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Rejected
              </span>
            </div>
            <button
              onClick={() => setShowImport(true)}
              className="text-xs font-semibold text-gray-400 hover:text-[#1e82b4] transition-colors flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-[#1e82b4]/5"
            >
              <History className="w-3.5 h-3.5" />
              Import history
            </button>
            <Button
              onClick={() => setShowNewPost(true)}
              className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add post
            </Button>
          </div>
        </div>
      </div>

      {/* Post count summary */}
      {posts.length > 0 && (
        <div className="border-b border-gray-100 bg-gray-50/60">
          <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center gap-6 flex-wrap">
            {(["Facebook", "Instagram"] as const).map(plat => {
              const platPosts = posts.filter(p => p.platform.toLowerCase().includes(plat.toLowerCase()));
              if (platPosts.length === 0) return null;
              const en = platPosts.filter(p => !p.market.toLowerCase().includes("italian")).length;
              const it = platPosts.filter(p => p.market.toLowerCase().includes("italian")).length;
              const Icon = plat === "Facebook" ? Facebook : Instagram;
              return (
                <div key={plat} className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <span className="text-xs font-semibold text-gray-700">{plat}</span>
                  <span className="text-xs font-bold text-gray-900">{platPosts.length}</span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    {en > 0 && it > 0 ? `(${en} EN · ${it} IT)` : en > 0 ? `(EN)` : `(IT)`}
                  </span>
                </div>
              );
            })}
            <div className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="font-semibold text-gray-600">{posts.length}</span> posts total
              {posts.filter(p => !p.scheduled_date).length > 0 && (
                <span className="ml-2 text-amber-600 font-semibold">
                  · {posts.filter(p => !p.scheduled_date).length} unscheduled
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        {loading && posts.length === 0 ? (
          <div className="py-24 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
          </div>
        ) : (
          <CalendarGrid
            year={year}
            month={month}
            posts={posts}
            events={events}
            onCardClick={setSelectedPost}
          />
        )}
      </div>

      {/* Card Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <CardDetailModal
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            onDeleted={() => { setSelectedPost(null); fetchPosts(monthKey); }}
            onEdit={() => { setEditPost(selectedPost); setSelectedPost(null); }}
          />
        )}
      </AnimatePresence>

      {/* Edit Post Modal */}
      <AnimatePresence>
        {editPost && (
          <NewPostModal
            monthKey={editPost.month ?? monthKey}
            editPost={editPost}
            onClose={() => setEditPost(null)}
            onSaved={() => { setEditPost(null); fetchPosts(monthKey); }}
          />
        )}
      </AnimatePresence>

      {/* New Post Modal */}
      <AnimatePresence>
        {showNewPost && (
          <NewPostModal
            monthKey={monthKey}
            onClose={() => setShowNewPost(false)}
            onSaved={() => {
              setShowNewPost(false);
              setLoadedMonth(null); // force refresh
            }}
          />
        )}
      </AnimatePresence>

      {/* Import History Modal */}
      <AnimatePresence>
        {showImport && (
          <ImportHistoryModal
            onClose={() => setShowImport(false)}
            onImported={(_count) => {
              setTimeout(() => setShowImport(false), 2000);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
