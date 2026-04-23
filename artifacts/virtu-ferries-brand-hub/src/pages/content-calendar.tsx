import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, X, AlertTriangle,
  CheckCircle2, XCircle, Clock, Archive, Facebook,
  Instagram, Globe, Loader2, ExternalLink, Plus,
  Trash2, Link2, Upload, ImageIcon, Film, RefreshCw,
  FileUp, History, Check, Pencil, Sparkles, Zap, Download, AlignLeft
} from "lucide-react";
import { usePillars } from "@/hooks/usePillars";
import { useTeamMembers } from "@/hooks/useTeamMembers";
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
  resources: string | null;
  visual_reference_url: string | null;
  cta: string | null;
  media_url: string | null;
  link_url: string | null;
  cross_post: boolean | null;
  recurring: boolean;
  notes: string | null;
  month: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: PostStatus;
  assigned_to: string | null;
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
  if (platform.toLowerCase() === "both") return Facebook;
  if (platform.toLowerCase().includes("instagram")) return Instagram;
  if (platform.toLowerCase().includes("facebook")) return Facebook;
  return Globe;
}

function platformColor(platform: string) {
  if (platform.toLowerCase() === "both") return "text-[#1877F2]";
  if (platform.toLowerCase().includes("instagram")) return "text-[#E1306C]";
  if (platform.toLowerCase().includes("facebook")) return "text-[#1877F2]";
  return "text-gray-400";
}


// ─── Media Image with fallback ───────────────────────────────────────────────

function MediaImage({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (failed) {
    return (
      <a href={src} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-[#1e82b4] hover:underline">
        <Film className="w-4 h-4" /> View media
      </a>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setExpanded(true)} className="block w-full focus:outline-none group relative">
        <img
          src={src}
          alt="Post media"
          onError={() => setFailed(true)}
          className="w-full max-h-64 object-contain rounded-xl border border-gray-100 bg-gray-50 transition group-hover:brightness-90 cursor-zoom-in"
        />
        <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <span className="bg-black/50 text-white text-xs px-2 py-1 rounded-full">Tap to expand</span>
        </span>
      </button>

      {expanded && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="absolute top-4 right-4 text-white bg-black/40 hover:bg-black/70 rounded-full p-2 transition"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={src}
            alt="Post media expanded"
            className="max-w-[92vw] max-h-[88vh] object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ─── Mini Calendar Picker ────────────────────────────────────────────────────

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const PLATFORM_DOT_COLOR: Record<string, string> = {
  Facebook: "#1877F2",
  Instagram: "#E1306C",
  Both: "#8B5CF6",
};

function MiniCalendar({
  monthKey,
  value,
  onChange,
  posts,
  excludeId,
}: {
  monthKey: string;
  value: string;
  onChange: (d: string) => void;
  posts: ContentPost[];
  excludeId?: number;
}) {
  const [initYear, initMon] = monthKey.split("-").map(Number);
  const [year, setYear] = useState(initYear);
  const [mon, setMon] = useState(initMon);

  const totalDays = new Date(year, mon, 0).getDate();
  const firstWeekday = new Date(year, mon - 1, 1).getDay(); // 0=Sun
  const today = new Date().toISOString().slice(0, 10);

  const monthName = new Date(year, mon - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  function prevMon() {
    if (mon === 1) { setYear(y => y - 1); setMon(12); }
    else setMon(m => m - 1);
  }
  function nextMon() {
    if (mon === 12) { setYear(y => y + 1); setMon(1); }
    else setMon(m => m + 1);
  }

  const postsByDay = new Map<number, ContentPost[]>();
  for (const p of posts) {
    if (!p.scheduled_date || p.id === excludeId) continue;
    const [py, pm, pd] = p.scheduled_date.split("-").map(Number);
    if (py === year && pm === mon) {
      const arr = postsByDay.get(pd) ?? [];
      arr.push(p);
      postsByDay.set(pd, arr);
    }
  }

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 select-none">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={prevMon}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-[11px] font-semibold text-gray-700">{monthName}</span>
        <button
          type="button"
          onClick={nextMon}
          className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = value === dateStr;
          const isToday = today === dateStr;
          const dayPosts = postsByDay.get(day) ?? [];

          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(dateStr)}
              className={cn(
                "flex flex-col items-center justify-start rounded-lg pt-1 pb-1 transition focus:outline-none",
                isSelected
                  ? "bg-[#1e82b4] text-white"
                  : "hover:bg-gray-100 text-gray-700"
              )}
            >
              <span className={cn(
                "text-[12px] font-semibold leading-none",
                isToday && !isSelected && "underline decoration-[#1e82b4]"
              )}>
                {day}
              </span>
              <div className="flex gap-px mt-1 flex-wrap justify-center min-h-[5px]">
                {dayPosts.slice(0, 3).map((p, pi) => (
                  <span
                    key={pi}
                    className="inline-block w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.8)" : (PLATFORM_DOT_COLOR[p.platform] ?? "#9CA3AF") }}
                  />
                ))}
                {dayPosts.length > 3 && (
                  <span className={cn("text-[8px] leading-none mt-px", isSelected ? "text-white/80" : "text-gray-400")}>
                    +{dayPosts.length - 3}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Card Detail Modal ────────────────────────────────────────────────────────

function CardDetailModal({ post, onClose, onDeleted, onEdit = () => {} }: { post: ContentPost; onClose: () => void; onDeleted: () => void; onEdit?: () => void }) {
  const sc = statusConfig(post.status);
  const Icon = sc.icon;
  const PlatIcon = platformIcon(post.platform);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localTitle, setLocalTitle] = useState(post.title ?? "");
  const [editingTitle, setEditingTitle] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  async function saveTitle() {
    const trimmed = localTitle.trim();
    setSavingTitle(true);
    try {
      await fetch(`${API}/api/content/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed || null }),
      });
    } finally {
      setSavingTitle(false);
      setEditingTitle(false);
    }
  }

  function startEditTitle() {
    setEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  }

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

  const [downloadingBrief, setDownloadingBrief] = useState(false);

  async function downloadBrief() {
    setDownloadingBrief(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const PAGE_W = 210;
      const PAGE_H = 297;
      const M = 18;
      const BLUE: [number, number, number] = [30, 130, 180];
      const AMBER: [number, number, number] = [246, 166, 16];
      const GRAY_LABEL: [number, number, number] = [140, 140, 140];
      const GRAY_TEXT: [number, number, number] = [40, 40, 40];

      // Header band
      doc.setFillColor(...BLUE);
      doc.rect(0, 0, PAGE_W, 22, "F");
      doc.setFillColor(...AMBER);
      doc.rect(0, 22, PAGE_W, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("VIRTU FERRIES", M, 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Content Brief", M, 17.5);

      const dateLabel = post.scheduled_date
        ? new Date(post.scheduled_date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        : "Unscheduled";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      const dlw = doc.getTextWidth(dateLabel);
      doc.text(dateLabel, PAGE_W - M - dlw, 14);

      let y = 34;

      // jsPDF's helvetica is Latin-1 only — strip emojis & other non-printable
      // pictographic glyphs so they don't render as garbled bytes (Ø=Þ etc.)
      const sanitize = (s: string | null | undefined): string => {
        if (!s) return "";
        return s
          .replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}\u200D\uFE0F]/gu, "")
          .replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "")
          .replace(/[ \t]+\n/g, "\n")
          .replace(/[ \t]{2,}/g, " ")
          .trim();
      };

      // Title
      const title = sanitize(post.title?.trim() || post.caption.split("\n")[0]).slice(0, 140) || "Untitled post";
      doc.setTextColor(...GRAY_TEXT);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      const titleLines = doc.splitTextToSize(title, PAGE_W - M * 2);
      doc.text(titleLines, M, y);
      y += titleLines.length * 7 + 3;

      // Meta pills row
      const meta = [
        post.market === "English Market" ? "EN" : "IT",
        post.platform,
        post.pillar,
        post.format,
        post.tone_register,
        post.scheduled_time ? `@ ${post.scheduled_time}` : null,
      ].filter(Boolean) as string[];
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...GRAY_LABEL);
      doc.text(meta.join("   ·   "), M, y);
      y += 8;

      // Divider
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.3);
      doc.line(M, y, PAGE_W - M, y);
      y += 8;

      const ensureSpace = (needed: number) => {
        if (y + needed > PAGE_H - M) {
          doc.addPage();
          y = M;
        }
      };

      // Embed photo (if the post has an image — checks file extension OR fetched Content-Type)
      if (post.media_url) {
        try {
          const looksLikeVideo = /\.(mp4|mov|webm|avi|mkv)(\?|#|$)/i.test(post.media_url);
          if (!looksLikeVideo) {
            const imgUrl = post.media_url.startsWith("/objects/")
              ? `${API}/api/storage${post.media_url}`
              : post.media_url;
            console.log("[brief] fetching media for embed:", imgUrl);
            const resp = await fetch(imgUrl);
            if (!resp.ok) throw new Error(`media fetch failed: ${resp.status}`);
            const ct = (resp.headers.get("content-type") || "").toLowerCase();
            const isImage = ct.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|avif)(\?|#|$)/i.test(post.media_url);
            if (isImage) {
              const blob = await resp.blob();
              const dataUrl: string = await new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(r.result as string);
                r.onerror = reject;
                r.readAsDataURL(blob);
              });
              const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
                const im = new Image();
                im.onload = () => resolve({ w: im.naturalWidth, h: im.naturalHeight });
                im.onerror = () => reject(new Error("image decode failed"));
                im.src = dataUrl;
              });
              const maxW = PAGE_W - M * 2;
              const maxH = 100;
              const ratio = dims.w / dims.h;
              let drawW = maxW;
              let drawH = drawW / ratio;
              if (drawH > maxH) {
                drawH = maxH;
                drawW = drawH * ratio;
              }
              ensureSpace(drawH + 6);
              const fmtFromCt = ct.split("/")[1]?.split(";")[0]?.toUpperCase();
              const fmtFromData = dataUrl.match(/^data:image\/(\w+);/)?.[1]?.toUpperCase();
              const raw = (fmtFromCt || fmtFromData || "JPEG").toUpperCase();
              const supported = raw === "JPG" ? "JPEG" : (["JPEG", "PNG", "WEBP", "GIF"].includes(raw) ? raw : "JPEG");
              doc.addImage(dataUrl, supported, M, y, drawW, drawH, undefined, "FAST");
              y += drawH + 6;
              console.log("[brief] embedded image", { fmt: supported, w: drawW, h: drawH });
            } else {
              console.log("[brief] media is not an image, skipping embed:", ct);
            }
          }
        } catch (err) {
          console.warn("[brief] could not embed image:", err);
        }
      } else {
        console.log("[brief] no media_url on post");
      }

      const section = (label: string, body: string | null | undefined, opts?: { link?: boolean }) => {
        if (!body || !body.trim()) return;
        ensureSpace(14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...GRAY_LABEL);
        doc.text(label.toUpperCase(), M, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        const isLink = !!opts?.link;
        if (isLink) doc.setTextColor(30, 130, 180);
        else doc.setTextColor(...GRAY_TEXT);
        const trimmed = isLink ? body.trim() : sanitize(body);
        if (!trimmed) return;
        const lines = doc.splitTextToSize(trimmed, PAGE_W - M * 2);
        for (const line of lines) {
          ensureSpace(6);
          if (isLink) {
            doc.textWithLink(line, M, y, { url: trimmed });
          } else {
            doc.text(line, M, y);
          }
          y += 5.5;
        }
        if (isLink) doc.setTextColor(...GRAY_TEXT);
        y += 4;
      };

      section("Format", post.format);
      section("Caption", post.caption);
      section("Visual Direction", post.visual_direction);
      if (post.resources) section("Resources", post.resources);
      if (post.assigned_to) section("Assigned To", post.assigned_to);
      if (post.notes) section("Notes", post.notes);
      if (post.visual_reference_url) section("Visual Reference", post.visual_reference_url, { link: true });
      if (post.link_url) section("Link", post.link_url, { link: true });
      if (post.drive_url) section("Drive Folder (Export + PSD)", post.drive_url, { link: true });

      // Status footer
      ensureSpace(14);
      doc.setDrawColor(230, 230, 230);
      doc.line(M, y, PAGE_W - M, y);
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY_LABEL);
      doc.text("STATUS", M, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...GRAY_TEXT);
      doc.text(post.status.toUpperCase(), M + 22, y);

      const safeTitle = (post.title?.trim() || `post-${post.id}`).replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase().slice(0, 50);
      const datePart = post.scheduled_date ?? "unscheduled";
      doc.save(`brief-${datePart}-${safeTitle}.pdf`);
    } finally {
      setDownloadingBrief(false);
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
              <PlatIcon className={cn("w-3 h-3", platformColor(post.platform))} />
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
          {/* Inline title edit */}
          <div className="group flex items-start gap-2">
            {editingTitle ? (
              <div className="flex-1 flex items-center gap-2">
                <input
                  ref={titleInputRef}
                  value={localTitle}
                  onChange={e => setLocalTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                  onBlur={saveTitle}
                  placeholder="Add a content title…"
                  className="flex-1 text-lg font-bold text-gray-900 border-b-2 border-[#1e82b4] bg-transparent focus:outline-none pb-0.5"
                  autoFocus
                />
                {savingTitle && <Loader2 className="w-4 h-4 animate-spin text-gray-400 shrink-0" />}
              </div>
            ) : (
              <button
                type="button"
                onClick={startEditTitle}
                className="flex-1 text-left group/title"
              >
                {localTitle.trim() ? (
                  <h2 className="text-lg font-bold text-gray-900 group-hover/title:text-[#1e82b4] transition-colors leading-snug">
                    {localTitle}
                  </h2>
                ) : (
                  <p className="text-sm text-gray-300 italic group-hover/title:text-[#1e82b4] transition-colors">
                    Add a content title…
                  </p>
                )}
              </button>
            )}
            {!editingTitle && (
              <button
                type="button"
                onClick={startEditTitle}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-[#1e82b4] p-1 rounded shrink-0 mt-0.5"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Pillar</p>
              <p className="text-sm font-semibold text-gray-900">{post.pillar}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Format</p>
              <p className="text-sm font-semibold text-gray-900">{post.format}</p>
            </div>
            {post.scheduled_date && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Scheduled</p>
                <p className="text-sm font-semibold text-gray-900">
                  {new Date(post.scheduled_date + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  {post.scheduled_time && (
                    <span className="ml-1.5 text-[#1e82b4]">@ {post.scheduled_time}</span>
                  )}
                </p>
              </div>
            )}
            {post.assigned_to && (
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Assigned to</p>
                <p className="text-sm font-semibold text-gray-900">{post.assigned_to}</p>
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

          {post.resources && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Resources</p>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-4 border border-gray-100 break-words">
                {post.resources.split(/(\s+)/).map((tok, i) => {
                  if (/^https?:\/\/\S+$/.test(tok)) {
                    return <a key={i} href={tok} target="_blank" rel="noopener noreferrer" className="text-[#1e82b4] hover:underline">{tok}</a>;
                  }
                  return <span key={i}>{tok}</span>;
                })}
              </div>
            </div>
          )}

          {/* Media preview */}
          {post.media_url && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Media</p>
              {isVideo ? (
                <video src={mediaServePath!} controls className="w-full max-h-64 rounded-xl border border-gray-100 bg-black" />
              ) : (
                <MediaImage src={mediaServePath!} />
              )}
            </div>
          )}

          {/* Visual Reference */}
          {post.visual_reference_url && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Visual Reference</p>
              <a href={post.visual_reference_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-[#1e82b4] hover:underline break-all">
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                {post.visual_reference_url}
              </a>
            </div>
          )}

          {/* Notes */}
          {post.notes && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
              <p className="text-[10px] text-amber-600 uppercase tracking-wider font-semibold mb-1">Notes</p>
              <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">{post.notes}</p>
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

          {/* Google Drive folder — designer asset hand-off */}
          {post.drive_url && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Drive folder · Export + PSD</p>
              <a
                href={post.drive_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#1e82b4] hover:underline break-all bg-blue-50 px-3 py-2 rounded-lg"
              >
                <Link2 className="w-3.5 h-3.5 shrink-0" />
                Open Drive folder
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
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
              onClick={downloadBrief}
              disabled={downloadingBrief}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-[#1e82b4] transition-colors disabled:opacity-50"
              title="Download a one-page brief PDF for this post"
            >
              {downloadingBrief ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download brief
            </button>
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
  year, month, posts, events, onCardClick, onDayClick,
}: {
  year: number;
  month: number;
  posts: ContentPost[];
  events: CalEvent[];
  onCardClick: (post: ContentPost) => void;
  onDayClick: (dateStr: string) => void;
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
            onClick={() => onDayClick(dateStr)}
            className={cn(
              "flex gap-5 px-1 py-3 transition-colors cursor-pointer hover:bg-gray-50/60 group/day",
              isWeekend && dayPosts.length === 0 && dayEvents.length === 0 ? "opacity-40 hover:opacity-100" : ""
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
                    <div key={post.id} onClick={e => e.stopPropagation()}>
                      <PostRow post={post} onClick={() => onCardClick(post)} />
                    </div>
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
        <PlatIcon className={cn("w-3.5 h-3.5", platformColor(post.platform))} />
        {(post.platform === "Both" || (post.cross_post && post.platform === "Facebook")) && (
          <Instagram className="w-3.5 h-3.5 text-[#E1306C]" title="Also posting to Instagram" />
        )}
      </div>

      {/* Title + format */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-gray-900">
            {post.title?.trim() || post.pillar}
          </p>
          {post.recurring && <RefreshCw className="w-3 h-3 text-violet-400 shrink-0" title="Repeats yearly" />}
          {post.caption?.trim() && (
            <AlignLeft className="w-3 h-3 text-[#1e82b4] shrink-0" title="Caption written" />
          )}
        </div>
        <p className="text-[11px] text-gray-400 truncate">
          {post.pillar} · {post.format}
          {post.scheduled_time && <span className="ml-1 text-[#1e82b4] font-medium">· {post.scheduled_time}</span>}
        </p>
      </div>

      {/* Assignee badge */}
      {post.assigned_to && (
        <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-500 shrink-0">
          {post.assigned_to}
        </span>
      )}

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
  resources: string;
  visual_reference_url: string;
  cross_post: boolean;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  attachment_type: "none" | "upload" | "link";
  link_url: string;
  drive_url: string;
  recurring: boolean;
  notes: string;
  assigned_to: string;
}

function NewPostModal({
  monthKey,
  editPost,
  allPosts,
  presetDate,
  onClose,
  onSaved,
}: {
  monthKey: string;
  editPost?: ContentPost;
  allPosts?: ContentPost[];
  presetDate?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [year, mon] = monthKey.split("-").map(Number);
  const today = new Date();
  const defaultDate = presetDate
    ?? (today.getFullYear() === year && today.getMonth() + 1 === mon
      ? today.toISOString().slice(0, 10)
      : `${monthKey}-01`);

  const { allPillars, englishPillars, italianPillars } = usePillars();

  const [form, setForm] = useState<NewPostForm>(() => {
    if (editPost) {
      return {
        market: editPost.market,
        // Normalise: Facebook + cross_post=true → treat as "Both"
        platform: editPost.platform === "Facebook" && editPost.cross_post ? "Both" : editPost.platform,
        pillar: editPost.pillar,
        format: editPost.format,
        title: editPost.title ?? "",
        caption: editPost.caption,
        visual_direction: editPost.visual_direction,
        resources: editPost.resources ?? "",
        visual_reference_url: editPost.visual_reference_url ?? "",
        cross_post: editPost.cross_post ?? false,
        scheduled_date: editPost.scheduled_date ?? defaultDate,
        scheduled_time: editPost.scheduled_time ?? "",
        status: editPost.status,
        attachment_type: editPost.link_url ? "link" : editPost.media_url ? "upload" : "none",
        link_url: editPost.link_url ?? "",
        drive_url: editPost.drive_url ?? "",
        recurring: editPost.recurring,
        notes: editPost.notes ?? "",
        assigned_to: editPost.assigned_to ?? "",
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
      resources: "",
      visual_reference_url: "",
      cross_post: false,
      scheduled_date: defaultDate,
      scheduled_time: "",
      status: "pending",
      attachment_type: "none",
      link_url: "",
      drive_url: "",
      recurring: false,
      notes: "",
      assigned_to: "",
    };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const { members: teamMembers, addMember } = useTeamMembers();
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [rewritingNote, setRewritingNote] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "done">(
    editPost?.media_url ? "done" : "idle"
  );
  const [uploadedPath, setUploadedPath] = useState<string | null>(editPost?.media_url ?? null);

  function set<K extends keyof NewPostForm>(key: K, val: NewPostForm[K]) {
    setForm(f => {
      const next = { ...f, [key]: val };
      // Italian market can only use Facebook
      if (key === "market" && val === "Italian Market" && (next.platform === "Instagram" || next.platform === "Both")) {
        next.platform = "Facebook";
        next.cross_post = false;
      }
      // Derive cross_post from platform — platform is the single source of truth
      if (key === "platform") {
        next.cross_post = val === "Both";
      }
      return next;
    });
  }

  async function generateCaption() {
    setGeneratingCaption(true);
    setError("");
    try {
      const platform = form.platform === "Both" || form.platform === "Instagram" ? "Instagram" : "Facebook";
      const market = form.market === "Italian Market" ? "Italian" : "English";
      const brief = [
        form.title ? `Post title / topic: ${form.title}` : "",
        form.pillar ? `Pillar: ${form.pillar}` : "",
        form.format ? `Format: ${form.format}` : "",
        form.tone_register ? `Tone: ${form.tone_register}` : "",
        form.visual_direction ? `Visual direction: ${form.visual_direction}` : "",
      ].filter(Boolean).join("\n");

      const res = await fetch(`${API}/api/content/quick-copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, market, brief, pillar: form.pillar || undefined, format: form.format || undefined, post_type: form.tone_register || undefined }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      const data = await res.json();
      set("caption", data.caption ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Caption generation failed");
    } finally {
      setGeneratingCaption(false);
    }
  }

  async function rewriteNote() {
    if (!form.notes.trim()) return;
    setRewritingNote(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/content/rewrite-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: form.notes,
          platform: form.platform,
          market: form.market,
          pillar: form.pillar || undefined,
          format: form.format || undefined,
          tone_register: form.tone_register || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed"); }
      const data = await res.json();
      set("notes", data.note ?? form.notes);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Rewrite failed");
    } finally {
      setRewritingNote(false);
    }
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
        resources: form.resources.trim() || null,
        visual_reference_url: form.visual_reference_url.trim() || null,
        media_url: form.attachment_type === "upload" ? (uploadedPath || null) : null,
        link_url: form.attachment_type === "link" ? (form.link_url.trim() || null) : null,
        drive_url: form.drive_url.trim() || null,
        cross_post: form.cross_post,
        recurring: form.recurring,
        notes: form.notes.trim() || null,
        assigned_to: form.assigned_to || null,
        // Use the selected date's month so the post appears in the correct calendar view
        month: form.scheduled_date ? form.scheduled_date.slice(0, 7) : monthKey,
        scheduled_date: form.scheduled_date || null,
        scheduled_time: form.scheduled_time || null,
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
                {isEnglish && <option value="Both">Both (FB + IG)</option>}
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className={labelCls}>Scheduled date</label>
            {(() => {
              const marketFilteredPosts = (allPosts ?? []).filter(
                p => p.market === form.market
              );
              return (
                <>
                  <MiniCalendar
                    monthKey={monthKey}
                    value={form.scheduled_date}
                    onChange={d => set("scheduled_date", d)}
                    posts={marketFilteredPosts}
                    excludeId={editPost?.id}
                  />
                  <p className="mt-1.5 text-[10px] text-gray-400 font-medium">
                    Showing {form.market === "Italian Market" ? "Italian" : "English"} posts only
                  </p>
                </>
              );
            })()}
            {form.scheduled_date && (() => {
              const sameDayPosts = (allPosts ?? []).filter(
                p => p.scheduled_date === form.scheduled_date && p.id !== editPost?.id && p.market === form.market
              );
              if (sameDayPosts.length === 0) return null;
              return (
                <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                  <p className="text-[11px] font-semibold text-amber-700 mb-1">
                    {sameDayPosts.length} post{sameDayPosts.length > 1 ? "s" : ""} already on this day
                  </p>
                  <ul className="space-y-0.5">
                    {sameDayPosts.map(p => (
                      <li key={p.id} className="flex items-center gap-1.5 text-[11px] text-amber-800">
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: PLATFORM_DOT_COLOR[p.platform] ?? "#F59E0B" }}
                        />
                        <span className="font-medium">{p.platform}</span>
                        <span className="text-amber-600">·</span>
                        <span className="truncate">{p.pillar}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>

          {/* Time */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={cn(labelCls, "mb-0")}>Posting time <span className="normal-case text-gray-400 font-normal">(optional · Malta local time)</span></label>
              {(() => {
                const fmt = form.format;
                const plat = form.platform;
                let best = "09:00";
                if (fmt === "Reel" || fmt === "Video") best = "18:00";
                else if (fmt === "Carousel") best = "13:00";
                else if (fmt === "Single Image") best = plat === "Facebook" ? "09:00" : "13:00";
                return (
                  <button
                    type="button"
                    onClick={() => set("scheduled_time", best)}
                    title={`Best time for ${fmt} on ${plat} per brand guidelines`}
                    className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg bg-[#1e82b4]/10 text-[#1e82b4] hover:bg-[#1e82b4]/20 transition-colors shrink-0"
                  >
                    <Zap className="w-3 h-3" />
                    Auto · {best}
                  </button>
                );
              })()}
            </div>
            <input
              type="time"
              value={form.scheduled_time}
              onChange={e => set("scheduled_time", e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Status + Assigned */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} className={inputCls}>
                <option value="pending">Draft</option>
                <option value="approved">Approved</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Assigned to</label>
              {addingPerson ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    className={inputCls + " flex-1"}
                    placeholder="Enter name…"
                    value={newPersonName}
                    onChange={e => setNewPersonName(e.target.value)}
                    onKeyDown={async e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (!newPersonName.trim()) return;
                        const m = await addMember(newPersonName.trim());
                        if (m) set("assigned_to", m.name);
                        setNewPersonName("");
                        setAddingPerson(false);
                      }
                      if (e.key === "Escape") { setAddingPerson(false); setNewPersonName(""); }
                    }}
                  />
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-[#1e82b4] text-white text-sm font-semibold hover:bg-[#1a6fa0]"
                    onClick={async () => {
                      if (!newPersonName.trim()) return;
                      const m = await addMember(newPersonName.trim());
                      if (m) set("assigned_to", m.name);
                      setNewPersonName("");
                      setAddingPerson(false);
                    }}
                  >Save</button>
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-sm hover:bg-gray-200"
                    onClick={() => { setAddingPerson(false); setNewPersonName(""); }}
                  >Cancel</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select value={form.assigned_to} onChange={e => set("assigned_to", e.target.value)} className={inputCls + " flex-1"}>
                    <option value="">— Unassigned —</option>
                    {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                  <button
                    type="button"
                    title="Add person"
                    className="shrink-0 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 text-lg leading-none"
                    onClick={() => setAddingPerson(true)}
                  >+</button>
                </div>
              )}
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
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                Caption <span className="font-normal normal-case text-gray-300">optional</span>
              </label>
              <button
                type="button"
                onClick={generateCaption}
                disabled={generatingCaption}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1e82b4] hover:text-[#1666a0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generatingCaption
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
                  : <><Sparkles className="w-3.5 h-3.5" /> Generate caption</>
                }
              </button>
            </div>
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

          {/* Resources — list of links */}
          <div>
            <label className={labelCls}>Resources <span className="font-normal normal-case text-gray-300">optional links</span></label>
            <div className="space-y-2">
              {(() => {
                const links = form.resources ? form.resources.split("\n") : [""];
                const updateLink = (idx: number, value: string) => {
                  const next = [...links];
                  next[idx] = value;
                  set("resources", next.join("\n"));
                };
                const removeLink = (idx: number) => {
                  const next = links.filter((_, i) => i !== idx);
                  set("resources", next.length ? next.join("\n") : "");
                };
                const addLink = () => set("resources", [...links, ""].join("\n"));
                return (
                  <>
                    {links.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="url"
                          value={link}
                          onChange={e => updateLink(idx, e.target.value)}
                          placeholder="https://drive.google.com/… or any reference link"
                          className={`${inputCls} flex-1`}
                        />
                        {links.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeLink(idx)}
                            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Remove link"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addLink}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#1e82b4] hover:text-[#1a6d99] transition-colors mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add link
                    </button>
                  </>
                );
              })()}
            </div>
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
                      <span className="text-sm font-medium">
                        {selectedFile?.name ?? (uploadedPath ? uploadedPath.split("/").pop() : "File attached")}
                      </span>
                      {selectedFile === null && uploadedPath && (
                        <button
                          type="button"
                          onClick={() => { setUploadedPath(null); setUploadProgress("idle"); set("attachment_type", "none"); }}
                          className="ml-2 text-xs text-red-400 hover:text-red-600 underline"
                        >Remove</button>
                      )}
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

            {/* Google Drive folder for designer hand-off (Export + PSD) */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                <Link2 className="w-3 h-3" />
                Google Drive folder
                <span className="font-normal normal-case text-gray-300">— upload Export + PSD here</span>
              </label>
              <input
                type="url"
                value={form.drive_url}
                onChange={e => set("drive_url", e.target.value)}
                placeholder="https://drive.google.com/drive/folders/…"
                className={inputCls}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                Notes <span className="font-normal normal-case text-gray-300">internal only</span>
              </label>
              <button
                type="button"
                onClick={rewriteNote}
                disabled={rewritingNote || !form.notes.trim()}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-[#1e82b4] hover:text-[#1666a0] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {rewritingNote
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Rewriting…</>
                  : <><Sparkles className="w-3.5 h-3.5" /> Rewrite clearer</>
                }
              </button>
            </div>
            <textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="Briefing notes, reminders, context for the team…"
              rows={3}
              className={`${inputCls} resize-none font-light leading-relaxed`}
            />
          </div>

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
  const [newPostPresetDate, setNewPostPresetDate] = useState<string | null>(null);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loadedEventsYear, setLoadedEventsYear] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [marketFilter, setMarketFilter] = useState<"all" | "en" | "it">("all");

  const monthKey = toMonthKey(year, month);

  const visiblePosts = posts.filter(p => {
    if (marketFilter === "all") return true;
    const isItalian = p.market.toLowerCase().includes("italian");
    return marketFilter === "it" ? isItalian : !isItalian;
  });

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

  async function exportPDF() {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const sorted = [...visiblePosts].sort((a, b) => {
      const da = a.scheduled_date ?? "9999-99-99";
      const db_ = b.scheduled_date ?? "9999-99-99";
      if (da !== db_) return da.localeCompare(db_);
      return (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? "");
    });

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    // Brand header
    const BLUE = [30, 130, 180] as [number, number, number];
    const AMBER = [246, 166, 16] as [number, number, number];

    doc.setFillColor(...BLUE);
    doc.rect(0, 0, 297, 18, "F");
    doc.setFillColor(...AMBER);
    doc.rect(0, 18, 297, 2, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("VIRTU FERRIES", 10, 11);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Content Calendar", 10, 16);

    const label = monthLabel(year, month);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    const lw = doc.getTextWidth(label);
    doc.text(label, 297 - 10 - lw, 13);

    // Status colour helper
    const statusFill = (status: string): [number, number, number] => {
      if (status === "approved") return [209, 250, 229];
      if (status === "rejected") return [254, 202, 202];
      return [254, 243, 199];
    };
    const statusText = (status: string): [number, number, number] => {
      if (status === "approved") return [6, 95, 70];
      if (status === "rejected") return [153, 27, 27];
      return [120, 80, 0];
    };

    const rows = sorted.map(p => {
      const dateStr = p.scheduled_date
        ? new Date(p.scheduled_date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
        : "—";
      return [
        dateStr,
        p.scheduled_time ?? "—",
        p.platform,
        p.market === "English Market" ? "EN" : "IT",
        p.pillar,
        p.format,
        p.title ?? "",
        p.caption,
        p.visual_direction,
        p.status,
      ];
    });

    autoTable(doc, {
      startY: 24,
      head: [["Date", "Time", "Platform", "Mkt", "Pillar", "Format", "Title", "Caption", "Visual Direction", "Status"]],
      body: rows,
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
        valign: "top",
        lineColor: [230, 230, 230],
        lineWidth: 0.2,
        textColor: [30, 30, 30],
      },
      headStyles: {
        fillColor: BLUE,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 7,
        cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      },
      alternateRowStyles: {
        fillColor: [247, 250, 252],
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 14 },
        2: { cellWidth: 20 },
        3: { cellWidth: 10 },
        4: { cellWidth: 24 },
        5: { cellWidth: 22 },
        6: { cellWidth: 30 },
        7: { cellWidth: 60, overflow: "linebreak" },
        8: { cellWidth: 50, overflow: "linebreak" },
        9: { cellWidth: 18 },
      },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 9) {
          const status = (rows[data.row.index]?.[9] as string) || "";
          if (!status) return;
          const fill = statusFill(status);
          const text = statusText(status);
          const { x, y, width, height } = data.cell;
          doc.setFillColor(...fill);
          doc.roundedRect(x + 1.5, y + 2, width - 3, height - 4, 2, 2, "F");
          doc.setTextColor(...text);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          const label = status.charAt(0).toUpperCase() + status.slice(1);
          const tw = doc.getTextWidth(label);
          doc.text(label, x + (width - tw) / 2, y + height / 2 + 2);
          doc.setTextColor(30, 30, 30);
          doc.setFont("helvetica", "normal");
        }
      },
      margin: { left: 10, right: 10 },
    });

    // Footer
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(
      `Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · Virtu Ferries Brand Hub`,
      10,
      pageH - 5
    );

    doc.save(`virtu-ferries-content-${monthKey}.pdf`);
  }

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
            <div className="flex items-center bg-gray-100 rounded-full p-0.5 text-[11px] font-semibold">
              {([
                { k: "all", label: "All" },
                { k: "en", label: "EN" },
                { k: "it", label: "IT" },
              ] as const).map(opt => {
                const active = marketFilter === opt.k;
                const color =
                  opt.k === "en" ? "bg-[#1e82b4] text-white" :
                  opt.k === "it" ? "bg-[#e01814] text-white" :
                  "bg-white text-gray-900 shadow-sm";
                return (
                  <button
                    key={opt.k}
                    onClick={() => setMarketFilter(opt.k)}
                    className={cn(
                      "px-3 py-1 rounded-full transition-colors",
                      active ? color : "text-gray-500 hover:text-gray-800"
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
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
            {posts.length > 0 && (
              <button
                onClick={exportPDF}
                className="text-xs font-semibold text-gray-400 hover:text-[#1e82b4] transition-colors flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-[#1e82b4]/5"
                title={`Export ${posts.length} posts for ${monthLabel(year, month)} as PDF`}
              >
                <Download className="w-3.5 h-3.5" />
                Export PDF
              </button>
            )}
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
              const platPosts = posts.filter(p =>
                p.platform.toLowerCase().includes(plat.toLowerCase()) ||
                p.platform === "Both" ||
                (plat === "Instagram" && p.cross_post && p.platform === "Facebook")
              );
              if (platPosts.length === 0) return null;
              const en = platPosts.filter(p => !p.market.toLowerCase().includes("italian")).length;
              const it = platPosts.filter(p => p.market.toLowerCase().includes("italian")).length;
              const Icon = plat === "Facebook" ? Facebook : Instagram;
              return (
                <div key={plat} className="flex items-center gap-2">
                  <Icon className={cn("w-3.5 h-3.5 shrink-0", plat === "Facebook" ? "text-[#1877F2]" : "text-[#E1306C]")} />
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
            posts={visiblePosts}
            events={events}
            onCardClick={setSelectedPost}
            onDayClick={(dateStr) => { setNewPostPresetDate(dateStr); setShowNewPost(true); }}
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
            allPosts={posts}
            onClose={() => setEditPost(null)}
            onSaved={() => { setEditPost(null); fetchPosts(monthKey); }}
          />
        )}
      </AnimatePresence>

      {/* New Post Modal */}
      <AnimatePresence>
        {showNewPost && (
          <NewPostModal
            monthKey={newPostPresetDate ? newPostPresetDate.slice(0, 7) : monthKey}
            allPosts={posts}
            presetDate={newPostPresetDate ?? undefined}
            onClose={() => { setShowNewPost(false); setNewPostPresetDate(null); }}
            onSaved={() => {
              setShowNewPost(false);
              setNewPostPresetDate(null);
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
