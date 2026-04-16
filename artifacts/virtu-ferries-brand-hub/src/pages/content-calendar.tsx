import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, X, AlertTriangle,
  CheckCircle2, XCircle, Clock, Archive, Facebook,
  Instagram, Globe, Loader2, ExternalLink, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PostStatus = "pending" | "approved" | "rejected" | "archived";

interface ContentPost {
  id: number;
  market: string;
  platform: string;
  pillar: string;
  tone_register: string;
  format: string;
  caption: string;
  visual_direction: string;
  cta: string | null;
  cross_post: boolean | null;
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

function CardDetailModal({ post, onClose }: { post: ContentPost; onClose: () => void }) {
  const sc = statusConfig(post.status);
  const Icon = sc.icon;
  const PlatIcon = platformIcon(post.platform);

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

          {post.cta && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">CTA</p>
              <p className="text-sm text-gray-700">{post.cta}</p>
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
      </motion.div>
    </div>
  );
}

// ─── Stacked Calendar ─────────────────────────────────────────────────────────

function CalendarGrid({
  year, month, posts, onCardClick,
}: {
  year: number;
  month: number;
  posts: ContentPost[];
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

        return (
          <div
            key={day}
            className={cn(
              "flex gap-5 px-1 py-3 transition-colors",
              dayPosts.length > 0 ? "hover:bg-gray-50/60" : "",
              isWeekend && dayPosts.length === 0 ? "opacity-40" : ""
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
            </div>

            {/* Posts */}
            <div className="flex-1 min-w-0">
              {dayPosts.length === 0 ? (
                <div className="h-10 flex items-center">
                  <div className="h-px w-full bg-gray-100" />
                </div>
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

      {/* Pillar + format */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-gray-900">{post.pillar}</p>
        <p className="text-[11px] text-gray-400 truncate">{post.format} · {post.tone_register}</p>
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

// ─── New Post Modal ───────────────────────────────────────────────────────────

const PILLARS = ["Why VF", "Why Sicily", "VF Recommends", "Virtu Ferries Experience", "Sicily Experience"];
const FORMATS = ["Single Image", "Carousel", "Reel", "Video"];
const TONE_REGISTERS = ["Destination Spotlight", "Offer / Promotion", "Journey Moment", "Community & Culture", "Behind the Scenes", "UGC / Social Proof", "Educational"];

interface NewPostForm {
  market: string;
  platform: string;
  pillar: string;
  format: string;
  tone_register: string;
  caption: string;
  visual_direction: string;
  cta: string;
  cross_post: boolean;
  scheduled_date: string;
  status: string;
}

function NewPostModal({
  monthKey,
  onClose,
  onSaved,
}: {
  monthKey: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [year, mon] = monthKey.split("-").map(Number);
  const today = new Date();
  const defaultDate = today.getFullYear() === year && today.getMonth() + 1 === mon
    ? today.toISOString().slice(0, 10)
    : `${monthKey}-01`;

  const [form, setForm] = useState<NewPostForm>({
    market: "English Market",
    platform: "Facebook",
    pillar: PILLARS[0],
    format: FORMATS[0],
    tone_register: TONE_REGISTERS[0],
    caption: "",
    visual_direction: "",
    cta: "",
    cross_post: false,
    scheduled_date: defaultDate,
    status: "pending",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  async function save() {
    if (!form.caption.trim() || !form.visual_direction.trim()) {
      setError("Caption and visual direction are required.");
      return;
    }
    setSaving(true); setError("");
    try {
      const resp = await fetch(`${API}/api/content/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{
          market: form.market,
          platform: form.platform,
          pillar: form.pillar,
          tone_register: form.tone_register,
          format: form.format,
          caption: form.caption.trim(),
          visual_direction: form.visual_direction.trim(),
          cta: form.cta.trim() || null,
          cross_post: form.cross_post,
          month: monthKey,
          scheduled_date: form.scheduled_date || null,
          status: form.status,
        }]),
      });
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
            <h2 className="text-lg font-extrabold text-gray-900">Add a post</h2>
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
                {PILLARS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Format</label>
              <select value={form.format} onChange={e => set("format", e.target.value)} className={inputCls}>
                {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* Tone register */}
          <div>
            <label className={labelCls}>Tone register</label>
            <select value={form.tone_register} onChange={e => set("tone_register", e.target.value)} className={inputCls}>
              {TONE_REGISTERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Caption */}
          <div>
            <label className={labelCls}>Caption *</label>
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
            <label className={labelCls}>Visual direction *</label>
            <textarea
              value={form.visual_direction}
              onChange={e => set("visual_direction", e.target.value)}
              placeholder="What should the image or video show?"
              rows={2}
              className={`${inputCls} resize-none font-light`}
            />
          </div>

          {/* CTA */}
          <div>
            <label className={labelCls}>CTA <span className="text-gray-300 normal-case font-normal">(optional)</span></label>
            <input
              type="text"
              value={form.cta}
              onChange={e => set("cta", e.target.value)}
              placeholder="e.g. Book now at virtuferries.com"
              className={inputCls}
            />
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

  if (loadedMonth !== monthKey && !loading) {
    fetchPosts(monthKey);
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
            onCardClick={setSelectedPost}
          />
        )}
      </div>

      {/* Card Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <CardDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />
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
    </div>
  );
}
