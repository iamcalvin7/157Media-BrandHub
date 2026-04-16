import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, ChevronRight, Loader2, CheckCircle2, XCircle,
  AlertTriangle, Facebook, Instagram, Globe, CalendarDays,
  RefreshCw, Zap, ClipboardList, ThumbsUp, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GeneratedPost {
  scheduled_date: string;
  platform: string;
  pillar: string;
  format: string;
  tone_register: string;
  caption: string;
  visual_direction: string;
  cta: string | null;
  cross_post: boolean;
  market: string;
}

type ReviewDecision = "approve" | "reject" | null;

interface ReviewPost extends GeneratedPost {
  _id: string;
  decision: ReviewDecision;
  rejectionNote: string;
  expanded: boolean;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Knowledge", icon: Brain },
  { id: 2, label: "Briefing", icon: ClipboardList },
  { id: 3, label: "Generate", icon: Zap },
  { id: 4, label: "Approve", icon: ThumbsUp },
];

const PILLARS = [
  { num: "01", title: "Why VF", desc: "The crossing as the obvious, easy choice — speed, comfort, car option." },
  { num: "02", title: "Why Sicily", desc: "Sells the destination. If they want Sicily, VF is the natural next step." },
  { num: "03", title: "VF Recommends", desc: "Curated local intel. VF as trusted guide, not ticket seller." },
  { num: "04", title: "Virtu Ferries Experience", desc: "On-board, crew, UGC, social proof. Real people, real crossings." },
  { num: "05", title: "Sicily Experience", desc: "Immersive, sensory — no hard sell. Let the island do the talking." },
];

const OFFERS_SNAPSHOT = [
  { name: "One Day Offer", detail: "Adult return €63.60 · Child €44.60 · Light car €109 · Motorbike €69" },
  { name: "More Than One Day", detail: "Adult return €63.60 · Light car €109 · Extended to May 30, 2026" },
  { name: "Saturday Night Malta", detail: "€57/person return · 20:30 Sat dep. Pozzallo · 06:30 Sun return · Jan–Apr 2026" },
];

const MARKETS = [
  { label: "English market", channels: "Facebook · 25 posts/month" },
  { label: "Italian market", channels: "Facebook · 25 posts/month + Instagram · 25 posts/month (cross-post where possible)" },
];

function toMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonthKey() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return toMonthKey(d);
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
}

function platformIcon(p: string) {
  if (p === "Facebook") return <Facebook className="w-3.5 h-3.5 text-blue-600" />;
  if (p === "Instagram") return <Instagram className="w-3.5 h-3.5 text-pink-500" />;
  return <Globe className="w-3.5 h-3.5 text-gray-400" />;
}

const pillarColor: Record<string, string> = {
  "why_vf": "#1e82b4",
  "why_sicily": "#1e82b4",
  "vf_recommends": "#f6a610",
  "virtu_ferries_experience": "#e01814",
  "sicily_experience": "#7c3aed",
};

function pillarChipColor(pillar: string): string {
  const key = pillar.toLowerCase().replace(/[\s/]+/g, "_");
  for (const k of Object.keys(pillarColor)) {
    if (key.includes(k.replace(/_/g, ""))) return pillarColor[k];
  }
  return "#6b7280";
}

// ─── Step 1: Knowledge Recap ──────────────────────────────────────────────────

function StepKnowledge({ onNext }: { onNext: () => void }) {
  const [postCount, setPostCount] = useState<number | null>(null);

  useEffect(() => {
    fetch(`${API}/api/content/posts?month=${toMonthKey(new Date())}`)
      .then(r => r.json())
      .then((d: { posts?: unknown[] }) => setPostCount(d.posts?.length ?? 0))
      .catch(() => setPostCount(null));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[#1e82b4]">
          <Brain className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">Step 1 of 4</span>
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900">Brand knowledge loaded</h2>
        <p className="text-gray-500 font-light">This is what the agent is working with. Verify before continuing.</p>
      </div>

      {/* Offers */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Current Offers</p>
        <div className="space-y-2">
          {OFFERS_SNAPSHOT.map(o => (
            <div key={o.name} className="bg-white border border-gray-100 rounded-xl px-5 py-3.5 flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-[#f6a610] mt-1.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-900">{o.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{o.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pillars */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Content Pillars</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PILLARS.map(p => (
            <div key={p.num} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex gap-3">
              <span className="text-xs font-bold text-gray-300 font-mono pt-0.5">{p.num}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{p.title}</p>
                <p className="text-xs text-gray-400 font-light">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Markets */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Markets & Channels</p>
        <div className="grid grid-cols-2 gap-2">
          {MARKETS.map(m => (
            <div key={m.label} className="bg-white border border-gray-100 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">{m.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{m.channels}</p>
            </div>
          ))}
        </div>
      </div>

      {postCount !== null && postCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-5 py-3.5 text-amber-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {postCount} post{postCount > 1 ? "s" : ""} already exist in the current month's calendar.
        </div>
      )}

      <Button onClick={onNext} className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white font-semibold px-6 rounded-xl">
        Knowledge looks good — continue
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </motion.div>
  );
}

// ─── Step 2: Briefing Form ─────────────────────────────────────────────────────

interface BriefingData {
  month: string;
  market: string;
  offers: string;
  events: string;
  campaigns: string;
  hooks: string;
  other: string;
}

function StepBriefing({ onNext, onBack }: { onNext: (data: BriefingData) => void; onBack: () => void }) {
  const [form, setForm] = useState<BriefingData>({
    month: nextMonthKey(),
    market: "Both",
    offers: "",
    events: "",
    campaigns: "",
    hooks: "",
    other: "",
  });

  function set(key: keyof BriefingData, val: string) {
    setForm(f => ({ ...f, [key]: val }));
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[#f6a610]">
          <ClipboardList className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">Step 2 of 4</span>
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900">What's changed this month?</h2>
        <p className="text-gray-500 font-light">Tell the agent what's new. Leave anything blank that hasn't changed.</p>
      </div>

      <div className="space-y-5">
        {/* Month + Market */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Month</label>
            <input
              type="month"
              value={form.month}
              onChange={e => set("month", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/20 focus:border-[#1e82b4] bg-white"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Market</label>
            <select
              value={form.market}
              onChange={e => set("market", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/20 focus:border-[#1e82b4] bg-white"
            >
              <option value="English">English market</option>
              <option value="Italian">Italian market</option>
            </select>
          </div>
        </div>

        {/* Fields */}
        {[
          { key: "offers" as const, label: "New or changed offers", placeholder: "e.g. One Day offer now includes Motorbike for €55 · SNF extended to June" },
          { key: "events" as const, label: "Events in Malta or Sicily", placeholder: "e.g. Malta Arts Festival 5–15 June · Infiorata di Noto 1 June" },
          { key: "campaigns" as const, label: "Campaigns or partnerships", placeholder: "e.g. Collaboration with VisitMalta · Summer 2026 campaign launch" },
          { key: "hooks" as const, label: "Seasonal hooks or news", placeholder: "e.g. Summer school holidays starting · Peak season pricing begins" },
          { key: "other" as const, label: "Anything else", placeholder: "Format restrictions, pillar priorities, tone notes, reminders…" },
        ].map(f => (
          <div key={f.key} className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{f.label}</label>
            <textarea
              value={form[f.key]}
              onChange={e => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/20 focus:border-[#1e82b4] bg-white resize-none font-light"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 font-medium">
          ← Back
        </button>
        <Button
          onClick={() => onNext(form)}
          disabled={!form.month}
          className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white font-semibold px-6 rounded-xl"
        >
          Build my {form.month ? monthLabel(form.month) : ""} calendar
          <Zap className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Step 3: Generating ────────────────────────────────────────────────────────

const LOADING_LINES = [
  "Reloading brand guidelines and pillars…",
  "Scanning approval history and learned preferences…",
  "Checking the Mediterranean cultural calendar…",
  "Mapping 25 posts across the month…",
  "Writing English market captions…",
  "Writing Italian market captions…",
  "Deciding Instagram cross-post strategy…",
  "Writing IG-specific posts where needed…",
  "Reviewing pillar balance across the month…",
  "Reviewing tone variety and avoiding repeats…",
  "Applying approval learnings…",
  "Finalising and validating the plan…",
];

function StepGenerating({ briefing, onDone, onError }: {
  briefing: BriefingData;
  onDone: (plan: { missed_windows: string[]; posts: ReviewPost[] }) => void;
  onError: (msg: string) => void;
}) {
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setLineIdx(i => Math.min(i + 1, LOADING_LINES.length - 1)), 9000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 min hard timeout

    const body = {
      month: briefing.month,
      market: briefing.market,
      offers: briefing.offers || undefined,
      events: briefing.events || undefined,
      campaigns: [briefing.campaigns, briefing.hooks].filter(Boolean).join(" | ") || undefined,
      other: briefing.other || undefined,
    };

    fetch(`${API}/api/content/generate-plan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then(r => r.json())
      .then((d: { missed_windows?: string[]; english_plan?: GeneratedPost[]; italian_plan?: GeneratedPost[]; error?: string }) => {
        if (d.error) { onError(d.error); return; }
        const all = [...(d.english_plan ?? []), ...(d.italian_plan ?? [])];
        const posts: ReviewPost[] = all
          .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
          .map((p, i) => ({ ...p, _id: `post-${i}`, decision: null, rejectionNote: "", expanded: false }));
        onDone({ missed_windows: d.missed_windows ?? [], posts });
      })
      .catch(err => {
        if (err.name === "AbortError") {
          onError("The request took too long. Try selecting a single market instead of Both, or try again.");
        } else {
          onError("Network error — please try again.");
        }
      })
      .finally(() => clearTimeout(timeout));

    return () => { controller.abort(); clearTimeout(timeout); };
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[#e01814]">
          <Zap className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">Step 3 of 4</span>
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900">Building your calendar…</h2>
        <p className="text-gray-500 font-light">The agent is reading all brand context and writing the full month.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-8 space-y-6">
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-[#1e82b4]/10 flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-[#1e82b4] animate-spin" />
            </div>
          </div>
        </div>
        <div className="text-center space-y-2">
          <AnimatePresence mode="wait">
            <motion.p
              key={lineIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-sm text-gray-500 font-light"
            >
              {LOADING_LINES[lineIdx]}
            </motion.p>
          </AnimatePresence>
          <div className="flex items-center justify-center gap-1">
            {LOADING_LINES.map((_, i) => (
              <div key={i} className={cn("h-1 rounded-full transition-all duration-500", i <= lineIdx ? "w-5 bg-[#1e82b4]" : "w-1.5 bg-gray-200")} />
            ))}
          </div>
        </div>
        <div className="border-t border-gray-50 pt-4 space-y-2">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold text-center">Planning for</p>
          <p className="text-center text-sm font-semibold text-gray-900">{monthLabel(briefing.month)} · {briefing.market === "Both" ? "English + Italian" : `${briefing.market} market`}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Step 4: Approve ──────────────────────────────────────────────────────────

function PostCard({ post, onChange }: {
  post: ReviewPost;
  onChange: (updates: Partial<ReviewPost>) => void;
}) {
  const chipColor = pillarChipColor(post.pillar);
  const dateFormatted = new Date(post.scheduled_date + "T12:00:00").toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short",
  });

  return (
    <div className={cn(
      "bg-white border rounded-2xl overflow-hidden transition-all",
      post.decision === "approve" ? "border-green-200 shadow-green-50 shadow-sm" :
      post.decision === "reject" ? "border-red-200 shadow-red-50 shadow-sm" :
      "border-gray-100 hover:border-gray-200"
    )}>
      {/* Status bar */}
      <div className={cn(
        "h-1",
        post.decision === "approve" ? "bg-green-400" :
        post.decision === "reject" ? "bg-red-400" : "bg-gray-100"
      )} />

      <div className="p-5 space-y-4">
        {/* Meta row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
              <CalendarDays className="w-3 h-3" />
              {dateFormatted}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
              {platformIcon(post.platform)}
              {post.platform}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: `${chipColor}15`, color: chipColor }}>
              {post.pillar}
            </span>
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
              {post.format}
            </span>
            <span className="text-xs text-gray-400">{post.market}</span>
          </div>

          {/* Approve / Reject */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onChange({ decision: post.decision === "approve" ? null : "approve" })}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                post.decision === "approve"
                  ? "bg-green-500 text-white"
                  : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve
            </button>
            <button
              onClick={() => onChange({ decision: post.decision === "reject" ? null : "reject", expanded: post.decision === "reject" ? post.expanded : true })}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                post.decision === "reject"
                  ? "bg-red-500 text-white"
                  : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
              )}
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>
          </div>
        </div>

        {/* Caption */}
        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Caption</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{post.caption}</p>
        </div>

        {/* Expand for more detail */}
        <button
          onClick={() => onChange({ expanded: !post.expanded })}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-medium"
        >
          {post.expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {post.expanded ? "Less detail" : "More detail"}
        </button>

        <AnimatePresence>
          {post.expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">Visual direction</p>
                  <p className="text-sm text-gray-700 font-light">{post.visual_direction}</p>
                </div>
                {post.cta && (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">CTA</p>
                    <p className="text-sm text-gray-700 font-light">{post.cta}</p>
                  </div>
                )}
              </div>
              {post.cross_post && (
                <div className="text-xs text-[#1e82b4] bg-[#1e82b4]/5 border border-[#1e82b4]/15 rounded-xl px-4 py-2">
                  ✦ Flagged for cross-post
                </div>
              )}
              {post.decision === "reject" && (
                <div>
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest block mb-1.5">
                    Rejection reason (helps the agent learn)
                  </label>
                  <input
                    type="text"
                    value={post.rejectionNote}
                    onChange={e => onChange({ rejectionNote: e.target.value })}
                    placeholder="e.g. Too promotional for this week, caption too long…"
                    className="w-full text-sm border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 bg-white placeholder:text-gray-300"
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepApprove({
  posts,
  setPosts,
  missedWindows,
  briefing,
  onDone,
  onBack,
}: {
  posts: ReviewPost[];
  setPosts: (fn: (prev: ReviewPost[]) => ReviewPost[]) => void;
  missedWindows: string[];
  briefing: BriefingData;
  onDone: () => void;
  onBack: () => void;
}) {
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [error, setError] = useState("");

  const approved = posts.filter(p => p.decision === "approve");
  const rejected = posts.filter(p => p.decision === "reject");
  const pending = posts.filter(p => p.decision === null);

  function update(id: string, updates: Partial<ReviewPost>) {
    setPosts(prev => prev.map(p => p._id === id ? { ...p, ...updates } : p));
  }

  function approveAll() {
    setPosts(prev => prev.map(p => p.decision === null ? { ...p, decision: "approve" } : p));
  }

  async function commit() {
    if (approved.length === 0) return;
    setCommitting(true);
    setError("");

    try {
      for (const post of approved) {
        await fetch(`${API}/api/content/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            market: post.market,
            platform: post.platform,
            pillar: post.pillar,
            tone_register: post.tone_register,
            format: post.format,
            caption: post.caption,
            visual_direction: post.visual_direction,
            cta: post.cta,
            cross_post: post.cross_post,
            month: briefing.month,
            scheduled_date: post.scheduled_date,
            status: "approved",
          }),
        });
      }

      setCommitted(true);
      setTimeout(onDone, 1200);
    } catch {
      setError("Failed to save some posts. Please try again.");
    } finally {
      setCommitting(false);
    }
  }

  if (committed) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-20 gap-5 text-center">
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-gray-900">{approved.length} posts saved</h3>
          <p className="text-gray-400 font-light mt-1">Your {monthLabel(briefing.month)} calendar is ready.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-green-600">
          <ThumbsUp className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">Step 4 of 4</span>
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900">Review & approve</h2>
        <p className="text-gray-500 font-light">{posts.length} posts generated for {monthLabel(briefing.month)}. Approve the ones you want saved to the calendar.</p>
      </div>

      {/* Missed windows */}
      {missedWindows.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" />
            {missedWindows.length} cultural window{missedWindows.length > 1 ? "s" : ""} the agent flagged
          </div>
          <ul className="space-y-1">
            {missedWindows.map((w, i) => (
              <li key={i} className="text-sm text-amber-600 font-light flex gap-2">
                <span className="opacity-40">—</span>{w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Stats + bulk actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-green-600 font-semibold">
            <CheckCircle2 className="w-4 h-4" /> {approved.length} approved
          </span>
          <span className="flex items-center gap-1.5 text-red-500 font-semibold">
            <XCircle className="w-4 h-4" /> {rejected.length} rejected
          </span>
          <span className="text-gray-400">{pending.length} pending</span>
        </div>
        {pending.length > 0 && (
          <button onClick={approveAll} className="text-xs text-[#1e82b4] hover:underline font-medium">
            Approve all remaining
          </button>
        )}
      </div>

      {/* Post list */}
      <div className="space-y-4">
        {posts.map(post => (
          <PostCard key={post._id} post={post} onChange={updates => update(post._id, updates)} />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 font-medium">
          ← Back to briefing
        </button>
        <Button
          onClick={commit}
          disabled={approved.length === 0 || committing}
          className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white font-semibold px-6 rounded-xl disabled:opacity-50"
        >
          {committing ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</>
          ) : (
            <>Save {approved.length} approved post{approved.length !== 1 ? "s" : ""} to calendar</>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MonthlyPlanning() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [plan, setPlan] = useState<{ missed_windows: string[]; posts: ReviewPost[] } | null>(null);
  const [genError, setGenError] = useState("");

  function updatePost(fn: (prev: ReviewPost[]) => ReviewPost[]) {
    setPlan(p => p ? { ...p, posts: fn(p.posts) } : p);
  }

  function reset() {
    setStep(1);
    setBriefing(null);
    setPlan(null);
    setGenError("");
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-24">

      {/* Header */}
      <div className="relative overflow-hidden border-b border-gray-100 bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-[#1e82b4]/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-14">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#1e82b4]" />
                <span className="text-xs font-semibold text-[#1e82b4] uppercase tracking-widest">Monthly Process</span>
              </div>
              <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900">Content Calendar</h1>
              <p className="text-lg text-gray-500 font-light leading-relaxed max-w-lg">
                A guided four-step process to brief, generate, review, and commit a full month of content.
              </p>
            </div>
            {step > 1 && (
              <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 font-medium flex items-center gap-1 mt-1">
                <RefreshCw className="w-3 h-3" /> Start over
              </button>
            )}
          </div>

          {/* Step indicators */}
          <div className="mt-8 flex items-center gap-0">
            {STEPS.map((s, i) => {
              const active = s.id === step;
              const done = s.id < step;
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center">
                  <div className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all",
                    active ? "bg-[#1e82b4] text-white" :
                    done ? "text-green-600 bg-green-50" :
                    "text-gray-300 bg-transparent"
                  )}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn("w-8 h-px mx-1", done ? "bg-green-300" : "bg-gray-200")} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-3xl mx-auto px-6 md:px-10 pt-12">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" exit={{ opacity: 0, y: -8 }}>
              <StepKnowledge onNext={() => setStep(2)} />
            </motion.div>
          )}
          {step === 2 && (
            <motion.div key="s2" exit={{ opacity: 0, y: -8 }}>
              <StepBriefing
                onNext={data => { setBriefing(data); setStep(3); }}
                onBack={() => setStep(1)}
              />
            </motion.div>
          )}
          {step === 3 && briefing && (
            <motion.div key="s3" exit={{ opacity: 0, y: -8 }}>
              {genError ? (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4 text-sm text-red-600">{genError}</div>
                  <Button onClick={() => { setGenError(""); setStep(3); }} className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white rounded-xl">
                    Try again
                  </Button>
                </div>
              ) : (
                <StepGenerating
                  briefing={briefing}
                  onDone={result => { setPlan(result); setStep(4); }}
                  onError={msg => setGenError(msg)}
                />
              )}
            </motion.div>
          )}
          {step === 4 && plan && briefing && (
            <motion.div key="s4" exit={{ opacity: 0, y: -8 }}>
              <StepApprove
                posts={plan.posts}
                setPosts={updatePost}
                missedWindows={plan.missed_windows}
                briefing={briefing}
                onDone={reset}
                onBack={() => setStep(2)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
