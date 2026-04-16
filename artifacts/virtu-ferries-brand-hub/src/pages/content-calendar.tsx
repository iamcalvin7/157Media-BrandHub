import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, X, AlertTriangle,
  CheckCircle2, XCircle, Clock, Archive, Facebook,
  Instagram, Globe, Loader2, CalendarDays, ExternalLink
} from "lucide-react";
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

function firstDayOfMonth(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
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

// ─── Calendar Card (small, shown in grid) ────────────────────────────────────

function CalendarCard({ post, onClick }: { post: ContentPost; onClick: () => void }) {
  const sc = statusConfig(post.status);
  const Icon = sc.icon;
  const PlatIcon = platformIcon(post.platform);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border border-gray-100 bg-white p-2 hover:border-[#1e82b4]/30 hover:shadow-sm transition-all duration-150 group"
    >
      <div className="flex items-center gap-1 mb-1.5 flex-wrap">
        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", marketBadge(post.market))}>
          {marketShort(post.market)}
        </span>
        <PlatIcon className="w-3 h-3 text-gray-400" />
        <span className={cn("ml-auto text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1", sc.color)}>
          <Icon className="w-2.5 h-2.5" />
          {sc.label}
        </span>
      </div>
      <p className="text-[11px] text-gray-700 font-medium leading-tight line-clamp-2 group-hover:text-gray-900">
        {post.pillar}
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5 truncate">{post.format}</p>
    </button>
  );
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

// ─── Calendar Grid ────────────────────────────────────────────────────────────

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function CalendarGrid({
  year, month, posts, onCardClick,
}: {
  year: number;
  month: number;
  posts: ContentPost[];
  onCardClick: (post: ContentPost) => void;
}) {
  const total = daysInMonth(year, month);
  const startOffset = firstDayOfMonth(year, month);
  const monthKey = toMonthKey(year, month);

  const postsByDate: Record<string, ContentPost[]> = {};
  for (const p of posts) {
    const key = p.scheduled_date ?? "unscheduled";
    if (!postsByDate[key]) postsByDate[key] = [];
    postsByDate[key].push(p);
  }

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const unscheduled = posts.filter(p => !p.scheduled_date);

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-gray-200 mb-0">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 border-l border-gray-100">
        {cells.map((day, idx) => {
          const dateStr = day ? `${monthKey}-${String(day).padStart(2, "0")}` : null;
          const dayPosts = dateStr ? (postsByDate[dateStr] ?? []) : [];
          const isToday = isCurrentMonth && day === today.getDate();

          return (
            <div
              key={idx}
              className={cn(
                "min-h-[110px] border-b border-r border-gray-100 p-1.5",
                !day && "bg-gray-50/50",
              )}
            >
              {day && (
                <>
                  <div className={cn(
                    "text-xs font-semibold mb-1.5 w-6 h-6 flex items-center justify-center rounded-full",
                    isToday ? "bg-[#1e82b4] text-white" : "text-gray-400"
                  )}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayPosts.map(post => (
                      <CalendarCard key={post.id} post={post} onClick={() => onCardClick(post)} />
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {unscheduled.length > 0 && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
          <div className="flex items-center gap-2 text-amber-700 mb-3">
            <AlertTriangle className="w-3.5 h-3.5" />
            <p className="text-xs font-semibold uppercase tracking-wider">
              {unscheduled.length} post{unscheduled.length > 1 ? "s" : ""} without a scheduled date
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map(post => (
              <button
                key={post.id}
                onClick={() => onCardClick(post)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border transition-colors",
                  marketBadge(post.market),
                  "border-current/20 hover:opacity-80"
                )}
              >
                {marketShort(post.market)} · {post.pillar}
              </button>
            ))}
          </div>
        </div>
      )}
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
            <div className="flex items-center gap-3 text-[11px] text-gray-400">
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
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        {posts.length === 0 && !loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <CalendarDays className="w-12 h-12 text-gray-200 mb-4" />
            <p className="text-gray-500 font-semibold">No posts for {monthLabel(year, month)}</p>
            <p className="text-sm text-gray-400 mt-1">
              Use <span className="font-medium text-gray-500">Monthly Planning</span> to generate and approve content for this month.
            </p>
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
    </div>
  );
}
