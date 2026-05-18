import { useState, useCallback, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, X, AlertTriangle,
  CheckCircle2, XCircle, Clock, Archive, Facebook,
  Instagram, Globe, Loader2, ExternalLink, Plus,
  Trash2, Link2, Upload, ImageIcon, Film, RefreshCw,
  FileUp, History, Check, Sparkles, Zap, Download, AlignLeft, Circle,
  Calendar, ChevronDown, Share2, Copy, Bold, FolderOpen, SkipForward,
  Layers, Users, Grid2x2, Video as VideoIcon, Search, Smile,
  MessageSquare, AlertCircle
} from "lucide-react";
import { usePillars } from "@/hooks/usePillars";
import { useTeamMembers } from "@/hooks/useTeamMembers";
import { useBrand } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PostStatus = "pending" | "approved" | "scheduled" | "rejected" | "archived" | "posted" | "skipped";
// "Awaiting Feedback" is kept in the union for backwards compatibility with
// any existing rows in the DB, but it is no longer offered in the dropdown —
// it gracefully falls back to the "To Do" visual via creativeStatusConfig.
type CreativeStatus = "To Do" | "Done" | "Approved" | "Awaiting Feedback";
const CREATIVE_STATUSES: CreativeStatus[] = ["To Do", "Done", "Approved"];

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
  graphic_text: string | null;
  resources: string | null;
  visual_reference_url: string | null;
  cta: string | null;
  media_url: string | null;
  media_urls?: string[] | null;
  link_url: string | null;
  drive_url?: string | null;
  posted_url: string | null;
  posted_url_ig: string | null;
  cross_post: boolean | null;
  recurring: boolean;
  notes: string | null;
  month: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: PostStatus;
  creative_status: CreativeStatus;
  assigned_to: string | null;
  entry_type?: string | null;
  approval: { decision: string; rejection_reason: string | null } | null;
  client_feedback?: Array<{
    id: number;
    decision: string | null;
    comment: string | null;
    client_name: string | null;
    created_at: string;
    share_token: string;
  }> | null;
}

function isProfileChange(p: Pick<ContentPost, "entry_type">): boolean {
  return p.entry_type === "profile_change";
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

// Upload size caps — mirrored on the server in
// artifacts/api-server/src/routes/storage.ts. Keep both in sync.
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
function validateUploadSize(file: File): string | null {
  const isVideo = file.type.startsWith("video/");
  const cap = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > cap) {
    const capMb = Math.round(cap / (1024 * 1024));
    return `File too large — ${isVideo ? "videos" : "images"} must be under ${capMb} MB.`;
  }
  return null;
}

function creativeStatusConfig(s: CreativeStatus) {
  switch (s) {
    case "Approved":
      return {
        label: "Approved",
        chip: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/25",
        dot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]",
        active: "bg-emerald-500 text-white shadow-sm",
      };
    case "Done":
      return {
        label: "Done",
        chip: "bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/25",
        dot: "bg-sky-400",
        active: "bg-sky-500 text-white shadow-sm",
      };
    case "Awaiting Feedback":
      // Legacy value — render as Done so existing rows still look sensible.
      return {
        label: "Done",
        chip: "bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/25",
        dot: "bg-sky-400",
        active: "bg-sky-500 text-white shadow-sm",
      };
    default:
      return {
        label: "To Do",
        chip: "bg-[#FFFFFF] text-[#71717A] ring-1 ring-[#E4E4E7]",
        dot: "bg-[#A1A1AA]",
        active: "bg-slate-700 text-white shadow-sm",
      };
  }
}

function statusConfig(status: PostStatus) {
  switch (status) {
    case "approved":
      return { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle2 };
    case "scheduled":
      return { label: "Scheduled", color: "bg-sky-100 text-sky-700", icon: Calendar };
    case "posted":
      return { label: "Posted", color: "bg-emerald-100 text-emerald-700", icon: Share2 };
    case "rejected":
      return { label: "Rejected", color: "bg-red-100 text-red-700", icon: XCircle };
    case "archived":
      return { label: "Archived", color: "bg-[#F4F4F5] text-[#71717A]", icon: Archive };
    case "skipped":
      return { label: "Skipped", color: "bg-slate-100 text-slate-600", icon: SkipForward };
    default:
      return { label: "Draft", color: "bg-amber-50 text-amber-700", icon: Clock };
  }
}

function marketBadge(market: string) {
  return market.toLowerCase().includes("italian")
    ? "bg-[#1e82b4]/15 text-[#5BB6E0] ring-1 ring-[#1e82b4]/25"
    : "bg-[#f6a610]/15 text-[#FBC764] ring-1 ring-[#f6a610]/25";
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
  return "text-[#A1A1AA]";
}

function platformIconList(platform: string, format: string): Array<{ Icon: typeof Facebook; color: string; key: string; title: string }> {
  const lc = (platform ?? "").toLowerCase();
  const fmtLc = (format ?? "").toLowerCase();
  const out: Array<{ Icon: typeof Facebook; color: string; key: string; title: string }> = [];
  if (lc === "both" || lc.includes("facebook")) {
    out.push({ Icon: Facebook, color: "text-[#1877F2]", key: "fb", title: "Facebook" });
  }
  if (lc === "both" || lc.includes("instagram")) {
    out.push({ Icon: Instagram, color: "text-[#E1306C]", key: "ig", title: "Instagram" });
  }
  if (lc.includes("story") || fmtLc.includes("story")) {
    out.push({ Icon: Circle, color: "text-[#A855F7]", key: "story", title: "Story" });
  }
  if (out.length === 0) {
    out.push({ Icon: Globe, color: "text-[#A1A1AA]", key: "globe", title: platform || "Platform" });
  }
  return out;
}


// ─── Flag-coloured Facebook icon ─────────────────────────────────────────────
// Outline Facebook glyph (lucide path) with the stroke painted by an SVG
// linear-gradient in the country's flag colours, so the toolbar EN/IT pills
// communicate "Maltese FB" / "Italian FB" via the icon itself rather than a
// flag background. Pure white stripes are nudged to #D4D4D8 so the middle of
// the Italian tricolour and the hoist of the Maltese flag stay visible on the
// white pill chrome.
function FlagFacebookIcon({ variant }: { variant: "mt" | "it" }) {
  const id = `fb-flag-${variant}`;
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          {variant === "mt" ? (
            <>
              <stop offset="0%" stopColor="#D4D4D8" />
              <stop offset="50%" stopColor="#D4D4D8" />
              <stop offset="50%" stopColor="#CF142B" />
              <stop offset="100%" stopColor="#CF142B" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#009246" />
              <stop offset="33.333%" stopColor="#009246" />
              <stop offset="33.333%" stopColor="#D4D4D8" />
              <stop offset="66.666%" stopColor="#D4D4D8" />
              <stop offset="66.666%" stopColor="#CD212A" />
              <stop offset="100%" stopColor="#CD212A" />
            </>
          )}
        </linearGradient>
      </defs>
      <path
        d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"
        stroke={`url(#${id})`}
      />
    </svg>
  );
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
          className="w-full max-h-64 object-contain rounded-xl border border-[#E4E4E7] bg-[#F5F5F5] transition group-hover:brightness-90 cursor-zoom-in"
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
  compact = false,
}: {
  monthKey: string;
  value: string;
  onChange: (d: string) => void;
  posts: ContentPost[];
  excludeId?: number;
  compact?: boolean;
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
    <div className={cn("rounded-xl border border-[#E4E4E7] bg-[#FFFFFF] select-none", compact ? "p-2" : "p-3")}>
      {/* Month navigation */}
      <div className={cn("flex items-center justify-between", compact ? "mb-1" : "mb-2")}>
        <button
          type="button"
          onClick={prevMon}
          className={cn("rounded-lg hover:bg-[#F4F4F5] text-[#A1A1AA] hover:text-[#27272A] transition-colors", compact ? "p-0.5" : "p-1")}
        >
          <ChevronLeft className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        </button>
        <span className={cn("font-semibold text-[#27272A]", compact ? "text-[10px]" : "text-[11px]")}>{monthName}</span>
        <button
          type="button"
          onClick={nextMon}
          className={cn("rounded-lg hover:bg-[#F4F4F5] text-[#A1A1AA] hover:text-[#27272A] transition-colors", compact ? "p-0.5" : "p-1")}
        >
          <ChevronRight className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        </button>
      </div>
      <div className={cn("grid grid-cols-7", compact ? "mb-0.5" : "mb-1")}>
        {WEEKDAYS.map(d => (
          <div key={d} className={cn("text-center font-semibold text-[#A1A1AA]", compact ? "text-[9px] py-0.5" : "text-[10px] py-1")}>{d}</div>
        ))}
      </div>
      <div className={cn("grid grid-cols-7", compact ? "gap-y-0.5" : "gap-y-1")}>
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
                  : "hover:bg-[#F4F4F5] text-[#71717A]"
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
                    style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.8)" : (PLATFORM_DOT_COLOR[p.platform] ?? "#A1A1AA") }}
                  />
                ))}
                {dayPosts.length > 3 && (
                  <span className={cn("text-[8px] leading-none mt-px", isSelected ? "text-white/80" : "text-[#A1A1AA]")}>
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

// Inline editable field — flips between display and input on click, saves on
// blur/Enter, shows tiny saving/saved indicator. Owns its own local state so
// the parent (CardDetailModal) doesn't have to track every field individually.
function Editable({
  label, value, kind = "text", placeholder, options, onSave, displayClassName, linkify = false, withBoldButton = false,
}: {
  label?: string;
  value: string | null;
  kind?: "text" | "url" | "textarea" | "date" | "time" | "select";
  placeholder?: string;
  options?: string[];
  onSave: (v: string | null) => Promise<void>;
  displayClassName?: string;
  // For textarea: auto-link http(s) tokens in display mode (matches the
  // pre-inline-edit behaviour for the Resources field).
  linkify?: boolean;
  // For textarea: show a "Bold selection" button next to the label that
  // applies Unicode bold to the current selection (survives FB/IG paste).
  withBoldButton?: boolean;
}) {
  const [local, setLocal] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Always-on blur saves can fire faster than the network can respond. A
  // monotonically-increasing token tags every commit so a late response from
  // an older request can't overwrite a newer value (last-response-wins race).
  const commitSeq = useRef(0);

  useEffect(() => { setLocal(value ?? ""); }, [value]);

  async function commit(nextRaw?: string) {
    const next = (nextRaw ?? local).trim() || null;
    if ((next ?? "") === (value ?? "")) return;
    const myToken = ++commitSeq.current;
    setSaving(true);
    setSaved(false);
    try {
      await onSave(next);
      // Drop stale responses — a later commit has already started/finished.
      if (myToken !== commitSeq.current) return;
      setSaved(true);
      setTimeout(() => {
        if (myToken === commitSeq.current) setSaved(false);
      }, 1200);
    } finally {
      if (myToken === commitSeq.current) setSaving(false);
    }
  }

  const indicator = saving
    ? <Loader2 className="w-3 h-3 animate-spin text-[#71717A]" />
    : saved ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : null;

  const labelEl = label && (
    <p className="text-[11px] text-[#71717A] mb-1 flex items-center gap-1">
      {label}
      {indicator}
    </p>
  );

  // Selects + date/time inputs are always "live" — no display / edit toggle,
  // just commit on change/blur. Native date+time pickers double as the affordance.
  if (kind === "select") {
    return (
      <div>
        {labelEl}
        <select
          value={local}
          onChange={async e => { setLocal(e.target.value); await commit(e.target.value); }}
          className="w-full text-sm font-semibold text-[#27272A] bg-[#FFFFFF] border border-[#E4E4E7] rounded-lg px-2.5 py-1.5 focus:border-[#1e82b4]/60 focus:outline-none focus:ring-1 focus:ring-[#1e82b4]/30"
        >
          <option value="">{placeholder ?? "—"}</option>
          {(options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
          {local && !(options ?? []).includes(local) && <option value={local}>{local}</option>}
        </select>
      </div>
    );
  }

  if (kind === "date" || kind === "time") {
    return (
      <div>
        {labelEl}
        <input
          type={kind}
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={() => commit()}
          onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          className="w-full text-sm font-semibold text-[#27272A] bg-[#FFFFFF] border border-[#E4E4E7] rounded-lg px-2.5 py-1.5 focus:border-[#1e82b4]/60 focus:outline-none focus:ring-1 focus:ring-[#1e82b4]/30 [color-scheme:light]"
        />
      </div>
    );
  }

  if (kind === "textarea") {
    const headerEl = (label || withBoldButton) && (
      <div className="flex items-center justify-between mb-1">
        {label ? (
          <p className="text-[11px] text-[#71717A] flex items-center gap-1">
            {label}
            {indicator}
          </p>
        ) : <span />}
        {withBoldButton && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => applyBoldToTextarea(textareaRef.current, local, setLocal)}
              className="text-[10px] font-bold text-[#71717A] hover:text-[#1e82b4] hover:bg-[#1e82b4]/10 transition-colors flex items-center gap-1 px-2 py-0.5 rounded-md"
              title="Select text in the caption, then click to make it bold (Unicode bold — survives Facebook & Instagram paste)"
            >
              <Bold className="w-3 h-3" />
              Bold selection
            </button>
            <EmojiPickerButton textareaRef={textareaRef} value={local} setValue={setLocal} />
          </div>
        )}
      </div>
    );

    return (
      <div>
        {withBoldButton ? headerEl : labelEl}
        <textarea
          ref={textareaRef}
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={() => commit()}
          onKeyDown={e => {
            if (e.key === "Escape") { setLocal(value ?? ""); (e.target as HTMLTextAreaElement).blur(); }
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); }
          }}
          placeholder={placeholder}
          rows={Math.max(3, Math.min(12, local.split("\n").length + 1))}
          className={cn(
            "w-full text-sm text-[#27272A] leading-relaxed bg-[#FFFFFF] rounded-xl p-3 border border-[#E4E4E7] hover:border-[#A1A1AA] focus:border-[#1e82b4]/60 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/30 resize-y placeholder:text-[#A1A1AA] transition-colors",
            displayClassName,
          )}
        />
        {linkify && local.trim() && /https?:\/\/\S+/.test(local) && (
          <p className="mt-1.5 text-[11px] text-[#A1A1AA] leading-relaxed break-all">
            {local.split(/(\s+)/).map((tok, i) => /^https?:\/\/\S+$/.test(tok)
              ? <a key={i} href={tok} target="_blank" rel="noopener noreferrer" className="text-[#1e82b4] hover:underline">{tok}</a>
              : <span key={i}>{tok}</span>)}
          </p>
        )}
      </div>
    );
  }

  // text / url — single line. URL fields get a trailing "open in new tab"
  // affordance so the link stays one-click reachable while the input itself
  // is always live for editing.
  const htmlType = kind === "url" ? "url" : "text";
  return (
    <div>
      {labelEl}
      <div className="flex items-center gap-1.5">
        <input
          type={htmlType}
          value={local}
          onChange={e => setLocal(e.target.value)}
          onBlur={() => commit()}
          onKeyDown={e => {
            if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLInputElement).blur(); }
            if (e.key === "Escape") { setLocal(value ?? ""); (e.target as HTMLInputElement).blur(); }
          }}
          placeholder={placeholder}
          className="flex-1 min-w-0 text-sm text-[#27272A] bg-[#FFFFFF] border border-[#E4E4E7] hover:border-[#A1A1AA] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#1e82b4]/60 focus:ring-2 focus:ring-[#1e82b4]/30 placeholder:text-[#A1A1AA] transition-colors"
        />
        {kind === "url" && local.trim() && /^https?:\/\//i.test(local.trim()) && (
          <a
            href={local.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 p-1.5 rounded-lg text-[#1e82b4] hover:bg-[#1e82b4]/10 transition-colors"
            title="Open in new tab"
            onClick={e => e.stopPropagation()}
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

// Compact pill-shaped select — looks like a coloured status pill but the
// whole thing is clickable and opens the native dropdown. Used for Status +
// Creative side-by-side in the detail modal so they don't take 2 full rows.
function PillSelect<T extends string>({
  label, value, options, saving, onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ v: T; label: string; cls: string; dot: string }>;
  saving: boolean;
  onChange: (v: T) => void;
}) {
  const current = options.find(o => o.v === value) ?? options[0];
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-[11px] text-[#71717A] shrink-0">{label}</span>
      <span className={cn("relative inline-flex items-center gap-1.5 pl-2.5 pr-6 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap", current.cls)}>
        <span className={cn("w-1.5 h-1.5 rounded-full", current.dot)} />
        {current.label}
        <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 opacity-70 pointer-events-none" />
        <select
          aria-label={label}
          value={value}
          disabled={saving}
          onChange={e => onChange(e.target.value as T)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
        >
          {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
      </span>
      {saving && <Loader2 className="w-3 h-3 animate-spin text-[#71717A]" />}
    </div>
  );
}

function CardDetailModal({ post, onClose, onDeleted, onDuplicated }: { post: ContentPost; onClose: () => void; onDeleted: () => void; onDuplicated?: () => void }) {
  const { activeBrand } = useBrand();
  const isVirtu = activeBrand?.slug === "virtu-ferries";
  const PlatIcon = platformIcon(post.platform);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Inline media upload — mirrors the New Post modal's flow so users don't
  // have to open the full edit modal just to attach a photo/video to an
  // existing post. Hits the same /api/storage/uploads/request-url endpoint
  // and patches `media_url` on success.
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  // Local copy of the full attachment list so the UI updates instantly when
  // the user adds or removes a photo without waiting for the next list
  // refetch. Seeded from the prop, with the legacy single-`media_url` field
  // promoted into the array when no `media_urls` is present yet.
  const initialMediaList: string[] = (post.media_urls && post.media_urls.length > 0)
    ? [...post.media_urls]
    : (post.media_url ? [post.media_url] : []);
  const [mediaList, setMediaList] = useState<string[]>(initialMediaList);
  // Refresh client feedback every time the modal opens so reviewers' input
  // submitted via /share/:token between fetches shows up immediately, even
  // if the calendar's month list hasn't been refetched.
  type ClientFeedbackEntry = NonNullable<ContentPost["client_feedback"]>[number];
  const [liveFeedback, setLiveFeedback] = useState<ClientFeedbackEntry[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const mk = post.month;
    if (!mk) return;
    fetch(`${API}/api/content/posts?month=${encodeURIComponent(mk)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return;
        const match = rows.find((r: ContentPost) => r.id === post.id);
        const fresh = match?.client_feedback ?? [];
        setLiveFeedback(fresh);
        post.client_feedback = fresh;
      })
      .catch(() => { /* ignore — fall back to whatever the calendar list had */ });
    return () => { cancelled = true; };
  }, [post.id, post.month]);
  async function uploadMedia(file: File): Promise<void> {
    // Guard against overlapping uploads — sequential is fine, but parallel
    // PATCHes could race and lose entries from the list.
    if (mediaUploading) return;
    const sizeError = validateUploadSize(file);
    if (sizeError) {
      setMediaUploadError(sizeError);
      if (mediaInputRef.current) mediaInputRef.current.value = "";
      return;
    }
    setMediaUploadError(null);
    setMediaUploading(true);
    try {
      const urlResp = await fetch(`${API}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlResp.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlResp.json();
      const putResp = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!putResp.ok) throw new Error("Upload failed");
      const next = [...mediaList, objectPath];
      await patchPost({ media_urls: next });
      setMediaList(next);
    } catch {
      setMediaUploadError("Upload failed — please try again.");
    } finally {
      setMediaUploading(false);
      if (mediaInputRef.current) mediaInputRef.current.value = "";
    }
  }
  async function removeMediaAt(idx: number): Promise<void> {
    if (mediaUploading) return;
    setMediaUploadError(null);
    setMediaUploading(true);
    try {
      const next = mediaList.filter((_, i) => i !== idx);
      await patchPost({ media_urls: next });
      setMediaList(next);
    } catch {
      setMediaUploadError("Could not remove media — please try again.");
    } finally {
      setMediaUploading(false);
    }
  }
  const [localTitle, setLocalTitle] = useState(post.title ?? "");
  const [savingTitle, setSavingTitle] = useState(false);
  const [creative, setCreative] = useState<CreativeStatus>((post.creative_status ?? "To Do") as CreativeStatus);
  const [savingCreative, setSavingCreative] = useState(false);
  const [status, setStatus] = useState<PostStatus>(post.status);
  const [savingStatus, setSavingStatus] = useState(false);
  const [postedUrl, setPostedUrl] = useState(post.posted_url ?? "");
  const [savingPostedUrl, setSavingPostedUrl] = useState(false);
  const [postedUrlSaved, setPostedUrlSaved] = useState(false);
  const [postedUrlIg, setPostedUrlIg] = useState(post.posted_url_ig ?? "");
  const [savingPostedUrlIg, setSavingPostedUrlIg] = useState(false);
  const [postedUrlIgSaved, setPostedUrlIgSaved] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const { englishPillars, italianPillars } = usePillars();
  const pillarOptions = post.market === "Italian Market" ? italianPillars : englishPillars;
  const { members: rawTeamMembers } = useTeamMembers();
  // Nico Bazan is a hub-level assignee (his queue lives on /nico, outside any
  // single brand) — always offer him in the dropdown regardless of which
  // brand's team_members table contains.
  const teamMembers = rawTeamMembers.some(m => m.name === "Nico Bazan")
    ? rawTeamMembers
    : [{ id: -1, name: "Nico Bazan", role: "Videographer" }, ...rawTeamMembers];
  const assigneeOptions = teamMembers.map(m => m.name);

  const isDualPost = post.platform === "Both" || (post.platform === "Facebook" && !!post.cross_post);
  const isIgOnly = post.platform === "Instagram";

  // Lock the underlying page scroll while the modal is open. Without this,
  // touch scrolling on mobile bubbles to the body and the page underneath
  // visibly shifts/jitters as the user drags inside the modal.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  // Generic patch helper — also mutates `post` so the rest of the modal
  // (e.g. brief generator, conditional UI) sees the new value immediately.
  async function patchPost(patch: Record<string, unknown>): Promise<void> {
    const resp = await fetch(`${API}/api/content/posts/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!resp.ok) throw new Error("save failed");
    Object.assign(post, patch);
    // When a media_urls patch goes through, keep the legacy media_url field
    // in lockstep with the first entry so any reader that still keys off
    // post.media_url (duplicate payload, brief PDF, etc.) sees the same
    // primary asset the server just wrote — matches the server-side mirror
    // in PATCH /content/posts/:id.
    if (Object.prototype.hasOwnProperty.call(patch, "media_urls")) {
      const arr = Array.isArray(patch["media_urls"]) ? (patch["media_urls"] as unknown[]) : [];
      const first = arr.find((v): v is string => typeof v === "string" && v.length > 0) ?? null;
      post.media_url = first;
    }
  }

  async function setPostStatus(next: PostStatus) {
    if (next === status) return;
    const prev = status;
    setStatus(next);
    setSavingStatus(true);
    try {
      const resp = await fetch(`${API}/api/content/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!resp.ok) throw new Error("save failed");
      post.status = next;
    } catch {
      setStatus(prev);
    } finally {
      setSavingStatus(false);
    }
  }

  async function savePostedUrl() {
    const trimmed = postedUrl.trim();
    if ((trimmed || null) === (post.posted_url ?? null)) return;
    setSavingPostedUrl(true);
    setPostedUrlSaved(false);
    try {
      const resp = await fetch(`${API}/api/content/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posted_url: trimmed || null }),
      });
      if (!resp.ok) throw new Error("save failed");
      post.posted_url = trimmed || null;
      setPostedUrlSaved(true);
      setTimeout(() => setPostedUrlSaved(false), 1500);
    } finally {
      setSavingPostedUrl(false);
    }
  }

  async function savePostedUrlIg() {
    const trimmed = postedUrlIg.trim();
    if ((trimmed || null) === (post.posted_url_ig ?? null)) return;
    setSavingPostedUrlIg(true);
    setPostedUrlIgSaved(false);
    try {
      const resp = await fetch(`${API}/api/content/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posted_url_ig: trimmed || null }),
      });
      if (!resp.ok) throw new Error("save failed");
      post.posted_url_ig = trimmed || null;
      setPostedUrlIgSaved(true);
      setTimeout(() => setPostedUrlIgSaved(false), 1500);
    } finally {
      setSavingPostedUrlIg(false);
    }
  }

  async function setCreativeStatus(next: CreativeStatus) {
    if (next === creative) return;
    const prev = creative;
    setCreative(next);
    setSavingCreative(true);
    try {
      const resp = await fetch(`${API}/api/content/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creative_status: next }),
      });
      if (!resp.ok) throw new Error("save failed");
      post.creative_status = next;
    } catch {
      setCreative(prev);
    } finally {
      setSavingCreative(false);
    }
  }

  async function saveTitle() {
    // Re-entry guard — blur + Enter can both fire `saveTitle` in quick
    // succession; without this an in-flight failure could clobber a later
    // success.
    if (savingTitle) return;
    const trimmed = localTitle.trim();
    const nextTitle = trimmed || null;
    // No change → no network round-trip.
    if (nextTitle === (post.title ?? null)) return;
    setSavingTitle(true);
    try {
      const resp = await fetch(`${API}/api/content/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: nextTitle }),
      });
      if (!resp.ok) throw new Error("save failed");
      // Mutate the local `post` so the displayed title stays in sync if the
      // parent later re-renders without a refetch.
      post.title = nextTitle;
    } catch {
      // Restore the previous title and surface the failure inline.
      setLocalTitle(post.title ?? "");
    } finally {
      setSavingTitle(false);
    }
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

  const [duplicating, setDuplicating] = useState(false);
  const [duplicateMenuOpen, setDuplicateMenuOpen] = useState(false);
  async function handleDuplicate(target?: { market: string; platform: string }) {
    setDuplicating(true);
    try {
      const market = target?.market ?? post.market;
      // Default platform = whatever the picker chose; fallback to source.
      // Italian Market is Facebook-only, so any IG/Both/Story selection is
      // coerced to Facebook (mirrors the new-post form rule).
      let platform = target?.platform ?? post.platform;
      if (market === "Italian Market" && (platform === "Instagram" || platform === "Both" || platform === "Story")) {
        platform = "Facebook";
      }
      // cross_post is fully derived from platform — "Both" means FB+IG cross-post.
      const cross_post = platform === "Both";
      // Pillars differ per market, but the DB column is NOT NULL so we keep
      // the source pillar on cross-market copies. The user re-picks the
      // correct pillar from the modal after the duplicate is created.
      const pillar = post.pillar;
      const payload = {
        entry_type: post.entry_type ?? "post",
        market,
        platform,
        pillar,
        tone_register: post.tone_register,
        format: post.format,
        title: post.title ? `${post.title} (copy)` : null,
        caption: post.caption,
        visual_direction: post.visual_direction,
        graphic_text: post.graphic_text ?? undefined,
        resources: post.resources,
        visual_reference_url: post.visual_reference_url,
        cta: post.cta,
        media_url: post.media_url,
        link_url: post.link_url,
        drive_url: post.drive_url ?? null,
        cross_post,
        recurring: post.recurring,
        notes: post.notes,
        assigned_to: post.assigned_to,
        month: post.month,
        scheduled_date: post.scheduled_date,
        scheduled_time: post.scheduled_time,
        // Always reset workflow fields on a copy — the duplicate is a fresh draft.
        // Status must match the PostStatus union ("pending" = the "Draft" UI label).
        status: "pending" as PostStatus,
        creative_status: "To Do" as CreativeStatus,
        posted_url: null,
        posted_url_ig: null,
      };
      const resp = await fetch(`${API}/api/content/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([payload]),
      });
      if (!resp.ok) throw new Error("duplicate failed");
      onDuplicated?.();
      onClose();
    } finally {
      setDuplicating(false);
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
        post.market === "Maltese Market" ? "EN" : "IT",
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
      if (isVirtu && post.notes) section("Notes", post.notes);
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

  // Helpers for the per-attachment renderer below. `mediaList` is the local
  // source of truth (kept in sync with the server through uploadMedia /
  // removeMediaAt), so we no longer key any of this off post.media_url.
  const mediaServe = (raw: string): string =>
    raw.startsWith("/objects/") ? `${API}/api/storage${raw}` : raw;
  const isVideoUrl = (raw: string): boolean => /\.(mp4|mov|webm|avi)(\?|$)/i.test(raw);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="bg-[#FFFFFF] rounded-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)] ring-1 ring-[#E4E4E7] w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6 border-b border-[#E4E4E7] space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs font-bold px-2 py-1 rounded-full", marketBadge(post.market))}>
                {marketShort(post.market)}
              </span>
              <span className="flex items-center gap-1 text-xs text-[#71717A] bg-[#FFFFFF] ring-1 ring-[#E4E4E7] px-2 py-1 rounded-full">
                <PlatIcon className={cn("w-3 h-3", platformColor(post.platform))} />
                {post.platform}
              </span>
            </div>
            <button onClick={onClose} className="text-[#71717A] hover:text-[#27272A] p-1 rounded-lg hover:bg-[#F4F4F5] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status + Creative — compact pill dropdowns, side by side. */}
          <div className="flex items-center gap-4 flex-wrap">
            <PillSelect
              label="Status"
              value={status}
              saving={savingStatus}
              onChange={setPostStatus}
              options={[
                { v: "pending" as PostStatus, label: "Draft", cls: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/25", dot: "bg-amber-400" },
                { v: "approved" as PostStatus, label: "Approved", cls: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/25", dot: "bg-emerald-400" },
                { v: "scheduled" as PostStatus, label: "Scheduled", cls: "bg-sky-500/10 text-sky-700 ring-1 ring-sky-500/25", dot: "bg-sky-400" },
                { v: "posted" as PostStatus, label: "Posted", cls: "bg-emerald-500 text-white", dot: "bg-white/80" },
                { v: "skipped" as PostStatus, label: "Skipped", cls: "bg-[#FFFFFF] text-[#71717A] ring-1 ring-[#E4E4E7]", dot: "bg-[#A1A1AA]" },
              ]}
            />
            <PillSelect
              label="Creative"
              value={creative}
              saving={savingCreative}
              onChange={setCreativeStatus}
              options={CREATIVE_STATUSES.map(opt => {
                const conf = creativeStatusConfig(opt);
                return { v: opt, label: conf.label, cls: conf.active, dot: "bg-white/90" };
              })}
            />
          </div>

          {/* Live post URL(s) — paste the public link to the actual published post.
              Dual posts (Both, or FB+cross_post) get one input per platform. */}
          {(status === "posted" || postedUrl || postedUrlIg) && (() => {
            const renderRow = (args: {
              label: string;
              Icon: typeof Facebook;
              iconColor: string;
              value: string;
              onChange: (v: string) => void;
              onBlur: () => void;
              saving: boolean;
              saved: boolean;
              placeholder: string;
            }) => (
              <div className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[11px] text-[#71717A] flex items-center gap-1">
                  <args.Icon className={cn("w-3 h-3", args.iconColor)} />
                  {args.label}
                </span>
                <div className="flex-1 flex items-center gap-1.5">
                  <input
                    type="url"
                    value={args.value}
                    onChange={e => args.onChange(e.target.value)}
                    onBlur={args.onBlur}
                    onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    placeholder={args.placeholder}
                    className="flex-1 min-w-0 text-[12px] px-2.5 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-[#27272A] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40"
                  />
                  {args.saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400 shrink-0" />}
                  {args.saved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  {args.value.trim() && !args.saving && (
                    <a
                      href={args.value.trim()}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 p-1.5 rounded-lg text-emerald-400 hover:text-emerald-700 hover:bg-emerald-500/10 transition-colors"
                      title="Open live post in a new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            );

            if (isDualPost) {
              return (
                <div className="space-y-1.5">
                  {renderRow({
                    label: "Facebook",
                    Icon: Facebook,
                    iconColor: "text-[#1877F2]",
                    value: postedUrl,
                    onChange: setPostedUrl,
                    onBlur: savePostedUrl,
                    saving: savingPostedUrl,
                    saved: postedUrlSaved,
                    placeholder: "https://facebook.com/…",
                  })}
                  {renderRow({
                    label: "Instagram",
                    Icon: Instagram,
                    iconColor: "text-[#E1306C]",
                    value: postedUrlIg,
                    onChange: setPostedUrlIg,
                    onBlur: savePostedUrlIg,
                    saving: savingPostedUrlIg,
                    saved: postedUrlIgSaved,
                    placeholder: "https://instagram.com/p/…",
                  })}
                </div>
              );
            }

            // Single platform — use posted_url_ig for Instagram-only posts so
            // the column semantics stay clean, posted_url for everything else.
            if (isIgOnly) {
              return renderRow({
                label: "Instagram",
                Icon: Instagram,
                iconColor: "text-[#E1306C]",
                value: postedUrlIg,
                onChange: setPostedUrlIg,
                onBlur: savePostedUrlIg,
                saving: savingPostedUrlIg,
                saved: postedUrlIgSaved,
                placeholder: "https://instagram.com/p/…",
              });
            }

            return renderRow({
              label: post.platform || "Live",
              Icon: post.platform === "Facebook" ? Facebook : ExternalLink,
              iconColor: post.platform === "Facebook" ? "text-[#1877F2]" : "text-emerald-600",
              value: postedUrl,
              onChange: setPostedUrl,
              onBlur: savePostedUrl,
              saving: savingPostedUrl,
              saved: postedUrlSaved,
              placeholder: "Paste live post URL…",
            });
          })()}

        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {/* Always-on title input — type to edit, blur or Enter to save. */}
          <div className="flex items-center gap-2">
            <input
              ref={titleInputRef}
              value={localTitle}
              onChange={e => setLocalTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") { setLocalTitle(post.title ?? ""); (e.target as HTMLInputElement).blur(); }
              }}
              onBlur={saveTitle}
              placeholder="Add a content title…"
              className="flex-1 text-lg font-bold text-[#18181B] bg-transparent border-b-2 border-transparent hover:border-[#E4E4E7] focus:border-[#1e82b4]/60 focus:outline-none pb-0.5 placeholder:text-[#A1A1AA] placeholder:font-normal placeholder:italic placeholder:text-sm transition-colors"
            />
            {savingTitle && <Loader2 className="w-4 h-4 animate-spin text-[#71717A] shrink-0" />}
          </div>

          {/* Meta row — platform / pillar / format / date / time / assignee.
              Single line on tablet+, 2-col on phones so controls stay tappable. */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
            {(() => {
              // Virtu's platform model: Facebook + Instagram on Maltese
              // Market, Facebook only on Italian Market, plus a "Both" option
              // that mirrors the post on FB and IG via cross_post=true. Inline
              // selector keeps the model in sync (cross_post=true iff Both).
              const isItalian = post.market.toLowerCase().includes("italian");
              // For Virtu, normalise Facebook+cross_post=true into the visual
              // "Both" choice so the dropdown mirrors the EditPostModal.
              const displayValue = isVirtu
                ? (post.platform === "Facebook" && post.cross_post ? "Both" : post.platform)
                : post.platform;
              const platformOptions = isVirtu
                ? (isItalian ? ["Facebook"] : ["Facebook", "Instagram", "Both"])
                : ["Facebook", "Instagram", "Story"];
              return (
                <Editable
                  label="Platform"
                  value={displayValue}
                  kind="select"
                  options={platformOptions}
                  placeholder="Platform"
                  onSave={async v => {
                    const next = v ?? "";
                    if (isVirtu) {
                      // "Both" maps to platform=Both + cross_post=true.
                      // Anything else clears cross_post so the model stays
                      // consistent with EditPostModal.
                      await patchPost({ platform: next, cross_post: next === "Both" });
                    } else {
                      await patchPost({ platform: next });
                    }
                  }}
                />
              );
            })()}
            <Editable
              label="Pillar"
              value={post.pillar}
              kind="select"
              options={pillarOptions}
              placeholder="Pillar"
              onSave={v => patchPost({ pillar: v ?? "" })}
            />
            <Editable
              label="Format"
              value={post.format}
              kind="select"
              options={formatsForPlatform(post.platform)}
              placeholder="Format"
              onSave={v => patchPost({ format: v ?? "" })}
            />
            <Editable
              label="Date"
              value={post.scheduled_date}
              kind="date"
              onSave={v => patchPost({
                scheduled_date: v,
                // Keep month in sync — calendar list query is filtered by `month`,
                // and a stale month would make the post disappear from its new view.
                month: v ? v.slice(0, 7) : post.month,
              })}
            />
            <Editable
              label="Time"
              value={post.scheduled_time}
              kind="time"
              onSave={v => patchPost({ scheduled_time: v })}
            />
            <Editable
              label="Assigned to"
              value={post.assigned_to}
              kind="select"
              options={assigneeOptions}
              placeholder="Assignee"
              onSave={v => patchPost({ assigned_to: v })}
            />
          </div>

          <Editable
            label="Caption"
            value={post.caption}
            kind="textarea"
            placeholder="Write the caption…"
            onSave={v => patchPost({ caption: v ?? "" })}
            withBoldButton
          />

          <Editable
            label="Visual Direction"
            value={post.visual_direction}
            kind="textarea"
            placeholder="Describe the visual direction…"
            onSave={v => patchPost({ visual_direction: v ?? "" })}
          />

          <Editable
            label="Graphic Text"
            value={post.graphic_text ?? null}
            kind="textarea"
            placeholder="On-image / on-graphic copy (headline, overlay text, CTAs)…"
            onSave={v => patchPost({ graphic_text: v })}
          />

          {/* Media — preview + inline upload / add-another / remove controls.
              Renders a dropzone when no media is attached, or a vertical
              stack of previews (each with its own Remove) plus an "Add
              another" button when one or more are. Uses the shared
              object-storage upload flow (request-url → PUT → PATCH media_urls). */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-[#71717A]">
                Media {mediaList.length > 1 ? `· ${mediaList.length} files` : ""}
              </p>
              {mediaList.length > 0 && !mediaUploading && (
                <button
                  type="button"
                  onClick={() => mediaInputRef.current?.click()}
                  className={cn(
                    "text-[11px] font-semibold flex items-center gap-1",
                    isVirtu ? "text-[#1e82b4] hover:text-[#1666a0]" : "text-[#1d3289] hover:text-[#152360]",
                  )}
                  data-testid="button-add-another-media"
                >
                  <Plus className="w-3 h-3" /> Add another
                </button>
              )}
            </div>
            <input
              ref={mediaInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadMedia(f); }}
            />
            {mediaList.length > 0 ? (
              <div className="space-y-3">
                {mediaList.map((raw, idx) => {
                  const serve = mediaServe(raw);
                  return (
                    <div key={`${raw}-${idx}`} className="relative group">
                      {isVideoUrl(raw) ? (
                        <video src={serve} controls className="w-full max-h-64 rounded-xl border border-[#E4E4E7] bg-black" />
                      ) : (
                        <MediaImage src={serve} />
                      )}
                      <button
                        type="button"
                        onClick={() => removeMediaAt(idx)}
                        disabled={mediaUploading}
                        className="absolute top-2 right-2 inline-flex items-center gap-1 text-[11px] font-semibold bg-white/95 text-red-600 hover:bg-white hover:text-red-700 px-2 py-1 rounded-lg shadow-sm border border-[#E4E4E7] opacity-90"
                        data-testid={`button-remove-media-${idx}`}
                      >
                        <Trash2 className="w-3 h-3" />
                        Remove
                      </button>
                      {mediaList.length > 1 && (
                        <span className="absolute top-2 left-2 inline-flex items-center text-[10px] font-bold text-white bg-black/55 px-2 py-1 rounded-lg">
                          {idx + 1} / {mediaList.length}
                        </span>
                      )}
                    </div>
                  );
                })}
                {mediaUploading && (
                  <div className={cn("flex items-center gap-2 text-sm font-medium", isVirtu ? "text-[#1e82b4]" : "text-[#1d3289]")}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading…
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                disabled={mediaUploading}
                className={cn(
                  "w-full flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed transition-colors",
                  mediaUploading
                    ? isVirtu
                      ? "border-[#1e82b4]/40 bg-[#1e82b4]/5 cursor-wait"
                      : "border-[#1d3289]/40 bg-[#1d3289]/5 cursor-wait"
                    : isVirtu
                      ? "border-[#E4E4E7] bg-[#FAFAFA] hover:border-[#1e82b4]/40 hover:bg-[#1e82b4]/5 cursor-pointer"
                      : "border-[#E4E4E7] bg-[#FAFAFA] hover:border-[#1d3289]/40 hover:bg-[#1d3289]/5 cursor-pointer",
                )}
              >
                {mediaUploading ? (
                  <div className={cn("flex items-center gap-2", isVirtu ? "text-[#1e82b4]" : "text-[#1d3289]")}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Uploading…</span>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2 text-[#A1A1AA]">
                      <ImageIcon className="w-5 h-5" />
                      <Film className="w-5 h-5" />
                    </div>
                    <p className="text-sm text-[#71717A]">Click to upload an image or video</p>
                    <p className="text-xs text-[#A1A1AA]">JPG, PNG, GIF, MP4, MOV, WebM</p>
                  </>
                )}
              </button>
            )}
            {mediaUploadError && (
              <p className="text-xs text-red-500 mt-2">{mediaUploadError}</p>
            )}
          </div>

          {/* Visual Reference */}
          <Editable
            label="Visual Reference"
            value={post.visual_reference_url}
            kind="url"
            placeholder="https://… link to reference image"
            onSave={v => patchPost({ visual_reference_url: v })}
          />

          {/* Live posted URL — link to the actual published post on FB / IG */}
          {post.posted_url && (
            <div>
              <p className="text-[11px] text-emerald-600 font-medium mb-1">Live post</p>
              <a
                href={post.posted_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 hover:text-emerald-200 hover:underline break-all bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                View live post
              </a>
            </div>
          )}

          {/* Link */}
          <Editable
            label="Link"
            value={post.link_url}
            kind="url"
            placeholder="https://… landing page or campaign link"
            onSave={v => patchPost({ link_url: v })}
          />

          {/* Google Drive folder — designer asset hand-off */}
          <Editable
            label="Drive folder · Export + PSD"
            value={post.drive_url ?? null}
            kind="url"
            placeholder="https://drive.google.com/…"
            onSave={v => patchPost({ drive_url: v })}
          />

          {post.approval && (
            <div className={cn("rounded-xl p-4 border", post.approval.decision === "approved" ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20")}>
              <p className={cn("text-xs font-semibold mb-1 capitalize", post.approval.decision === "approved" ? "text-emerald-700" : "text-red-700")}>{post.approval.decision}</p>
              {post.approval.rejection_reason && (
                <p className="text-sm text-[#71717A]">{post.approval.rejection_reason}</p>
              )}
            </div>
          )}

          {/* Client feedback — every approval / changes-requested / comment
              submitted on the share links that include this post. Ordered
              oldest-first so the team reads them like a chat thread. */}
          {(() => {
            const feedback = liveFeedback ?? post.client_feedback ?? [];
            if (feedback.length === 0) return null;
            const counts = feedback.reduce(
              (acc, f) => {
                if (f.decision === "approved") acc.approved += 1;
                else if (f.decision === "changes_requested") acc.changes += 1;
                else acc.comments += 1;
                return acc;
              },
              { approved: 0, changes: 0, comments: 0 },
            );
            return (
              <div className="rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] p-4 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A]">Client feedback</p>
                  {counts.approved > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-500/10 ring-1 ring-emerald-500/20 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" />
                      {counts.approved} approved
                    </span>
                  )}
                  {counts.changes > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-500/10 ring-1 ring-amber-500/20 px-2 py-0.5 rounded-full">
                      <AlertCircle className="w-3 h-3" />
                      {counts.changes} changes
                    </span>
                  )}
                  {counts.comments > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#52525B] bg-white ring-1 ring-[#E4E4E7] px-2 py-0.5 rounded-full">
                      <MessageSquare className="w-3 h-3" />
                      {counts.comments} comment{counts.comments === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {feedback.map((f) => {
                    const isApproved = f.decision === "approved";
                    const isChanges = f.decision === "changes_requested";
                    const when = new Date(f.created_at);
                    const whenLabel = Number.isNaN(when.getTime())
                      ? ""
                      : when.toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                    return (
                      <div
                        key={f.id}
                        className={cn(
                          "rounded-lg px-3 py-2 border text-sm bg-white",
                          isApproved && "border-emerald-200",
                          isChanges && "border-amber-200",
                          !isApproved && !isChanges && "border-[#E4E4E7]",
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                              <Check className="w-3 h-3" /> Approved
                            </span>
                          )}
                          {isChanges && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                              <AlertCircle className="w-3 h-3" /> Changes requested
                            </span>
                          )}
                          {!isApproved && !isChanges && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#52525B]">
                              <MessageSquare className="w-3 h-3" /> Comment
                            </span>
                          )}
                          <span className="text-[11px] text-[#71717A]">
                            {f.client_name || "Anonymous"}{whenLabel ? ` · ${whenLabel}` : ""}
                          </span>
                        </div>
                        {f.comment && (
                          <p className="text-sm text-[#27272A] whitespace-pre-wrap leading-relaxed">{f.comment}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer with edit + delete */}
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 flex flex-wrap items-center justify-between gap-2 border-t border-[#E4E4E7] pt-4 mt-2">
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-red-400 font-medium">Delete this post?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-sm font-semibold text-white bg-red-500/90 hover:bg-red-500 px-3 py-1.5 rounded-lg disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Yes, delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-sm text-[#71717A] hover:text-[#27272A]">Cancel</button>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-sm text-[#71717A] hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete post
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setDuplicateMenuOpen(o => !o)}
                disabled={duplicating}
                className="flex items-center gap-1.5 text-sm font-semibold text-[#71717A] hover:text-[#1e82b4] transition-colors disabled:opacity-50"
                title="Create a fresh draft copy — pick the destination market"
              >
                {duplicating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />}
                Duplicate
              </button>
              {duplicateMenuOpen && !duplicating && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setDuplicateMenuOpen(false)}
                  />
                  <div className="absolute right-0 bottom-full mb-1.5 z-20 w-64 bg-white border border-[#E4E4E7] rounded-lg shadow-lg overflow-hidden">
                    <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#A1A1AA] border-b border-[#F4F4F5]">
                      Duplicate to
                    </div>
                    {(() => {
                      // Source platform — collapse the legacy "Facebook + cross_post=true"
                      // representation onto "Both" so the "same" tag lands on the
                      // FB + IG option for dual-posted source rows.
                      const sourcePlatform =
                        post.platform === "Facebook" && post.cross_post === true
                          ? "Both"
                          : post.platform;
                      const opts = [
                        { market: "Maltese Market", platform: "Facebook", label: "Maltese (EN) · Facebook" },
                        { market: "Maltese Market", platform: "Instagram", label: "Maltese (EN) · Instagram" },
                        { market: "Maltese Market", platform: "Both", label: "Maltese (EN) · FB + IG" },
                        { market: "Italian Market", platform: "Facebook", label: "Italian (IT) · Facebook" },
                      ] as const;
                      return opts.map(opt => {
                      const isCurrent =
                        opt.market === post.market && opt.platform === sourcePlatform;
                      return (
                        <button
                          key={`${opt.market}-${opt.platform}`}
                          onClick={() => {
                            setDuplicateMenuOpen(false);
                            handleDuplicate({ market: opt.market, platform: opt.platform });
                          }}
                          className="w-full text-left px-3 py-2 text-[13px] text-[#27272A] hover:bg-[#F4F4F5] flex items-center justify-between gap-2"
                        >
                          <span>{opt.label}</span>
                          {isCurrent && (
                            <span className="text-[10px] text-[#A1A1AA] font-medium">same</span>
                          )}
                        </button>
                      );
                      });
                    })()}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={downloadBrief}
              disabled={downloadingBrief}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#71717A] hover:text-[#1e82b4] transition-colors disabled:opacity-50"
              title="Download a one-page brief PDF for this post"
            >
              {downloadingBrief ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download brief
            </button>
            <button onClick={onClose} className="text-sm text-[#71717A] hover:text-[#27272A] font-medium">Close</button>
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
    case "public_holiday": return "bg-red-500/10 text-red-700 border-red-500/25";
    case "festival":       return "bg-purple-500/10 text-purple-700 border-purple-500/25";
    case "seasonal":       return "bg-amber-500/10 text-amber-700 border-amber-500/25";
    case "cultural":       return "bg-blue-500/10 text-blue-700 border-blue-500/25";
    case "brand_event":    return "bg-[#1e82b4]/12 text-[#5BB6E0] border-[#1e82b4]/30";
    default:               return "bg-[#FFFFFF] text-[#71717A] border-[#E4E4E7]";
  }
}

// ─── Stacked Calendar ─────────────────────────────────────────────────────────

function CalendarGrid({
  year, month, posts, events, onCardClick, onDayClick,
  selectionMode = false, selectedIds, onToggleSelect,
  showPast = false, showPosted = false, onPostUpdated, onMovePost,
}: {
  year: number;
  month: number;
  posts: ContentPost[];
  events: CalEvent[];
  onCardClick: (post: ContentPost) => void;
  onDayClick: (dateStr: string) => void;
  selectionMode?: boolean;
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
  showPast?: boolean;
  showPosted?: boolean;
  onPostUpdated?: () => void;
  onMovePost?: (postId: number, newDate: string) => Promise<void> | void;
}) {
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const total = daysInMonth(year, month);
  const mk = toMonthKey(year, month);

  const postsByDate: Record<string, ContentPost[]> = {};
  for (const p of posts) {
    const key = p.scheduled_date ?? "unscheduled";
    if (!postsByDate[key]) postsByDate[key] = [];
    postsByDate[key].push(p);
  }
  // Within each day: posts with no scheduled time first, then by time ascending.
  for (const key of Object.keys(postsByDate)) {
    postsByDate[key]!.sort((a, b) => {
      const at = a.scheduled_time ?? "";
      const bt = b.scheduled_time ?? "";
      if (!at && bt) return -1;
      if (at && !bt) return 1;
      return at.localeCompare(bt);
    });
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const isPastMonth =
    year < today.getFullYear() ||
    (year === today.getFullYear() && month < today.getMonth());
  const unscheduled = posts.filter(p => !p.scheduled_date);

  const isPastDay = (day: number) => {
    if (isPastMonth) return true;
    if (!isCurrentMonth) return false;
    return day < today.getDate();
  };

  // Always render every day; past days collapse to a thin one-line row unless
  // the user explicitly toggles "View past" in the toolbar.
  const days = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div className="space-y-0 divide-y divide-[#E4E4E7]">
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

        const past = isPastDay(day);
        const collapsedPast = past && !showPast;

        // Past days are hidden entirely so the user always sees upcoming
        // content first; toggling "View past" in the toolbar restores them.
        if (collapsedPast) {
          return null;
        }

        return (
          <div
            key={day}
            onClick={() => onDayClick(dateStr)}
            onDragOver={onMovePost ? (e) => {
              if (!e.dataTransfer.types.includes("application/x-vfh-post-id")) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              if (dragOverDate !== dateStr) setDragOverDate(dateStr);
            } : undefined}
            onDragLeave={onMovePost ? (e) => {
              // Only clear if leaving the row, not entering a child
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              if (dragOverDate === dateStr) setDragOverDate(null);
            } : undefined}
            onDrop={onMovePost ? async (e) => {
              const raw = e.dataTransfer.getData("application/x-vfh-post-id");
              if (!raw) return;
              e.preventDefault();
              setDragOverDate(null);
              const id = Number(raw);
              if (!Number.isFinite(id)) return;
              const original = posts.find(p => p.id === id);
              if (!original || original.scheduled_date === dateStr) return;
              await onMovePost(id, dateStr);
            } : undefined}
            className={cn(
              "flex gap-3 px-1 py-1.5 transition-colors cursor-pointer hover:bg-[#F4F4F5] group/day",
              isWeekend && dayPosts.length === 0 && dayEvents.length === 0 ? "opacity-30 hover:opacity-100" : "",
              dragOverDate === dateStr ? "bg-[#1e82b4]/10 ring-2 ring-inset ring-[#1e82b4]/40 rounded-lg" : ""
            )}
          >
            {/* Date column */}
            <div className="w-12 shrink-0 flex flex-col items-center pt-0.5">
              <span className={cn(
                "text-[10px] font-medium uppercase tracking-[0.18em] leading-none",
                isToday ? "text-[#1e82b4]" : "text-[#A1A1AA]"
              )}>
                {dayName}
              </span>
              <div className={cn(
                "w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold mt-1 num-tabular",
                isToday ? "bg-[#1e82b4] text-white shadow-[0_0_16px_rgba(30,130,180,0.5)]" : "text-[#71717A]"
              )}>
                {day}
              </div>
              {/* Event dots */}
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center max-w-[40px]">
                  {dayEvents.slice(0, 3).map(e => (
                    <div key={e.id} className={cn("w-1.5 h-1.5 rounded-full", eventDotColor(e.type))} title={e.title} />
                  ))}
                  {dayEvents.length > 3 && <div className="text-[8px] text-[#71717A] font-bold leading-none">+{dayEvents.length - 3}</div>}
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
                <div className="h-7 flex items-center">
                  <div className="h-px w-full bg-[#FAFAFA]" />
                </div>
              ) : dayPosts.length === 0 ? (
                <div className="h-1" />
              ) : (
                <div className="space-y-1">
                  {dayPosts.map(post => (
                    <div key={post.id} onClick={e => e.stopPropagation()}>
                      <PostRow
                        post={post}
                        onClick={() =>
                          selectionMode && onToggleSelect ? onToggleSelect(post.id) : onCardClick(post)
                        }
                        selectionMode={selectionMode}
                        selected={selectedIds?.has(post.id) ?? false}
                        compact={post.status === "posted" && !showPosted}
                        onPostUpdated={onPostUpdated}
                      />
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
          <div className="bg-amber-500/[0.04] border border-amber-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]">
                {unscheduled.length} post{unscheduled.length > 1 ? "s" : ""} without a date
              </p>
            </div>
            <div className="space-y-2">
              {unscheduled.map(post => (
                <PostRow
                  key={post.id}
                  post={post}
                  onClick={() =>
                    selectionMode && onToggleSelect ? onToggleSelect(post.id) : onCardClick(post)
                  }
                  selectionMode={selectionMode}
                  selected={selectedIds?.has(post.id) ?? false}
                  compact={post.status === "posted" && !showPosted}
                  onPostUpdated={onPostUpdated}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Post Row (used in stacked view) ─────────────────────────────────────────

function PostRow({
  post,
  onClick,
  selectionMode = false,
  selected = false,
  compact = false,
  onPostUpdated,
}: {
  post: ContentPost;
  onClick: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  compact?: boolean;
  onPostUpdated?: () => void;
}) {
  const sc = statusConfig(post.status);
  const Icon = sc.icon;
  const { activeBrand } = useBrand();
  const isVirtu = activeBrand?.slug === "virtu-ferries";
  const platIcons = platformIconList(post.platform, post.format);
  const showCrossPost = post.cross_post && post.platform === "Facebook" && !platIcons.some(p => p.key === "ig");

  // Compute which channels are NOT yet on this post — shown as ghost icons
  // the user can click to add the channel without opening the edit modal.
  // Virtu: FB ↔ Both (FB+IG via cross_post). Italian market is FB-only, no add.
  // GHS: comma-separated list of Facebook / Instagram / Story.
  const isItalian = post.market === "Italian Market";
  const addableChannels: Array<{ key: "fb" | "ig" | "story"; Icon: typeof Facebook; color: string; label: string; payload: Partial<ContentPost> }> = (() => {
    if (selectionMode || isProfileChange(post)) return [];
    if (isVirtu) {
      if (isItalian) return []; // Italian market = FB only
      const hasFB = post.platform === "Facebook" || post.platform === "Both";
      const hasIG = post.platform === "Instagram" || post.platform === "Both" || (post.platform === "Facebook" && !!post.cross_post);
      const out: Array<{ key: "fb" | "ig" | "story"; Icon: typeof Facebook; color: string; label: string; payload: Partial<ContentPost> }> = [];
      if (!hasIG) out.push({ key: "ig", Icon: Instagram, color: "text-[#E1306C]", label: "Also publish on Instagram", payload: { platform: "Both", cross_post: true } });
      if (!hasFB) out.push({ key: "fb", Icon: Facebook, color: "text-[#1877F2]", label: "Also publish on Facebook", payload: { platform: "Both", cross_post: true } });
      return out;
    }
    // GHS — multi-select via comma list
    const cur = (post.platform ?? "").split(",").map(s => s.trim()).filter(Boolean);
    const has = (k: string) => cur.includes(k);
    const add = (k: string) => [...cur, k].join(",");
    const out: Array<{ key: "fb" | "ig" | "story"; Icon: typeof Facebook; color: string; label: string; payload: Partial<ContentPost> }> = [];
    if (!has("Facebook"))  out.push({ key: "fb",    Icon: Facebook,  color: "text-[#1877F2]", label: "Also publish on Facebook",  payload: { platform: add("Facebook") } });
    if (!has("Instagram")) out.push({ key: "ig",    Icon: Instagram, color: "text-[#E1306C]", label: "Also publish on Instagram", payload: { platform: add("Instagram") } });
    if (!has("Story"))     out.push({ key: "story", Icon: Circle,    color: "text-[#A855F7]", label: "Also publish as Story",     payload: { platform: add("Story") } });
    return out;
  })();
  const [addingChannel, setAddingChannel] = useState<string | null>(null);
  const addChannel = async (key: string, payload: Partial<ContentPost>) => {
    setAddingChannel(key);
    try {
      const resp = await fetch(`${API}/api/content/posts/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (resp.ok) onPostUpdated?.();
    } finally {
      setAddingChannel(null);
    }
  };

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left flex items-center gap-1.5 px-2 py-0.5 rounded transition-colors opacity-50 hover:opacity-100 hover:bg-[#F4F4F5] group focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[#1e82b4]/50",
        )}
        title={`${post.title?.trim() || post.pillar} — ${sc.label}`}
      >
        <div className={cn("w-1 h-3 rounded-full shrink-0", sc.color.includes("emerald") ? "bg-emerald-400" : "bg-[#3F3F46]")} />
        {isVirtu && (
          <span className={cn("text-[9px] font-bold px-1 py-0 rounded-full", marketBadge(post.market))}>
            {marketShort(post.market)}
          </span>
        )}
        {platIcons.map(({ Icon: PI, color, key }) => (
          <PI key={key} className={cn("w-3 h-3", color)} />
        ))}
        <span className="text-[11px] text-[#71717A] truncate flex-1 line-through decoration-[#3F3F46]">
          {post.title?.trim() || post.pillar}
        </span>
        {post.status === "posted" && (
          <span className="text-[9px] font-bold tracking-wider text-emerald-400 shrink-0">POSTED</span>
        )}
      </button>
    );
  }

  const dragEnabled = !selectionMode && post.status !== "posted" && !isProfileChange(post);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      draggable={dragEnabled}
      onDragStart={dragEnabled ? (e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("application/x-vfh-post-id", String(post.id));
        e.dataTransfer.setData("text/plain", String(post.id));
      } : undefined}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return; // ignore key events from inner buttons
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); }
      }}
      className={cn(
        "w-full text-left flex items-center gap-2.5 border rounded-lg px-2.5 py-1.5 transition-all group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e82b4]/40",
        dragEnabled && "active:cursor-grabbing",
        selectionMode && selected
          ? "bg-[#1e82b4]/10 border-[#1e82b4] ring-2 ring-[#1e82b4]/25"
          : "bg-[#FFFFFF] border-[#E4E4E7] hover:border-[#E4E4E7] hover:bg-[#F4F4F5]",
      )}
    >
      {selectionMode && (
        <div
          className={cn(
            "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
            selected ? "bg-[#1e82b4] border-[#1e82b4]" : "border-[#E4E4E7] bg-[#FFFFFF] group-hover:border-[#1e82b4]",
          )}
        >
          {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </div>
      )}
      {/* Status stripe */}
      <div className={cn("w-1 h-8 rounded-full shrink-0", sc.color.includes("green") ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : sc.color.includes("red") ? "bg-red-400" : "bg-amber-400/80")} />

      {/* Market + platform */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isVirtu && (
          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", marketBadge(post.market))}>
            {marketShort(post.market)}
          </span>
        )}
        {platIcons.map(({ Icon: PI, color, key, title }) => (
          <PI key={key} className={cn("w-3.5 h-3.5", color)} aria-label={title} />
        ))}
        {showCrossPost && (
          <Instagram className="w-3.5 h-3.5 text-[#E1306C]" aria-label="Also posting to Instagram" />
        )}
        {/* Ghost icons for channels NOT yet on this post — click adds the channel */}
        {addableChannels.map(({ key, Icon: GI, color, label, payload }) => (
          <button
            key={`add-${key}`}
            type="button"
            onClick={(e) => { e.stopPropagation(); addChannel(key, payload); }}
            disabled={addingChannel !== null}
            title={label}
            aria-label={label}
            className={cn(
              "relative flex items-center justify-center w-4 h-4 rounded transition-all",
              "text-[#A1A1AA] hover:text-current opacity-75 hover:opacity-100",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e82b4]/60 focus-visible:opacity-100",
              addingChannel === key ? "opacity-100" : "",
            )}
          >
            {addingChannel === key
              ? <Loader2 className="w-3 h-3 animate-spin text-[#A1A1AA]" />
              : <>
                  <GI className={cn("w-3 h-3", "hover:" + color)} strokeWidth={2} />
                  <Plus className="absolute -top-0.5 -right-0.5 w-2 h-2 text-[#A1A1AA]" strokeWidth={3} />
                </>
            }
          </button>
        ))}
      </div>

      {/* Title + format */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {isProfileChange(post) && (
            <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 shrink-0">
              PROFILE
            </span>
          )}
          <p className="text-[13px] font-medium text-[#27272A] truncate group-hover:text-[#18181B] tracking-[-0.005em]">
            {post.title?.trim() || (isProfileChange(post) ? "Profile change" : post.pillar)}
          </p>
          {!isProfileChange(post) && post.recurring && <span title="Repeats yearly" className="shrink-0 inline-flex"><RefreshCw className="w-3 h-3 text-violet-400" aria-label="Repeats yearly" /></span>}
          {!isProfileChange(post) && post.caption?.trim() && (
            <span title="Caption written" className="shrink-0 inline-flex"><AlignLeft className="w-3 h-3 text-[#1e82b4]" aria-label="Caption written" /></span>
          )}
          {post.drive_url?.trim() && (
            <span title="Drive folder attached" className="shrink-0 inline-flex"><FolderOpen className="w-3 h-3 text-emerald-400" aria-label="Drive folder attached" /></span>
          )}
          {(() => {
            // At-a-glance client feedback indicators so the team can see who
            // approved / requested changes / commented without opening the
            // post. Counts collapse multiple entries of the same kind.
            const fb = post.client_feedback ?? [];
            if (fb.length === 0) return null;
            let approved = 0, changes = 0, comments = 0;
            for (const f of fb) {
              if (f.decision === "approved") approved += 1;
              else if (f.decision === "changes_requested") changes += 1;
              else if (f.comment?.trim()) comments += 1;
            }
            return (
              <>
                {approved > 0 && (
                  <span title={`${approved} client approval${approved > 1 ? "s" : ""}`} className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" aria-label="Client approved" />
                    {approved > 1 && <span>{approved}</span>}
                  </span>
                )}
                {changes > 0 && (
                  <span title={`${changes} change request${changes > 1 ? "s" : ""} from client`} className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" aria-label="Client requested changes" />
                    {changes > 1 && <span>{changes}</span>}
                  </span>
                )}
                {comments > 0 && (
                  <span title={`${comments} client comment${comments > 1 ? "s" : ""}`} className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-semibold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded-full">
                    <MessageSquare className="w-3 h-3" aria-label="Client comment" />
                    {comments > 1 && <span>{comments}</span>}
                  </span>
                )}
              </>
            );
          })()}
        </div>
        <p className="text-[11px] text-[#A1A1AA] truncate font-light">
          {isProfileChange(post) ? "Profile update" : `${post.pillar} · ${post.format}`}
          {post.scheduled_time && <span className="ml-1 text-[#1e82b4] font-medium num-tabular">· {post.scheduled_time}</span>}
        </p>
      </div>

      {/* Assignee badge */}
      {post.assigned_to && (
        <span className="hidden sm:flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FFFFFF] border border-[#E4E4E7] text-[#71717A] shrink-0">
          {post.assigned_to}
        </span>
      )}

      {/* Creative state — single status pill (post-approval status is managed in the modal) */}
      {(() => {
        const cs = creativeStatusConfig(post.creative_status ?? "To Do");
        return (
          <span
            className={cn(
              "flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full shrink-0",
              cs.chip,
            )}
            title={`Creative: ${cs.label}`}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", cs.dot)} />
            <span className="hidden sm:inline">{cs.label}</span>
          </span>
        );
      })()}
    </div>
  );
}

// ─── New / Edit Post Modal ────────────────────────────────────────────────────

// Unicode mathematical sans-serif bold characters — these survive paste into
// Facebook and Instagram as visually-bold text (the platforms strip rich text
// formatting, but they preserve these standalone Unicode glyphs).
//
// Code-point ranges (sans-serif bold):
//   A-Z → U+1D5D4..U+1D5ED
//   a-z → U+1D5EE..U+1D607
//   0-9 → U+1D7EC..U+1D7F5
function toBoldUnicode(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x41 && code <= 0x5a) out += String.fromCodePoint(0x1d5d4 + (code - 0x41));
    else if (code >= 0x61 && code <= 0x7a) out += String.fromCodePoint(0x1d5ee + (code - 0x61));
    else if (code >= 0x30 && code <= 0x39) out += String.fromCodePoint(0x1d7ec + (code - 0x30));
    else out += ch;
  }
  return out;
}
function fromBoldUnicode(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code >= 0x1d5d4 && code <= 0x1d5ed) out += String.fromCodePoint(0x41 + (code - 0x1d5d4));
    else if (code >= 0x1d5ee && code <= 0x1d607) out += String.fromCodePoint(0x61 + (code - 0x1d5ee));
    else if (code >= 0x1d7ec && code <= 0x1d7f5) out += String.fromCodePoint(0x30 + (code - 0x1d7ec));
    else out += ch;
  }
  return out;
}
function isBoldUnicode(text: string): boolean {
  // Treat a selection as already-bold if at least one alphanumeric char is in
  // the bold range. Punctuation/spaces are ignored — they don't have bold forms.
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (
      (code >= 0x1d5d4 && code <= 0x1d5ed) ||
      (code >= 0x1d5ee && code <= 0x1d607) ||
      (code >= 0x1d7ec && code <= 0x1d7f5)
    ) return true;
  }
  return false;
}

// Toggle bold on the current selection of a textarea, then update the form
// field via the provided setter and restore selection so the user can keep
// styling. If the selection is empty, no-op.
function applyBoldToTextarea(
  textarea: HTMLTextAreaElement | null,
  value: string,
  setValue: (next: string) => void,
): void {
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if (start === end) return;
  const selected = value.slice(start, end);
  const transformed = isBoldUnicode(selected) ? fromBoldUnicode(selected) : toBoldUnicode(selected);
  const next = value.slice(0, start) + transformed + value.slice(end);
  setValue(next);
  // Restore the selection on the next tick so React can re-render first.
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start, start + transformed.length);
  });
}

// Insert a string at the textarea's current cursor (or replacing the current
// selection), then place the caret immediately after the insertion. Used by
// the emoji picker so emoji land where the user is typing rather than at the
// end of the caption.
function insertAtTextareaCursor(
  textarea: HTMLTextAreaElement | null,
  value: string,
  setValue: (next: string) => void,
  insert: string,
): string {
  if (!textarea) {
    const next = value + insert;
    setValue(next);
    return next;
  }
  const start = textarea.selectionStart ?? value.length;
  const end = textarea.selectionEnd ?? value.length;
  const next = value.slice(0, start) + insert + value.slice(end);
  setValue(next);
  const caret = start + insert.length;
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(caret, caret);
  });
  return next;
}

// Full Unicode emoji dataset (≈3,700 emojis, grouped by the official Unicode
// CLDR category) — sourced from `unicode-emoji-json` so we get an authoritative
// list plus searchable names and slugs without hand-maintaining a curated set.
// Vite inlines the JSON into the bundle.
import emojiByGroup from "unicode-emoji-json/data-by-group.json";

type RawEmoji = {
  emoji: string;
  name: string;
  slug: string;
  skin_tone_support?: boolean;
};
type RawGroup = { name: string; slug: string; emojis: RawEmoji[] };

// Curated "Suggested" set — kept on top as the first tab so the team has the
// Virtu-relevant emoji one click away even with the full Unicode set behind it.
const SUGGESTED_EMOJI: string[] = [
  "⛴️", "🚢", "🛥️", "⚓", "🌊", "🏝️", "🏖️", "🌅", "☀️", "🌤️", "🌴", "🚗", "🐕", "🐾", "🧳", "📍", "🗺️",
  "🍝", "🍕", "🍷", "🥂", "☕", "🍦", "🇲🇹", "🇮🇹",
  "✨", "🔥", "❤️", "💙", "💛", "🎉", "👏", "👀", "💯", "⭐", "✅", "📣", "📅", "👇", "🔗",
];

// One tab per Unicode CLDR group — first the curated suggested set, then the
// full official categories. Tab labels use a representative glyph for compact
// horizontal layout.
const GROUP_TAB_GLYPH: Record<string, string> = {
  "Smileys & Emotion": "😀",
  "People & Body": "👋",
  "Animals & Nature": "🐶",
  "Food & Drink": "🍕",
  "Travel & Places": "✈️",
  "Activities": "⚽",
  "Objects": "💡",
  "Symbols": "❤️",
  "Flags": "🏳️",
};

// The JSON is published as a flat array of `{ name, slug, emojis[] }` records,
// one per CLDR group. Cast through `unknown` because TS infers the JSON's
// concrete literal types (with `skin_tone_support_unicode_version` etc.) which
// don't structurally overlap with our narrower `RawGroup` type.
const EMOJI_GROUPS_FULL: RawGroup[] = emojiByGroup as unknown as RawGroup[];

// Flat search index built once at module load — each emoji's name and slug are
// pre-lowercased and split into words so search can do a cheap "every query
// token is a substring of some keyword" check.
type SearchEntry = { emoji: string; name: string; haystack: string };
const SEARCH_INDEX: SearchEntry[] = EMOJI_GROUPS_FULL.flatMap(g =>
  g.emojis.map(e => ({
    emoji: e.emoji,
    name: e.name,
    // slug words + name words + group name, joined with spaces, lowercased.
    haystack: `${e.slug.replace(/_/g, " ")} ${e.name.toLowerCase()} ${g.name.toLowerCase()}`,
  })),
);

function searchEmoji(query: string, limit = 240): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const out: SearchEntry[] = [];
  for (const entry of SEARCH_INDEX) {
    let ok = true;
    for (const t of tokens) {
      if (!entry.haystack.includes(t)) { ok = false; break; }
    }
    if (ok) {
      out.push(entry);
      if (out.length >= limit) break;
    }
  }
  return out;
}

// Compact emoji picker rendered as a button + click-away popover. Inserts the
// selected emoji at the cursor position of the bound textarea via the parent's
// setter. Designed to sit next to "Bold selection" with the same visual weight.
//
// Implementation notes:
//  • The popover is rendered into a React portal at `document.body` with fixed
//    positioning so it escapes modal `overflow: hidden` containers. Position
//    is recomputed on open and on scroll/resize so it tracks the trigger.
//  • `value` from the parent can be stale during fast chained picks (the
//    parent re-renders asynchronously). We keep a ref to the latest value
//    and read from it inside `pick` so chained picks never overwrite an
//    earlier insertion.
function EmojiPickerButton({
  textareaRef,
  value,
  setValue,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  setValue: (next: string) => void;
}): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Active category tab: "suggested" for the curated set, or the Unicode
  // group name (e.g. "Smileys & Emotion"). Ignored when a search query is
  // present — search results take over the body.
  const [activeTab, setActiveTab] = useState<string>("suggested");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Track the latest value via a ref so chained picks don't read a stale
  // closure (parent setState is async; click N+1 can fire before the parent
  // has re-rendered with the post-click-N value).
  const valueRef = useRef(value);
  useEffect(() => { valueRef.current = value; }, [value]);

  // Compute the panel position: anchor under the trigger, right-aligned, and
  // flip above when there isn't room below.
  const PANEL_WIDTH = 320;
  const PANEL_MAX_HEIGHT = 360;
  const recompute = useCallback(() => {
    const t = triggerRef.current;
    if (!t) return;
    const r = t.getBoundingClientRect();
    const gap = 4;
    const spaceBelow = window.innerHeight - r.bottom;
    const top = spaceBelow >= PANEL_MAX_HEIGHT + gap || spaceBelow >= r.top
      ? r.bottom + gap
      : Math.max(8, r.top - PANEL_MAX_HEIGHT - gap);
    const rightEdge = r.right;
    const left = Math.max(8, Math.min(window.innerWidth - PANEL_WIDTH - 8, rightEdge - PANEL_WIDTH));
    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    recompute();
  }, [open, recompute]);

  useEffect(() => {
    if (!open) return;
    function onDocPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onReflow() { recompute(); }
    document.addEventListener("pointerdown", onDocPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReflow);
    window.addEventListener("scroll", onReflow, true);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [open, recompute]);

  function pick(emoji: string) {
    // Read from the ref so chained picks see the latest value, and write the
    // computed next value back into the ref synchronously — the parent's
    // setState is async, so without this a rapid second click would still
    // see the pre-insert value and overwrite the first emoji.
    const next = insertAtTextareaCursor(textareaRef.current, valueRef.current, setValue, emoji);
    valueRef.current = next;
    // Leave the popover open so the user can chain several emoji without
    // having to re-open it for each pick — matches how IG/FB native pickers feel.
  }

  // Focus the search input automatically when the picker opens, so the team
  // can type immediately ("pizza", "wave", "fire") without clicking the field.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => searchRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  // Reset search and tab when the picker closes so reopening starts clean.
  useEffect(() => {
    if (!open) { setQuery(""); setActiveTab("suggested"); }
  }, [open]);

  const searchResults = query.trim() ? searchEmoji(query) : null;

  // Which list to render in the body: search results when searching, the
  // curated suggested set when the suggested tab is active, otherwise the
  // raw Unicode group's emoji array.
  const bodyEmoji: { emoji: string; aria: string }[] = (() => {
    if (searchResults) return searchResults.map(r => ({ emoji: r.emoji, aria: `Insert ${r.name}` }));
    if (activeTab === "suggested") return SUGGESTED_EMOJI.map(e => ({ emoji: e, aria: `Insert ${e}` }));
    const group = EMOJI_GROUPS_FULL.find(g => g.name === activeTab);
    return (group?.emojis ?? []).map(e => ({ emoji: e.emoji, aria: `Insert ${e.name}` }));
  })();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={e => e.preventDefault()}
        onClick={() => setOpen(o => !o)}
        className={cn(
          "text-[10px] font-bold transition-colors flex items-center gap-1 px-2 py-0.5 rounded-md",
          open
            ? "text-[#1e82b4] bg-[#1e82b4]/10"
            : "text-[#71717A] hover:text-[#1e82b4] hover:bg-[#1e82b4]/10",
        )}
        title="Insert an emoji at the cursor"
        aria-label="Insert emoji"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Smile className="w-3 h-3" />
        Emoji
      </button>
      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Emoji picker"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: PANEL_WIDTH, maxHeight: PANEL_MAX_HEIGHT }}
          className="z-[100] flex flex-col bg-white border border-[#E4E4E7] rounded-xl shadow-lg overflow-hidden"
          onMouseDown={e => e.preventDefault()}
        >
          {/* Search */}
          <div className="px-2 pt-2 pb-1.5 border-b border-[#F4F4F5]">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#A1A1AA] pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Escape") { if (query) { e.stopPropagation(); setQuery(""); } } }}
                placeholder="Search emoji (e.g. pizza, wave, fire)"
                className="w-full bg-[#FAFAFA] border border-[#E4E4E7] rounded-md text-[11px] text-[#27272A] placeholder:text-[#A1A1AA] pl-6 pr-2 py-1 focus:outline-none focus:border-[#1e82b4]/60 focus:ring-1 focus:ring-[#1e82b4]/20"
                aria-label="Search emoji"
              />
            </div>
          </div>

          {/* Category tabs — hidden while searching since search is global */}
          {!searchResults && (
            <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-[#F4F4F5] overflow-x-auto scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveTab("suggested")}
                aria-pressed={activeTab === "suggested"}
                title="Suggested"
                className={cn(
                  "text-sm leading-none aspect-square w-6 flex items-center justify-center rounded-md transition-colors shrink-0",
                  activeTab === "suggested" ? "bg-[#1e82b4]/10" : "hover:bg-[#F4F4F5]",
                )}
              >
                ⭐
              </button>
              {EMOJI_GROUPS_FULL.map(g => {
                const glyph = GROUP_TAB_GLYPH[g.name] ?? g.emojis[0]?.emoji ?? "•";
                const active = activeTab === g.name;
                return (
                  <button
                    key={g.name}
                    type="button"
                    onClick={() => setActiveTab(g.name)}
                    aria-pressed={active}
                    title={g.name}
                    className={cn(
                      "text-sm leading-none aspect-square w-6 flex items-center justify-center rounded-md transition-colors shrink-0",
                      active ? "bg-[#1e82b4]/10" : "hover:bg-[#F4F4F5]",
                    )}
                  >
                    {glyph}
                  </button>
                );
              })}
            </div>
          )}

          {/* Active body header */}
          <div className="px-2.5 pt-1.5 pb-1">
            <p className="text-[9px] uppercase tracking-[0.18em] text-[#A1A1AA] font-medium">
              {searchResults
                ? `${searchResults.length} ${searchResults.length === 1 ? "result" : "results"}${searchResults.length >= 240 ? "+" : ""}`
                : activeTab === "suggested" ? "Suggested" : activeTab}
            </p>
          </div>

          {/* Body grid */}
          <div className="flex-1 overflow-y-auto px-1.5 pb-2">
            {bodyEmoji.length === 0 ? (
              <p className="text-[11px] text-[#A1A1AA] text-center py-6 font-light">
                No emoji match "{query}".
              </p>
            ) : (
              <div className="grid grid-cols-9 gap-0.5">
                {bodyEmoji.map((b, i) => (
                  <button
                    key={`${b.emoji}-${i}`}
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => pick(b.emoji)}
                    aria-label={b.aria}
                    className="text-base leading-none aspect-square flex items-center justify-center rounded-md hover:bg-[#F4F4F5] focus:bg-[#F4F4F5] focus:outline-none transition-colors"
                    title={b.aria.replace(/^Insert /, "")}
                  >
                    {b.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

const FORMATS = ["Carousel", "Reel", "Video", "Story", "UGC", "4 Photos"];
// Facebook-only format whitelist (with explicit aspect ratios). The user wants
// the FB picker to be the single canonical list of supported FB formats so the
// team stops drafting posts in unsupported aspect ratios. IG/Both/Story keep
// the broader generic FORMATS list above.
const FB_FORMATS = [
  "Single Image - 4:5",
  "Single Image - 16:9",
  "Four Photo - 1:1",
  "Video - 16:9",
  "Reel - 9:16",
  "UGC",
];
// Instagram-only format whitelist. IG composes from a tighter set than FB —
// no Video, no Four Photo, no UGC — and aspect ratios are fixed per format.
const IG_FORMATS = [
  "Reel - 9:16",
  "Story",
  "Carousel - 4:5",
  "Single Image - 4:5",
];
const formatsForPlatform = (platform?: string | null) => {
  const p = (platform ?? "").toLowerCase();
  if (p === "facebook") return FB_FORMATS;
  if (p === "instagram") return IG_FORMATS;
  return FORMATS;
};
const TONE_REGISTERS = ["Destination Spotlight", "Offer / Promotion", "Journey Moment", "Community & Culture", "Behind the Scenes", "UGC / Social Proof", "Educational", "Operational"];

interface NewPostForm {
  entry_type: "post" | "profile_change";
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
  posted_url: string;
  recurring: boolean;
  notes: string;
  assigned_to: string;
}

function NewPostModal({
  monthKey,
  editPost,
  allPosts,
  presetDate,
  presetMarket,
  presetPlatform,
  onClose,
  onSaved,
}: {
  monthKey: string;
  editPost?: ContentPost;
  allPosts?: ContentPost[];
  presetDate?: string;
  presetMarket?: string;
  presetPlatform?: string;
  onClose: () => void;
  onSaved: (saved?: { market: string; platform: string; format: string; cross_post: boolean; scheduled_date: string | null }) => void;
}) {
  const [year, mon] = monthKey.split("-").map(Number);
  const today = new Date();
  const defaultDate = presetDate
    ?? (today.getFullYear() === year && today.getMonth() + 1 === mon
      ? today.toISOString().slice(0, 10)
      : `${monthKey}-01`);

  const { allPillars, englishPillars, italianPillars } = usePillars();
  const { activeBrand } = useBrand();
  const isVirtu = activeBrand?.slug === "virtu-ferries";

  const [form, setForm] = useState<NewPostForm>(() => {
    if (editPost) {
      return {
        entry_type: editPost.entry_type === "profile_change" ? "profile_change" : "post",
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
        attachment_type: editPost.link_url ? "link" : editPost.media_url ? "upload" : isVirtu ? "none" : "upload",
        link_url: editPost.link_url ?? "",
        drive_url: editPost.drive_url ?? "",
        posted_url: editPost.posted_url ?? "",
        recurring: editPost.recurring,
        notes: editPost.notes ?? "",
        assigned_to: editPost.assigned_to ?? "",
      };
    }
    const startMarket = presetMarket ?? "Maltese Market";
    const startPlatform = presetPlatform ?? "Facebook";
    return {
      entry_type: "post",
      market: startMarket,
      platform: startPlatform,
      pillar: allPillars[0] ?? "The Virtu Experience",
      format: formatsForPlatform(startPlatform)[0],
      title: "",
      caption: "",
      visual_direction: "",
      resources: "",
      visual_reference_url: "",
      cross_post: false,
      scheduled_date: defaultDate,
      scheduled_time: "",
      status: "pending",
      attachment_type: isVirtu ? "none" : "upload",
      link_url: "",
      drive_url: "",
      posted_url: "",
      recurring: false,
      notes: "",
      assigned_to: "",
    };
  });
  const isProfile = form.entry_type === "profile_change";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { members: rawTeamMembers, addMember } = useTeamMembers();
  const teamMembers = rawTeamMembers.some(m => m.name === "Nico Bazan")
    ? rawTeamMembers
    : [{ id: -1, name: "Nico Bazan", role: "Videographer" }, ...rawTeamMembers];
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState("");
  const [rewritingNote, setRewritingNote] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!datePickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setDatePickerOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDatePickerOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [datePickerOpen]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "done">(
    editPost?.media_url ? "done" : "idle"
  );
  const [uploadedPath, setUploadedPath] = useState<string | null>(editPost?.media_url ?? null);

  function set<K extends keyof NewPostForm>(key: K, val: NewPostForm[K]) {
    setForm(f => {
      const next = { ...f, [key]: val };
      // Italian market can only use Facebook
      if (key === "market" && val === "Italian Market" && (next.platform === "Instagram" || next.platform === "Both" || next.platform === "Story")) {
        next.platform = "Facebook";
        next.cross_post = false;
      }
      // Derive cross_post from platform — platform is the single source of truth
      if (key === "platform") {
        next.cross_post = val === "Both";
        // Picking Story as the platform implies the post is a Story; mirror it
        // into format so existing format-based displays stay consistent.
        if (val === "Story") {
          next.format = "Story";
        }
      }
      return next;
    });
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
    const sizeError = validateUploadSize(file);
    if (sizeError) {
      setError(sizeError);
      setSelectedFile(null);
      setUploadProgress("idle");
      return;
    }
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
      const profile = form.entry_type === "profile_change";
      const payload = {
        entry_type: form.entry_type,
        market: form.market,
        platform: form.platform,
        // Profile changes don't use pillar/format/caption — store sentinel values
        // so the NOT NULL columns are satisfied without polluting the post fields.
        pillar: profile ? "Profile" : form.pillar,
        title: form.title.trim() || null,
        format: profile ? "Profile Update" : form.format,
        caption: profile ? "" : form.caption.trim(),
        visual_direction: form.visual_direction.trim(),
        resources: form.resources.trim() || null,
        visual_reference_url: form.visual_reference_url.trim() || null,
        media_url: form.attachment_type === "upload" ? (uploadedPath || null) : null,
        link_url: form.attachment_type === "link" ? (form.link_url.trim() || null) : null,
        drive_url: form.drive_url.trim() || null,
        posted_url: form.posted_url.trim() || null,
        cross_post: profile ? false : form.cross_post,
        recurring: profile ? false : form.recurring,
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
      onSaved({
        market: payload.market,
        platform: payload.platform,
        format: payload.format,
        cross_post: payload.cross_post,
        scheduled_date: payload.scheduled_date,
      });
    } catch {
      setError("Failed to save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  const isEnglish = form.market === "Maltese Market";
  const isFB = form.platform === "Facebook";

  const inputCls = "w-full border border-[#E4E4E7] rounded-xl px-4 py-2.5 text-sm text-[#27272A] focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/30 focus:border-[#1e82b4]/60 bg-[#FFFFFF] placeholder:text-[#A1A1AA] [color-scheme:light]";
  const labelCls = "text-[10px] font-semibold text-[#71717A] uppercase tracking-widest block mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="bg-[#FFFFFF] rounded-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)] ring-1 ring-[#E4E4E7] w-full max-w-xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className={cn(
          "flex items-center justify-between border-b border-[#E4E4E7] sticky top-0 bg-[#FFFFFF]/95 backdrop-blur-md z-10",
          isVirtu ? "p-6" : "p-4"
        )}>
          {isVirtu ? (
            <div>
              <h2 className="text-lg font-extrabold text-[#18181B]">{editPost ? "Edit post" : "Add a post"}</h2>
              <p className="text-xs text-[#71717A] mt-0.5">{new Date(year, mon - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" })}</p>
            </div>
          ) : (
            <div className="flex items-baseline gap-2 min-w-0">
              <h2 className="text-base font-extrabold text-[#18181B] truncate">{editPost ? "Edit post" : "Add a post"}</h2>
              <span className="text-[11px] text-[#71717A] truncate">· {new Date(year, mon - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" })}</span>
            </div>
          )}
          <button onClick={onClose} className="text-[#71717A] hover:text-[#27272A] p-1.5 rounded-lg hover:bg-[#F4F4F5] transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={isVirtu ? "p-6 space-y-5" : "p-5 space-y-3"}>
          {/* Entry type — Post vs Profile change */}
          <div className="inline-flex rounded-lg bg-[#FFFFFF] ring-1 ring-[#E4E4E7] p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => set("entry_type", "post")}
              className={cn(
                "px-3 py-1.5 rounded-md transition-colors",
                form.entry_type === "post" ? "bg-[#FFFFFF] text-[#1e82b4] ring-1 ring-[#E4E4E7]" : "text-[#71717A] hover:text-[#27272A]",
              )}
            >
              Post
            </button>
            <button
              type="button"
              onClick={() => set("entry_type", "profile_change")}
              className={cn(
                "px-3 py-1.5 rounded-md transition-colors",
                form.entry_type === "profile_change" ? "bg-[#FFFFFF] text-[#1e82b4] ring-1 ring-[#E4E4E7]" : "text-[#71717A] hover:text-[#27272A]",
              )}
            >
              Profile change
            </button>
          </div>
          {isProfile && (
            <p className="text-[11px] text-[#71717A] -mt-2">
              For non-post updates like cover photo, profile pic, or bio refreshes.
            </p>
          )}

          {/* Market + Platform */}
          {isVirtu ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Market</label>
                <select value={form.market} onChange={e => set("market", e.target.value)} className={inputCls}>
                  <option value="Maltese Market">Maltese</option>
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
          ) : (
            <div>
              <label className="text-[10px] font-semibold text-[#71717A] uppercase tracking-wider block mb-1">Platforms</label>
              <div className="flex gap-2">
                {([
                  { key: "Facebook",  Icon: Facebook,  color: "#1877F2" },
                  { key: "Instagram", Icon: Instagram, color: "#E1306C" },
                  { key: "Story",     Icon: Circle,    color: "#A855F7" },
                ] as const).map(({ key, Icon, color }) => {
                  const selected = (form.platform ?? "").split(",").map(s => s.trim()).filter(Boolean);
                  const isOn = selected.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setForm(f => {
                          const cur = (f.platform ?? "").split(",").map(s => s.trim()).filter(Boolean);
                          const turningOn = !cur.includes(key);
                          const next = turningOn ? [...cur, key] : cur.filter(p => p !== key);
                          if (next.length === 0) return f; // keep at least one ticked
                          return {
                            ...f,
                            platform: next.join(","),
                            cross_post: false,
                            format: turningOn && key === "Story" ? "Story" : f.format,
                          };
                        });
                      }}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs font-semibold transition-colors",
                        isOn
                          ? "bg-[#FFFFFF] border-2"
                          : "bg-[#FFFFFF] border border-[#E4E4E7] text-[#A1A1AA] hover:border-[#E4E4E7] hover:text-[#71717A]"
                      )}
                      style={isOn ? { borderColor: color, color } : undefined}
                    >
                      <Icon className="w-4 h-4" strokeWidth={2.2} />
                      {key}
                      {isOn && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label className={isVirtu ? labelCls : "text-[10px] font-semibold text-[#71717A] uppercase tracking-wider block mb-1"}>Date</label>
            {(() => {
              const marketFilteredPosts = (allPosts ?? []).filter(
                p => p.market === form.market
              );
              if (isVirtu) {
                return (
                  <>
                    <MiniCalendar
                      monthKey={monthKey}
                      value={form.scheduled_date}
                      onChange={d => set("scheduled_date", d)}
                      posts={marketFilteredPosts}
                      excludeId={editPost?.id}
                    />
                    <p className="mt-1.5 text-[10px] text-[#71717A] font-medium">
                      Showing {form.market === "Italian Market" ? "Italian" : "English"} posts only
                    </p>
                  </>
                );
              }
              const dateLabel = form.scheduled_date
                ? new Date(form.scheduled_date + "T00:00:00").toLocaleDateString("en-GB", {
                    weekday: "short", day: "numeric", month: "short", year: "numeric"
                  })
                : "Pick a date";
              return (
                <div className="relative" ref={datePickerRef}>
                  <button
                    type="button"
                    onClick={() => setDatePickerOpen(o => !o)}
                    className={cn(
                      "flex items-center justify-between w-full px-3 py-2 rounded-lg border text-left transition-all text-sm",
                      datePickerOpen
                        ? "border-[#1e82b4]/60 ring-2 ring-[#1e82b4]/30 bg-[#FFFFFF]"
                        : "border-[#E4E4E7] bg-[#FFFFFF] hover:border-[#A1A1AA]",
                      !form.scheduled_date && "text-[#A1A1AA]"
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Calendar className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                      <span className="truncate font-medium text-[#27272A]">{dateLabel}</span>
                    </span>
                    <ChevronDown className={cn("w-3.5 h-3.5 text-[#71717A] transition-transform shrink-0", datePickerOpen && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {datePickerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.12 }}
                        className="absolute left-0 right-0 top-full mt-1 z-50 shadow-xl rounded-xl"
                      >
                        <MiniCalendar
                          monthKey={form.scheduled_date ? form.scheduled_date.slice(0, 7) : monthKey}
                          value={form.scheduled_date}
                          onChange={d => { set("scheduled_date", d); setDatePickerOpen(false); }}
                          posts={marketFilteredPosts}
                          excludeId={editPost?.id}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })()}
            {form.scheduled_date && (() => {
              const sameDayPosts = (allPosts ?? []).filter(
                p => p.scheduled_date === form.scheduled_date && p.id !== editPost?.id && p.market === form.market
              );
              if (sameDayPosts.length === 0) return null;
              return (
                <div className="mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                  <p className="text-[11px] font-semibold text-amber-700 mb-1">
                    {sameDayPosts.length} post{sameDayPosts.length > 1 ? "s" : ""} already on this day
                  </p>
                  <ul className="space-y-0.5">
                    {sameDayPosts.map(p => (
                      <li key={p.id} className="flex items-center gap-1.5 text-[11px] text-amber-200/90">
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: PLATFORM_DOT_COLOR[p.platform] ?? "#F59E0B" }}
                        />
                        <span className="font-medium">{p.platform}</span>
                        <span className="text-amber-400/70">·</span>
                        <span className="truncate">{p.pillar}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>

          {/* Time */}
          {isVirtu && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={cn(labelCls, "mb-0")}>Posting time <span className="normal-case text-[#A1A1AA] font-normal">(optional · Malta local time)</span></label>
              {(() => {
                const fmt = form.format;
                const plat = form.platform;
                let best = "09:00";
                if (fmt.startsWith("Reel") || fmt.startsWith("Video")) best = "18:00";
                else if (fmt.startsWith("Carousel")) best = "13:00";
                else if (fmt.startsWith("Single Image")) best = plat === "Facebook" ? "09:00" : "13:00";
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
          )}

          {/* Status + Assigned */}
          {isVirtu && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)} className={inputCls}>
                <option value="pending">Draft</option>
                <option value="approved">Approved</option>
                <option value="scheduled">Scheduled</option>
                <option value="posted">Posted</option>
              </select>
              {(form.status === "posted" || form.posted_url) && (
                <div className="mt-2">
                  <label className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                    <ExternalLink className="w-3 h-3" />
                    Live post URL
                    <span className="font-normal normal-case text-[#A1A1AA]">— paste the FB / IG link</span>
                  </label>
                  <input
                    type="url"
                    value={form.posted_url}
                    onChange={e => set("posted_url", e.target.value)}
                    placeholder="https://facebook.com/… or https://instagram.com/p/…"
                    className={inputCls}
                  />
                </div>
              )}
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
                    className="px-3 py-1.5 rounded-lg bg-[#FFFFFF] text-[#71717A] text-sm hover:bg-[#E4E4E7] ring-1 ring-[#E4E4E7]"
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
                    className="shrink-0 px-2.5 py-1.5 rounded-lg bg-[#FFFFFF] text-[#71717A] hover:bg-[#E4E4E7] ring-1 ring-[#E4E4E7] text-lg leading-none"
                    onClick={() => setAddingPerson(true)}
                  >+</button>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Pillar + Format */}
          {isVirtu && !isProfile && (
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
                {formatsForPlatform(form.platform).map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          )}

          {/* GHS compact: Time · Status · Assigned · Pillar · Format */}
          {!isVirtu && (() => {
            const compactInput = "w-full border border-[#E4E4E7] rounded-lg px-2.5 py-1.5 text-sm text-[#27272A] focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/30 focus:border-[#1e82b4]/60 bg-[#FFFFFF] placeholder:text-[#A1A1AA] [color-scheme:light]";
            const compactLabel = "text-[10px] font-semibold text-[#71717A] uppercase tracking-wider block mb-1";
            const fmt = form.format;
            const plat = form.platform;
            let best = "09:00";
            if (fmt.startsWith("Reel") || fmt.startsWith("Video")) best = "18:00";
            else if (fmt.startsWith("Carousel")) best = "13:00";
            else if (fmt.startsWith("Single Image")) best = plat === "Facebook" ? "09:00" : "13:00";
            return (
              <div className="space-y-2.5">
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-semibold text-[#71717A] uppercase tracking-wider">Time</label>
                      <button
                        type="button"
                        onClick={() => set("scheduled_time", best)}
                        title={`Best time for ${fmt} on ${plat}`}
                        className="flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#1e82b4]/10 text-[#1e82b4] hover:bg-[#1e82b4]/20 transition-colors"
                      >
                        <Zap className="w-2.5 h-2.5" />
                        {best}
                      </button>
                    </div>
                    <input
                      type="time"
                      value={form.scheduled_time}
                      onChange={e => set("scheduled_time", e.target.value)}
                      className={compactInput}
                    />
                  </div>
                  <div>
                    <label className={compactLabel}>Status</label>
                    <select value={form.status} onChange={e => set("status", e.target.value)} className={compactInput}>
                      <option value="pending">Draft</option>
                      <option value="approved">Approved</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="posted">Posted</option>
                    </select>
                  </div>
                  <div>
                    <label className={compactLabel}>Assigned</label>
                    {addingPerson ? (
                      <div className="flex gap-1">
                        <input
                          autoFocus
                          className={compactInput + " flex-1 min-w-0"}
                          placeholder="Name…"
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
                          title="Save"
                          className="shrink-0 px-1.5 py-1.5 rounded-lg bg-[#1e82b4] text-white hover:bg-[#1a6fa0]"
                          onClick={async () => {
                            if (!newPersonName.trim()) return;
                            const m = await addMember(newPersonName.trim());
                            if (m) set("assigned_to", m.name);
                            setNewPersonName("");
                            setAddingPerson(false);
                          }}
                        ><Check className="w-3.5 h-3.5" /></button>
                        <button
                          type="button"
                          title="Cancel"
                          className="shrink-0 px-1.5 py-1.5 rounded-lg bg-[#FFFFFF] text-[#71717A] hover:bg-[#E4E4E7] ring-1 ring-[#E4E4E7]"
                          onClick={() => { setAddingPerson(false); setNewPersonName(""); }}
                        ><X className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <select value={form.assigned_to} onChange={e => set("assigned_to", e.target.value)} className={compactInput + " flex-1 min-w-0"}>
                          <option value="">Unassigned</option>
                          {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                        </select>
                        <button
                          type="button"
                          title="Add person"
                          className="shrink-0 px-2 py-1.5 rounded-lg bg-[#FFFFFF] text-[#71717A] hover:bg-[#E4E4E7] ring-1 ring-[#E4E4E7] text-base leading-none"
                          onClick={() => setAddingPerson(true)}
                        >+</button>
                      </div>
                    )}
                  </div>
                </div>
                {!isProfile && (
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className={compactLabel}>Pillar</label>
                    <select value={form.pillar} onChange={e => set("pillar", e.target.value)} className={compactInput}>
                      {(form.market === "Italian Market" ? italianPillars : englishPillars).map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={compactLabel}>Format</label>
                    <select value={form.format} onChange={e => set("format", e.target.value)} className={compactInput}>
                      {formatsForPlatform(form.platform).map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
                )}
              </div>
            );
          })()}

          {/* Content title */}
          <div>
            <label className={labelCls}>Content title <span className="text-[#A1A1AA] normal-case font-normal">(optional)</span></label>
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
              <label className="block text-[10px] font-semibold text-[#71717A] uppercase tracking-widest">
                Caption <span className="font-normal normal-case text-[#A1A1AA]">optional</span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyBoldToTextarea(captionRef.current, form.caption, (next) => set("caption", next))}
                  className="text-[10px] font-bold text-[#71717A] hover:text-[#1e82b4] hover:bg-[#1e82b4]/10 transition-colors flex items-center gap-1 px-2 py-1 rounded-md"
                  title="Select text in the caption, then click to make it bold (Unicode bold — survives Facebook & Instagram paste)"
                >
                  <Bold className="w-3 h-3" />
                  Bold selection
                </button>
                <EmojiPickerButton textareaRef={captionRef} value={form.caption} setValue={(next) => set("caption", next)} />
              </div>
            </div>
            <textarea
              ref={captionRef}
              value={form.caption}
              onChange={e => set("caption", e.target.value)}
              placeholder={isEnglish && !isFB ? "Write an Instagram-native caption…" : "Write the full post copy…"}
              rows={2}
              className={`${inputCls} resize-none font-light leading-relaxed`}
            />
          </div>

          {/* Visual direction */}
          <div>
            <label className={labelCls}>Visual direction <span className="font-normal normal-case text-[#A1A1AA]">optional</span></label>
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
            <label className={labelCls}>Resources <span className="font-normal normal-case text-[#A1A1AA]">optional links</span></label>
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
                            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg text-[#71717A] hover:text-red-400 hover:bg-red-500/10 transition-colors"
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

            {/* Google Drive folder — placed under Resources for GHS */}
            {!isVirtu && (
              <div className="mt-2.5">
                <label className="text-[10px] font-semibold text-[#71717A] uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Link2 className="w-3 h-3" />
                  Google Drive folder
                  <span className="font-normal normal-case text-[#A1A1AA]">— Export + PSD</span>
                </label>
                <input
                  type="url"
                  value={form.drive_url}
                  onChange={e => set("drive_url", e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/…"
                  className="w-full border border-[#E4E4E7] rounded-lg px-2.5 py-1.5 text-sm text-[#27272A] focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/30 focus:border-[#1e82b4]/60 bg-[#FFFFFF] placeholder:text-[#A1A1AA]"
                />
              </div>
            )}
          </div>

          {/* Visual reference link */}
          {isVirtu && (
          <div>
            <label className={labelCls}>Visual reference <span className="text-[#A1A1AA] normal-case font-normal">(optional)</span></label>
            <input
              type="url"
              value={form.visual_reference_url}
              onChange={e => set("visual_reference_url", e.target.value)}
              placeholder="https://drive.google.com/… or any reference link"
              className={inputCls}
            />
          </div>
          )}

          {/* Attachment — upload or link */}
          <div>
            <label className={labelCls}>
              {isVirtu ? "Attachment" : "Visual"} <span className="text-[#A1A1AA] normal-case font-normal">{isVirtu ? "(optional)" : "image or video — optional"}</span>
            </label>
            <div className="flex gap-2 mb-3">
              {(["none", "upload", "link"] as const).map(t => {
                const activeClass = isVirtu
                  ? "bg-[#1e82b4] text-white border-[#1e82b4]"
                  : "bg-[#1d3289] text-white border-[#1d3289]";
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { set("attachment_type", t); setSelectedFile(null); setUploadedPath(null); setUploadProgress("idle"); }}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
                      form.attachment_type === t
                        ? activeClass
                        : "bg-[#FFFFFF] text-[#71717A] border-[#E4E4E7] hover:border-[#E4E4E7] hover:text-[#71717A]"
                    )}
                  >
                    {t === "none" && "None"}
                    {t === "upload" && <><Upload className="w-3 h-3" /> Upload</>}
                    {t === "link" && <><Link2 className="w-3 h-3" /> Link</>}
                  </button>
                );
              })}
            </div>

            {form.attachment_type === "upload" && (
              <div>
                <label className={cn(
                  "flex w-full border-2 border-dashed rounded-xl cursor-pointer transition-colors",
                  isVirtu ? "flex-col items-center justify-center gap-2 p-6" : "flex-col items-center justify-center gap-2 p-5",
                  uploadProgress === "done"
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : isVirtu
                      ? "border-[#E4E4E7] hover:border-[#1e82b4]/40 bg-[#FFFFFF]"
                      : "border-[#E4E4E7] hover:border-[#1d3289]/60 bg-[#FFFFFF]"
                )}>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={e => { if (e.target.files?.[0]) handleFileChange(e.target.files[0]); }}
                    disabled={uploadProgress === "uploading"}
                  />
                  {uploadProgress === "idle" && (
                    isVirtu ? (
                      <>
                        <div className="flex gap-2 text-[#A1A1AA]">
                          <ImageIcon className="w-5 h-5" />
                          <Film className="w-5 h-5" />
                        </div>
                        <p className="text-sm text-[#71717A]">Click to select image or video</p>
                        <p className="text-xs text-[#71717A]">JPG, PNG, GIF, MP4, MOV, WebM</p>
                      </>
                    ) : (
                      <>
                        <div className="flex gap-2 text-[#A1A1AA]">
                          <ImageIcon className="w-5 h-5" />
                          <Film className="w-5 h-5" />
                        </div>
                        <p className="text-sm text-[#71717A]">Click to upload an image or video</p>
                        <p className="text-xs text-[#71717A]">JPG, PNG, GIF, MP4, MOV, WebM</p>
                      </>
                    )
                  )}
                  {uploadProgress === "uploading" && (
                    <div className={cn("flex items-center gap-2", isVirtu ? "text-[#1e82b4]" : "text-[#1d3289]")}>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Uploading {selectedFile?.name}…</span>
                    </div>
                  )}
                  {uploadProgress === "done" && (
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {selectedFile?.name ?? (uploadedPath ? uploadedPath.split("/").pop() : "File attached")}
                      </span>
                      {selectedFile === null && uploadedPath && (
                        <button
                          type="button"
                          onClick={() => { setUploadedPath(null); setUploadProgress("idle"); set("attachment_type", "none"); }}
                          className="ml-2 text-xs text-red-400 hover:text-red-700 underline"
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

            {/* Google Drive folder for designer hand-off (Export + PSD) — Virtu only here; GHS shows it under Resources */}
            {isVirtu && (
              <div className="mt-3 pt-3 border-t border-[#E4E4E7]">
                <label className="text-[10px] font-semibold text-[#71717A] uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
                  <Link2 className="w-3 h-3" />
                  Google Drive folder
                  <span className="font-normal normal-case text-[#A1A1AA]">— upload Export + PSD here</span>
                </label>
                <input
                  type="url"
                  value={form.drive_url}
                  onChange={e => set("drive_url", e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/…"
                  className={inputCls}
                />
              </div>
            )}
          </div>

          {/* Notes */}
          {isVirtu && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-semibold text-[#71717A] uppercase tracking-widest">
                Notes <span className="font-normal normal-case text-[#A1A1AA]">internal only</span>
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
          )}

          {/* Recurring toggle */}
          {isProfile ? null : isVirtu ? (
            <button
              type="button"
              onClick={() => set("recurring", !form.recurring)}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left transition-all",
                form.recurring
                  ? "border-[#1e82b4]/40 bg-[#1e82b4]/10"
                  : "border-[#E4E4E7] bg-[#FFFFFF] hover:border-[#E4E4E7]"
              )}
            >
              <div className={cn(
                "w-9 h-5 rounded-full relative transition-colors shrink-0",
                form.recurring ? "bg-[#1e82b4]" : "bg-[#E4E4E7]"
              )}>
                <div className={cn(
                  "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                  form.recurring ? "translate-x-4" : "translate-x-0.5"
                )} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#18181B]">Repeats every year</p>
                <p className="text-xs text-[#71717A] font-light">Tag this as an annual post — e.g. a Christmas post, an anniversary post</p>
              </div>
            </button>
          ) : (
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#71717A] hover:text-[#18181B] transition-colors w-fit">
              <input
                type="checkbox"
                checked={form.recurring}
                onChange={() => set("recurring", !form.recurring)}
                className="w-3.5 h-3.5 rounded border-[#E4E4E7] bg-[#FFFFFF] text-[#1e82b4] focus:ring-1 focus:ring-[#1e82b4]/40 [color-scheme:light]"
              />
              Repeats every year (annual post)
            </label>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <div className="px-6 pb-6 flex items-center gap-3">
          <button onClick={onClose} className="text-sm text-[#71717A] hover:text-[#27272A] font-medium">Cancel</button>
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F4F4F5] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1e82b4]/10 flex items-center justify-center">
              <History className="w-4 h-4 text-[#1e82b4]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[#18181B]">Import Past Content</h2>
              <p className="text-[11px] text-[#A1A1AA]">Upload your previous calendar CSV to teach the AI your style</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#A1A1AA] hover:text-[#52525B] transition-colors">
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
                <p className="text-base font-extrabold text-[#18181B]">
                  {importedCount} posts imported
                </p>
                <p className="text-sm text-[#71717A] mt-1">
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
                  dragging ? "border-[#1e82b4] bg-[#1e82b4]/5" : "border-[#E4E4E7] hover:border-[#1e82b4]/40 hover:bg-[#F5F5F5]"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-[#F4F4F5] flex items-center justify-center">
                  <FileUp className="w-5 h-5 text-[#A1A1AA]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-[#3F3F46]">Drop your CSV here, or click to browse</p>
                  <p className="text-xs text-[#A1A1AA] mt-1">Export from Google Sheets or Excel as CSV</p>
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f); }} />

              {/* Expected format */}
              <div className="rounded-xl bg-[#F5F5F5] border border-[#F4F4F5] p-4">
                <p className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider mb-2">Expected columns</p>
                <div className="flex flex-wrap gap-2">
                  {["date", "time", "caption", "platform", "direction"].map(col => (
                    <span key={col} className="text-[11px] bg-white border border-[#E4E4E7] text-[#52525B] px-2 py-0.5 rounded-md font-mono">{col}</span>
                  ))}
                </div>
                <p className="text-[11px] text-[#A1A1AA] mt-2">Column names are flexible — the importer will try to match common variations automatically.</p>
              </div>

              {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </>
          ) : (
            <>
              {/* Preview */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#52525B]">{rows.length} rows found — preview:</p>
                <button onClick={() => setRows([])} className="text-xs text-[#A1A1AA] hover:text-[#52525B] underline">Clear</button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-[#F4F4F5]">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-[#F5F5F5] text-[#71717A] text-left">
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Platform</th>
                      <th className="px-3 py-2 font-semibold">Market</th>
                      <th className="px-3 py-2 font-semibold">Caption</th>
                      <th className="px-3 py-2 font-semibold">Direction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.slice(0, 8).map((r, i) => (
                      <tr key={i} className="hover:bg-[#F5F5F5]/60">
                        <td className="px-3 py-2 text-[#52525B] whitespace-nowrap">{r.date}</td>
                        <td className="px-3 py-2 text-[#52525B] whitespace-nowrap">{r.platform}</td>
                        <td className="px-3 py-2">
                          <select
                            value={r.market}
                            onChange={e => setRows(prev => prev.map((row, ri) => ri === i ? { ...row, market: e.target.value } : row))}
                            className="text-[11px] border border-[#E4E4E7] rounded-md px-1.5 py-0.5 bg-white"
                          >
                            <option value="English">English</option>
                            <option value="Italian">Italian</option>
                            <option value="both">Both</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-[#3F3F46] max-w-[200px] truncate">{r.caption}</td>
                        <td className="px-3 py-2 text-[#71717A] max-w-[160px] truncate">{r.direction}</td>
                      </tr>
                    ))}
                    {rows.length > 8 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-2 text-[11px] text-[#A1A1AA] text-center">+ {rows.length - 8} more rows</td>
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
          <div className="px-6 py-4 border-t border-[#F4F4F5] flex justify-end gap-3 shrink-0">
            <button onClick={() => setRows([])} className="text-sm text-[#A1A1AA] hover:text-[#52525B] font-medium">Back</button>
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
  const [loadedMonth, setLoadedMonth] = useState<string | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostPresetDate, setNewPostPresetDate] = useState<string | null>(null);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loadedEventsYear, setLoadedEventsYear] = useState<number | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const { activeBrand } = useBrand();
  const isVirtu = activeBrand?.slug === "virtu-ferries";

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setShowShareModal(false);
  }, []);

  type MarketFilter = "all" | "ig" | "fb" | "story" | "en-fb" | "it-fb";
  const [marketFilter, setMarketFilter] = useState<MarketFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPosted, setShowPosted] = useState(false);
  const [showPast, setShowPast] = useState(false);

  // Single-market brands (e.g. Gozo Highspeed) only need a platform filter:
  // All / FB / IG / Stories. The EN/IT split is irrelevant there, so reset any
  // stale market-specific filter when the active brand changes. Likewise reset
  // Gozo-only filters (fb, story) when switching to Virtu.
  useEffect(() => {
    if (!isVirtu && (marketFilter === "en-fb" || marketFilter === "it-fb")) {
      setMarketFilter("all");
    }
    if (isVirtu && (marketFilter === "fb" || marketFilter === "story")) {
      setMarketFilter("all");
    }
  }, [isVirtu, marketFilter]);

  const monthKey = toMonthKey(year, month);

  const postedCount = posts.filter(p => p.status === "posted").length;
  const searchQ = searchQuery.trim().toLowerCase();
  const visiblePosts = posts.filter(p => {
    // Skipped posts live on a dedicated /skipped-posts page — keep the
    // calendar focused on what's actually planned, drafted, or live.
    if (p.status === "skipped") return false;
    // Free-text search across title, caption, visual direction, pillar and
    // assignee — matches whatever the user remembers about the post.
    if (searchQ) {
      const hay = [p.title, p.caption, p.visual_direction, p.pillar, p.assigned_to, p.format, p.platform]
        .map(s => (s ?? "").toLowerCase())
        .join(" \u0001 ");
      if (!hay.includes(searchQ)) return false;
    }
    if (marketFilter === "all") return true;
    const platformLc = (p.platform ?? "").toLowerCase();
    const formatLc = (p.format ?? "").toLowerCase();
    const isItalian2 = p.market === "Italian Market";
    // Single-channel filters are STRICT: a cross-post (platform "Both", or
    // the legacy "Facebook + cross_post=true" shape) is treated as belonging
    // to *both* channels conceptually, so it is excluded from each
    // single-channel view and only appears in "All". This matches the user's
    // explicit request: "on FB i only see FB, on IG i only see IG, on All i
    // see all".
    const isCrossPost = platformLc === "both" || (platformLc === "facebook" && p.cross_post === true);
    const igOnly = platformLc === "instagram";
    const fbOnly = platformLc === "facebook" && !isCrossPost;
    const story2 = platformLc.includes("story") || formatLc.includes("story");
    if (marketFilter === "ig") return igOnly;
    if (marketFilter === "fb") return fbOnly;
    if (marketFilter === "story") return story2;
    if (marketFilter === "en-fb") return fbOnly && !isItalian2;
    if (marketFilter === "it-fb") return fbOnly && isItalian2;
    return true;
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
        p.market === "Maltese Market" ? "EN" : "IT",
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
      `Generated ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
      10,
      pageH - 5
    );

    doc.save(`virtu-ferries-content-${monthKey}.pdf`);
  }

  return (
    <div className="relative min-h-screen bg-[#F5F5F5] text-[#18181B]">
      <div aria-hidden className="pointer-events-none absolute inset-0 ambient-radial opacity-30" />
      {/* Header */}
      <div className="relative border-b border-[#E4E4E7] bg-[#F5F5F5]/85 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-wrap">
            <h1 className="text-[15px] md:text-[16px] font-semibold text-[#18181B] tracking-[-0.01em] shrink-0">Content calendar</h1>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg hover:bg-[#F4F4F5] text-[#A1A1AA] hover:text-[#27272A] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[13px] font-medium text-[#27272A] min-w-[110px] md:min-w-[140px] text-center num-tabular">
                {monthLabel(year, month)}
              </span>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg hover:bg-[#F4F4F5] text-[#A1A1AA] hover:text-[#27272A] transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            {isPast && (
              <span className="text-[10px] uppercase tracking-[0.18em] bg-[#FFFFFF] border border-[#E4E4E7] text-[#71717A] px-2 py-0.5 rounded-full font-medium">
                Past
              </span>
            )}
            <div className="flex items-center bg-[#FFFFFF] border border-[#E4E4E7] rounded-full p-0.5 text-[11px] font-semibold">
              {(isVirtu
                ? ([
                    { k: "all", label: "All", node: <span className="px-1">All</span> },
                    { k: "ig", label: "Instagram", node: <Instagram className="w-4 h-4" strokeWidth={2.2} /> },
                    // EN/IT market filters use a Facebook icon tinted in the
                    // market's brand colour (EN = Virtu blue, IT = Virtu red)
                    // so the toolbar communicates "Maltese FB" / "Italian FB"
                    // at a glance — flags were ambiguous because they didn't
                    // hint at the platform.
                    { k: "en-fb", label: "Maltese (English) Facebook", node: <FlagFacebookIcon variant="mt" /> },
                    { k: "it-fb", label: "Italian Facebook", node: <FlagFacebookIcon variant="it" /> },
                  ] as const)
                : ([
                    { k: "all", label: "All", node: <span className="px-1">All</span> },
                    { k: "fb", label: "Facebook", node: <Facebook className="w-4 h-4" strokeWidth={2.2} /> },
                    { k: "ig", label: "Instagram", node: <Instagram className="w-4 h-4" strokeWidth={2.2} /> },
                    { k: "story", label: "Stories", node: <Circle className="w-4 h-4" strokeWidth={2.4} /> },
                  ] as const)
              ).map(opt => {
                const active = marketFilter === opt.k;
                // EN/IT Facebook filters render the FB icon as an outline
                // (same neutral pill chrome as the IG filter), but the icon
                // stroke is painted in the country's flag colours via an SVG
                // linear-gradient (see `FlagFacebookIcon` below): Malta = red,
                // Italy = green | grey | red tricolour. No flag background —
                // it's the icon itself that carries the market signal.
                const isFlag = opt.k === "en-fb" || opt.k === "it-fb";
                const color =
                  opt.k === "ig" ? "bg-gradient-to-r from-[#f6a610] to-[#e01814] text-white" :
                  opt.k === "fb" ? "bg-[#1877F2] text-white" :
                  opt.k === "story" ? "bg-gradient-to-r from-[#7b3ff2] to-[#e01814] text-white" :
                  isFlag ? "bg-[#F4F4F5] ring-1 ring-[#18181B]/30" :
                  "bg-[#E4E4E7] text-[#18181B] shadow-[inset_0_0_0_1px_#E4E4E7]";
                // Inactive: identical neutral chrome for every icon-only pill
                // (IG, EN-FB, IT-FB). The colour is in the icon, not the pill.
                const inactive = "text-[#71717A] hover:text-[#27272A]";
                return (
                  <button
                    key={opt.k}
                    onClick={() => setMarketFilter(opt.k)}
                    title={opt.label}
                    className={cn(
                      "h-7 min-w-7 flex items-center justify-center rounded-full transition-all overflow-hidden",
                      opt.k === "all" ? "px-2 text-[11px]" : "px-1.5",
                      active ? color : inactive
                    )}
                  >
                    {opt.node}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-wrap justify-end">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search posts…"
                aria-label="Search posts in this month"
                className="h-7 pl-7 pr-7 text-[11px] bg-[#FFFFFF] border border-[#E4E4E7] rounded-full text-[#27272A] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/30 focus:border-[#1e82b4]/60 w-40 md:w-52 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-[#A1A1AA] hover:text-[#27272A] hover:bg-[#F4F4F5]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            {loading && <Loader2 className="w-4 h-4 text-[#3F3F46] animate-spin mr-1" />}
            {selectionMode ? (
              <button
                onClick={exitSelectionMode}
                className="text-[11px] font-medium transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[#1e82b4] bg-[#1e82b4]/10 hover:bg-[#1e82b4]/15 border border-[#1e82b4]/20 mr-1"
                title="Exit sharing mode"
              >
                <Share2 className="w-3.5 h-3.5" />
                Cancel sharing
              </button>
            ) : (
              <>
                {posts.length > 0 && (
                  <button
                    onClick={exportPDF}
                    className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#27272A] hover:bg-[#F4F4F5] transition-colors"
                    title={`Export ${posts.length} posts for ${monthLabel(year, month)} as PDF`}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                {postedCount > 0 && (
                  <button
                    onClick={() => setShowPosted(v => !v)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 border",
                      showPosted
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15"
                        : "text-[#A1A1AA] hover:text-emerald-400 hover:bg-[#F4F4F5] border-transparent",
                    )}
                    title={showPosted
                      ? "Collapse posted posts back to one-line"
                      : `Expand ${postedCount} posted ${postedCount === 1 ? "post" : "posts"}`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    {showPosted ? "Hide posted" : `View posted · ${postedCount}`}
                  </button>
                )}
                <button
                  onClick={() => setShowPast(v => !v)}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 border",
                    showPast
                      ? "bg-[#E4E4E7] text-[#27272A] border-[#E4E4E7] hover:bg-[#E4E4E7]"
                      : "text-[#A1A1AA] hover:text-[#27272A] hover:bg-[#F4F4F5] border-transparent",
                  )}
                  title={showPast
                    ? "Hide past days from this month"
                    : "Show past days in this month"}
                >
                  <Archive className="w-3.5 h-3.5" />
                  {showPast ? "Hide past" : "View past"}
                </button>
                <button
                  onClick={() => setShowImport(true)}
                  className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#27272A] hover:bg-[#F4F4F5] transition-colors"
                  title="Import history"
                >
                  <History className="w-4 h-4" />
                </button>
                {posts.length > 0 && (
                  <button
                    onClick={() => setSelectionMode(true)}
                    className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#27272A] hover:bg-[#F4F4F5] transition-colors"
                    title="Share with client — pick posts and create a shareable link"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
            <div className="hidden md:block w-px h-5 bg-[#E4E4E7] mx-1" />
            <Button
              onClick={() => setShowNewPost(true)}
              className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white text-[11px] font-medium px-3 md:px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 shadow-[0_0_20px_rgba(30,130,180,0.25)]"
            >
              <Plus className="w-3.5 h-3.5" />
              Add post
            </Button>
          </div>
        </div>
      </div>

      {/* Post count summary — derives from visiblePosts so chip counts and the
          per-format breakdown reflect the active channel filter (FB / IG / All
          / EN-FB / IT-FB) rather than the unfiltered month dataset. */}
      {visiblePosts.length > 0 && (
        <div className="relative border-b border-[#E4E4E7] bg-[#FAFAFA]">
          <div className="max-w-7xl mx-auto px-3 md:px-6 py-2 flex items-center gap-4 md:gap-6 flex-wrap">
            {(["Facebook", "Instagram"] as const).map(plat => {
              const platPosts = visiblePosts.filter(p => {
                const platLc = (p.platform ?? "").toLowerCase();
                return platLc.includes(plat.toLowerCase()) ||
                  p.platform === "Both" ||
                  (plat === "Instagram" && p.cross_post && p.platform === "Facebook");
              });
              if (platPosts.length === 0) return null;
              const en = platPosts.filter(p => !p.market.toLowerCase().includes("italian")).length;
              const it = platPosts.filter(p => p.market.toLowerCase().includes("italian")).length;
              const Icon = plat === "Facebook" ? Facebook : Instagram;
              return (
                <div key={plat} className="flex items-center gap-1.5">
                  <Icon className={cn("w-3 h-3 shrink-0", plat === "Facebook" ? "text-[#1877F2]" : "text-[#E1306C]")} />
                  <span className="text-[11px] font-medium text-[#71717A]">{plat}</span>
                  <span className="text-[12px] font-semibold text-[#18181B] num-tabular">{platPosts.length}</span>
                  <span className="text-[10px] text-[#A1A1AA] font-light num-tabular">
                    {en > 0 && it > 0 ? `${en}EN·${it}IT` : en > 0 ? `EN` : `IT`}
                  </span>
                </div>
              );
            })}
            {(() => {
              const FORMAT_META: Array<{ key: string; label: string; Icon: typeof Facebook; color: string }> = [
                { key: "single image",  label: "Single",   Icon: ImageIcon, color: "text-[#1e82b4]" },
                { key: "carousel",      label: "Carousel", Icon: Layers,    color: "text-[#0EA5E9]" },
                { key: "reel",          label: "Reels",    Icon: Film,      color: "text-[#E1306C]" },
                { key: "video",         label: "Video",    Icon: VideoIcon, color: "text-[#8B5CF6]" },
                { key: "story",         label: "Stories",  Icon: Circle,    color: "text-[#A855F7]" },
                { key: "ugc",           label: "UGC",      Icon: Users,     color: "text-[#10B981]" },
                { key: "4 photos",      label: "4 Photos", Icon: Grid2x2,   color: "text-[#F59E0B]" },
              ];
              return FORMAT_META.map(f => {
                const count = visiblePosts.filter(p => {
                  const fmt = (p.format ?? "").toLowerCase();
                  // Stories also surface via platform tag, mirror old behaviour
                  if (f.key === "story") {
                    return fmt.includes("story") || (p.platform ?? "").toLowerCase().includes("story");
                  }
                  // FB-specific formats now carry an aspect-ratio suffix
                  // (e.g. "Single Image - 4:5", "Reel - 9:16"). Match by
                  // startsWith on the key so the chips group all aspect
                  // variants under one bucket.
                  if (f.key === "4 photos") {
                    return fmt.startsWith("4 photos") || fmt.startsWith("four photo");
                  }
                  return fmt === f.key || fmt.startsWith(f.key + " -") || fmt.startsWith(f.key + " ");
                }).length;
                if (count === 0) return null;
                return (
                  <div key={f.key} className="flex items-center gap-1.5">
                    <f.Icon className={cn("w-3 h-3 shrink-0", f.color)} strokeWidth={f.key === "story" ? 2.5 : undefined} />
                    <span className="text-[11px] font-medium text-[#71717A]">{f.label}</span>
                    <span className="text-[12px] font-semibold text-[#18181B] num-tabular">{count}</span>
                  </div>
                );
              });
            })()}
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-[#A1A1AA]">
              <span className="font-semibold text-[#71717A] num-tabular">{visiblePosts.length}</span>
              <span className="font-light">posts total</span>
              {visiblePosts.filter(p => !p.scheduled_date).length > 0 && (
                <span className="ml-2 text-amber-500/90 font-medium">
                  · {visiblePosts.filter(p => !p.scheduled_date).length} unscheduled
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="relative max-w-7xl mx-auto px-3 md:px-6 py-3 md:py-4">
        {loading && posts.length === 0 ? (
          <div className="py-24 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#3F3F46] animate-spin" />
          </div>
        ) : (
          <CalendarGrid
            key="grid"
            year={year}
            month={month}
            posts={visiblePosts}
            events={events}
            onCardClick={setSelectedPost}
            onDayClick={(dateStr) => {
              if (selectionMode) return;
              setNewPostPresetDate(dateStr);
              setShowNewPost(true);
            }}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            showPast={showPast}
            showPosted={showPosted}
            onPostUpdated={() => fetchPosts(monthKey)}
            onMovePost={async (postId, newDate) => {
              try {
                const resp = await fetch(`${API}/api/content/posts/${postId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ scheduled_date: newDate }),
                });
                if (resp.ok) {
                  // Refresh both the source month (current view) and the
                  // destination month (in case the user dragged across months).
                  await fetchPosts(monthKey);
                  const destMonthKey = newDate.slice(0, 7);
                  if (destMonthKey !== monthKey) await fetchPosts(destMonthKey);
                }
              } catch {
                // Silent — UI re-renders from the unchanged server state.
              }
            }}
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
            onDuplicated={() => fetchPosts(monthKey)}
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
            // Pre-fill market + platform from the active channel filter so
            // opening "Add post" while the IT-FB / EN-FB / IG / FB pill is
            // selected lands in the right context instead of forcing the user
            // to re-pick Maltese + Facebook every time.
            presetMarket={
              marketFilter === "it-fb" ? "Italian Market" :
              marketFilter === "en-fb" ? "Maltese Market" :
              marketFilter === "ig" ? "Maltese Market" : // IG is Maltese-only (Italian is FB-only)
              undefined
            }
            presetPlatform={
              marketFilter === "it-fb" || marketFilter === "en-fb" || marketFilter === "fb" ? "Facebook" :
              marketFilter === "ig" ? "Instagram" :
              marketFilter === "story" ? "Story" :
              undefined
            }
            onClose={() => { setShowNewPost(false); setNewPostPresetDate(null); }}
            onSaved={(saved) => {
              setShowNewPost(false);
              setNewPostPresetDate(null);
              setLoadedMonth(null); // force refresh
              // Defensive: after creating a post, make sure the active filter
              // and the visible month don't accidentally hide it. Common bite
              // we hit on mobile: user has the EN-flag (Maltese FB) channel
              // pill active, then creates an Italian-Market FB post — the
              // strict filter excludes Italian from EN-FB, so the new post
              // saves fine but never appears. Same trap if they create a post
              // in a future month while looking at this month, or if they
              // still have a leftover search query from earlier.
              if (saved) {
                const platLc = saved.platform.toLowerCase();
                const isItalian = saved.market === "Italian Market";
                const isCrossPost = platLc === "both" || (platLc === "facebook" && saved.cross_post);
                const igOnly = platLc === "instagram";
                const fbOnly = platLc === "facebook" && !isCrossPost;
                const matchesFilter =
                  marketFilter === "all" ||
                  (marketFilter === "ig" && igOnly) ||
                  (marketFilter === "fb" && fbOnly) ||
                  (marketFilter === "story" && (platLc.includes("story") || saved.format.toLowerCase().includes("story"))) ||
                  (marketFilter === "en-fb" && fbOnly && !isItalian) ||
                  (marketFilter === "it-fb" && fbOnly && isItalian);
                if (!matchesFilter) setMarketFilter("all");
                if (searchQuery) setSearchQuery("");
                if (saved.scheduled_date) {
                  const [sy, sm] = saved.scheduled_date.split("-").map(Number);
                  if (sy && sm && (sy !== year || sm - 1 !== month)) {
                    setYear(sy);
                    setMonth(sm - 1);
                  }
                }
              }
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

      {/* Selection mode floating action bar */}
      <AnimatePresence>
        {selectionMode && !showShareModal && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="bg-[#FFFFFF]/95 backdrop-blur-xl border border-[#E4E4E7] text-[#18181B] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] px-2.5 py-2 flex items-center gap-1.5">
              <div className="px-3 text-[12px] font-medium text-[#27272A]">
                {selectedIds.size === 0
                  ? <span className="text-[#71717A]">Pick posts to share</span>
                  : <><span className="text-[#18181B] num-tabular">{selectedIds.size}</span> <span className="text-[#71717A]">selected</span></>}
              </div>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="text-[11px] text-[#71717A] hover:text-[#18181B] px-2 py-1.5 rounded-lg hover:bg-[#E4E4E7] transition-colors"
                >
                  Clear
                </button>
              )}
              <button
                onClick={exitSelectionMode}
                className="text-[11px] text-[#71717A] hover:text-[#18181B] px-2 py-1.5 rounded-lg hover:bg-[#E4E4E7] transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={selectedIds.size === 0}
                onClick={() => setShowShareModal(true)}
                className="bg-[#1e82b4] hover:bg-[#1a6d99] disabled:bg-[#E4E4E7] disabled:text-[#A1A1AA] text-white text-[11px] font-medium px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shadow-[0_0_24px_rgba(30,130,180,0.3)] disabled:shadow-none"
              >
                <Share2 className="w-3.5 h-3.5" />
                Create share link
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <ShareLinkModal
            postIds={Array.from(selectedIds)}
            onClose={() => setShowShareModal(false)}
            onDone={exitSelectionMode}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Share Link Modal ────────────────────────────────────────────────────────

function ShareLinkModal({
  postIds,
  onClose,
  onDone,
}: {
  postIds: number[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const resp = await fetch(`${API}/api/shares`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || null, postIds }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || "Could not create the share link.");
      }
      const data = await resp.json();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}${API}/share/${data.token}`;
      setShareUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 28 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4 border-b border-[#F4F4F5]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Share2 className="w-4 h-4 text-[#1e82b4]" />
                <h2 className="text-base font-semibold text-[#18181B]">
                  {shareUrl ? "Link ready to share" : "Share with client"}
                </h2>
              </div>
              <p className="text-xs text-[#71717A]">
                {shareUrl
                  ? "Anyone with this link can view the selected posts. No login needed."
                  : `${postIds.length} ${postIds.length === 1 ? "post" : "posts"} will be visible to clients.`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[#A1A1AA] hover:text-[#3F3F46] p-1 rounded-lg hover:bg-[#F4F4F5] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {!shareUrl ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#3F3F46] mb-1.5">
                  Name this collection <span className="text-[#A1A1AA] font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. May content for review"
                  maxLength={200}
                  className="w-full text-sm border border-[#E4E4E7] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#1e82b4] focus:ring-2 focus:ring-[#1e82b4]/20"
                  autoFocus
                />
                <p className="text-[11px] text-[#A1A1AA] mt-1.5">
                  Shown at the top of the page the client sees.
                </p>
              </div>
              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 bg-[#F5F5F5] border border-[#E4E4E7] rounded-xl px-3 py-2.5">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent text-xs text-[#27272A] truncate focus:outline-none"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={copyLink}
                  className={cn(
                    "shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5",
                    copied
                      ? "bg-emerald-500 text-white"
                      : "bg-[#1e82b4] hover:bg-[#1a6d99] text-white",
                  )}
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e82b4] hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Preview the client view
              </a>
            </>
          )}
        </div>

        <div className="px-6 py-4 bg-[#F5F5F5] border-t border-[#F4F4F5] flex items-center justify-end gap-2">
          {!shareUrl ? (
            <>
              <button
                onClick={onClose}
                className="text-xs font-semibold text-[#52525B] hover:text-[#18181B] px-3 py-2 rounded-lg hover:bg-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || postIds.length === 0}
                className="bg-[#1e82b4] hover:bg-[#1a6d99] disabled:bg-gray-300 text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                Create link
              </button>
            </>
          ) : (
            <button
              onClick={onDone}
              className="bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
