import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, ChevronRight, Loader2, CheckCircle2, XCircle,
  AlertTriangle, Facebook, Instagram, Globe, CalendarDays,
  RefreshCw, Lightbulb, PenLine, ThumbsUp, ChevronDown, ChevronUp,
  Pin, Plus, Trash2, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ──────────────────────────────────────────────────────────────────

interface IdeaItem {
  scheduled_date: string;
  platform: string;
  pillar: string;
  format: string;
  tone_register: string;
  visual_direction: string;
  hook: string;
  cross_post: boolean;
  market: string;
  pinned?: boolean;
}

interface ReviewIdea extends IdeaItem {
  _id: string;
  kept: boolean;
}

interface FinalPost extends IdeaItem {
  _id: string;
  caption: string;
  cta: string | null;
  decision: "approve" | "reject" | null;
  expanded: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Knowledge", icon: Brain },
  { id: 2, label: "Briefing", icon: CalendarDays },
  { id: 3, label: "Ideas", icon: Lightbulb },
  { id: 4, label: "Review", icon: CheckCircle2 },
  { id: 5, label: "Copy", icon: PenLine },
  { id: 6, label: "Approve", icon: ThumbsUp },
];

const PILLARS_ENGLISH = [
  { num: "01", title: "Why VF", desc: "The crossing as the obvious, easy choice — speed, comfort, car option." },
  { num: "02", title: "Why Sicily", desc: "Sells Sicily to Maltese travellers. If they want Sicily, VF is the natural next step." },
  { num: "03", title: "VF Recommends", desc: "Curated Sicily insider tips — restaurants, towns, trails, events. VF as trusted guide." },
  { num: "04", title: "Virtu Ferries Experience", desc: "On-board, crew, UGC, social proof. Real people, real crossings." },
  { num: "05", title: "Sicily Experience", desc: "Immersive, sensory Sicily content for Maltese travellers. No hard sell." },
];

const PILLARS_ITALIAN = [
  { num: "01", title: "Why VF", desc: "The crossing from Sicily to Malta as the obvious, easy choice." },
  { num: "02", title: "Why Malta", desc: "Sells Malta to Sicilians — Valletta, Gozo, beaches, history, events. The discovery they didn't know they needed." },
  { num: "03", title: "VF Recommends Malta", desc: "Curated Malta insider tips — beaches, Valletta restaurants, Mdina, Gozo day trips, Maltese food. For a Sicilian visitor." },
  { num: "04", title: "Virtu Ferries Experience", desc: "On-board, crew, UGC, social proof from Italian/Sicilian passengers." },
  { num: "05", title: "Malta Experience", desc: "Immersive, sensory Malta content for Sicilians — Valletta colours, Maltese food, sea, light. No hard sell." },
];

const OFFERS_SNAPSHOT = [
  { name: "One Day Offer", detail: "Adult return €63.60 · Child €44.60 · Light car €109 · Motorbike €69" },
  { name: "More Than One Day", detail: "Adult return €63.60 · Light car €109 · Extended to May 30, 2026" },
  { name: "Saturday Night Malta", detail: "€57/person return · 20:30 Sat dep. Pozzallo · 06:30 Sun return · Jan–Apr 2026" },
];

const MARKETS = [
  { label: "English market", channels: "Facebook (English) · 25 posts/month + Instagram (English, Maltese audience) · 25 posts/month" },
  { label: "Italian market", channels: "Facebook (Italian) · 25 posts/month · Facebook only" },
];

const IDEAS_LOADING = [
  "Reading brand guidelines and approval history…",
  "Checking the Mediterranean cultural calendar…",
  "Mapping 25 posts across the month…",
  "Building pillar balance across the schedule…",
  "Assigning formats, tones, and visual directions…",
  "Deciding Instagram cross-post strategy…",
  "Finalising the idea plan…",
];

const COPY_LOADING = [
  "Reading all approved ideas…",
  "Writing Facebook captions…",
  "Applying brand tone and platform voice…",
  "Writing Instagram captions where needed…",
  "Reviewing copy against brand guidelines…",
  "Finalising all captions…",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

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
function pillarChipColor(pillar: string): string {
  const p = pillar.toLowerCase();
  if (p.includes("why vf") || p.includes("why_vf")) return "#1e82b4";
  if (p.includes("why sicily") || p.includes("why sicily") || p.includes("why malta")) return "#1e82b4";
  if (p.includes("recommends")) return "#f6a610";
  if (p.includes("experience")) return "#e01814";
  return "#7c3aed";
}

interface BriefingData {
  month: string; market: string; offers: string;
  selected_events: EventItem[]; extra_events: string;
  campaigns: string; hooks: string; other: string;
  trending_format: string;
  user_ideas: string[];
}

interface EventItem {
  id: number; title: string; date: string; end_date: string | null;
  type: string; market: string; recurring: boolean; notes: string | null;
}

// ─── Event Picker ─────────────────────────────────────────────────────────────

function typeColor(type: string) {
  if (type === "holiday") return "#e01814";
  if (type === "festival") return "#7c3aed";
  if (type === "seasonal") return "#f6a610";
  return "#1e82b4";
}

function fmtEventDate(date: string, end_date: string | null) {
  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return end_date && end_date !== date ? `${fmt(date)} – ${fmt(end_date)}` : fmt(date);
}

function EventRow({ e, checked, onToggle }: { e: EventItem; checked: boolean; onToggle: (ev: EventItem) => void }) {
  const color = typeColor(e.type);
  return (
    <button
      type="button"
      onClick={() => onToggle(e)}
      className={cn(
        "w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all",
        checked ? "border-[#1e82b4]/30 bg-[#1e82b4]/5" : "border-gray-100 bg-white hover:border-gray-200"
      )}
    >
      <div className={cn(
        "mt-0.5 w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
        checked ? "bg-[#1e82b4] border-[#1e82b4]" : "border-gray-300"
      )}>
        {checked && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-800 leading-tight">{e.title}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{fmtEventDate(e.date, e.end_date)}{e.recurring ? " · annual" : ""}</p>
      </div>
      <span className="ml-auto shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
        style={{ backgroundColor: `${color}15`, color }}>
        {e.type}
      </span>
    </button>
  );
}

function EventPicker({
  planMonth, market, selected, onChange,
}: {
  planMonth: string; market: string; selected: EventItem[]; onChange: (events: EventItem[]) => void;
}) {
  const [events, setEvents] = useState<EventItem[]>([]);

  const [planYear, planMon] = planMonth.split("-").map(Number);
  const refDate = new Date(planYear, planMon - 2, 1);
  const refYear = refDate.getFullYear();
  const refMon = refDate.getMonth() + 1;

  useEffect(() => {
    const years = new Set([planYear, refYear]);
    Promise.all([...years].map(y => fetch(`${API}/api/events?year=${y}`).then(r => r.json())))
      .then(results => {
        const all: EventItem[] = results.flat();
        const seen = new Set<number>();
        const unique = all.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; });
        setEvents(unique);
      })
      .catch(() => {});
  }, [planMonth]);

  const mktFilter = market === "Italian" ? ["italian", "both"] : ["english", "both"];
  const selectedIds = selected.map(e => e.id);

  function eventsForMonth(year: number, mon: number) {
    const prefix = `${year}-${String(mon).padStart(2, "0")}`;
    return events.filter(e => {
      if (!mktFilter.includes(e.market)) return false;
      const effectiveYear = e.recurring ? year : parseInt(e.date.split("-")[0]);
      const mm = e.date.split("-")[1];
      const dd = e.date.split("-")[2];
      const projected = `${effectiveYear}-${mm}-${dd}`;
      const end = e.end_date
        ? `${effectiveYear}-${e.end_date.split("-")[1]}-${e.end_date.split("-")[2]}`
        : projected;
      return projected.startsWith(prefix) || end.startsWith(prefix) ||
        (projected <= prefix + "-31" && end >= prefix + "-01");
    });
  }

  function toggle(ev: EventItem) {
    if (selectedIds.includes(ev.id)) {
      onChange(selected.filter(e => e.id !== ev.id));
    } else {
      onChange([...selected, ev]);
    }
  }

  const refEvents = eventsForMonth(refYear, refMon);
  const planEvents = eventsForMonth(planYear, planMon);
  const refLabel = new Date(refYear, refMon - 1, 1).toLocaleString("en-GB", { month: "long" });
  const planLabel = new Date(planYear, planMon - 1, 1).toLocaleString("en-GB", { month: "long" });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{refLabel} <span className="font-normal text-gray-300">· this month</span></p>
          {refEvents.length === 0
            ? <p className="text-xs text-gray-300 italic px-3 py-2">No library events</p>
            : refEvents.map(e => <EventRow key={e.id} e={e} checked={selectedIds.includes(e.id)} onToggle={toggle} />)
          }
        </div>
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{planLabel} <span className="font-normal text-gray-300">· planning month</span></p>
          {planEvents.length === 0
            ? <p className="text-xs text-gray-300 italic px-3 py-2">No library events</p>
            : planEvents.map(e => <EventRow key={e.id} e={e} checked={selectedIds.includes(e.id)} onToggle={toggle} />)
          }
        </div>
      </div>
      {selectedIds.length > 0 && (
        <p className="text-[10px] text-[#1e82b4] font-semibold">
          {selectedIds.length} event{selectedIds.length > 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
}

// ─── Loading Step ─────────────────────────────────────────────────────────

function LoadingStep({
  lines, label, onDone, onError, fetch: doFetch,
}: {
  lines: string[];
  label: string;
  onDone: (data: unknown) => void;
  onError: (msg: string) => void;
  fetch: () => Promise<Response>;
}) {
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setLineIdx(i => Math.min(i + 1, lines.length - 1)), 8000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);

    doFetch()
      .then(r => r.json())
      .then((d: { error?: string }) => {
        if (d.error) { onError(d.error); return; }
        onDone(d);
      })
      .catch(err => {
        if (err.name === "AbortError") onError("The request took too long — please try again.");
        else onError("Network error — please try again.");
      })
      .finally(() => clearTimeout(timeout));

    return () => { controller.abort(); clearTimeout(timeout); };
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="bg-white border border-gray-100 rounded-2xl p-10 space-y-6">
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1e82b4]/10 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-[#1e82b4] animate-spin" />
          </div>
        </div>
        <div className="text-center space-y-3">
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={lineIdx}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="text-sm text-gray-400 font-light"
            >
              {lines[lineIdx]}
            </motion.p>
          </AnimatePresence>
          <div className="flex items-center justify-center gap-1">
            {lines.map((_, i) => (
              <div key={i} className={cn("h-1 rounded-full transition-all duration-500", i <= lineIdx ? "w-5 bg-[#1e82b4]" : "w-1.5 bg-gray-200")} />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Step 1: Knowledge ────────────────────────────────────────────────────

function StepKnowledge({ onNext }: { onNext: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[#1e82b4]">
          <Brain className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">Step 1 of 6</span>
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900">Brand knowledge loaded</h2>
        <p className="text-gray-500 font-light">This is what the agent is working with. Verify before continuing.</p>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Current Offers</p>
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

      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Content Pillars — English Market</p>
        <p className="text-xs text-gray-400 -mt-1">Selling <strong>Sicily</strong> to Maltese &amp; international travellers.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PILLARS_ENGLISH.map(p => (
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

      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Content Pillars — Italian Market</p>
        <p className="text-xs text-gray-400 -mt-1">Selling <strong>Malta</strong> to Sicilian &amp; Italian travellers — do NOT reference Sicilian places.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PILLARS_ITALIAN.map(p => (
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

      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Hard Posting Rules</p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-gray-900">Weekly Schedule — every Saturday</p>
            <p className="text-xs text-gray-500 mt-0.5 font-light">
              Every Saturday, both markets post the ferry schedule for the following week.
              Facebook only — never cross-posted to Instagram.
              Pillar: Why VF · Format: Single Image · Tone: Operational.
              This slot is fixed and counts within the 25-post monthly total.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Markets & Channels</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MARKETS.map(m => (
            <div key={m.label} className="bg-white border border-gray-100 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">{m.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{m.channels}</p>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={onNext} className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white font-semibold px-6 rounded-xl">
        Knowledge looks good — continue
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </motion.div>
  );
}

// ─── Step 2: Briefing ─────────────────────────────────────────────────────

function StepBriefing({ onNext, onBack }: { onNext: (d: BriefingData) => void; onBack: () => void }) {
  const [form, setForm] = useState<BriefingData>({
    month: nextMonthKey(), market: "English",
    offers: "", selected_events: [], extra_events: "",
    campaigns: "", hooks: "", other: "",
    trending_format: "",
    user_ideas: [],
  });
  function set(key: keyof BriefingData, val: string) { setForm(f => ({ ...f, [key]: val })); }

  function addIdea() { setForm(f => ({ ...f, user_ideas: [...f.user_ideas, ""] })); }
  function updateIdea(i: number, val: string) {
    setForm(f => { const next = [...f.user_ideas]; next[i] = val; return { ...f, user_ideas: next }; });
  }
  function removeIdea(i: number) {
    setForm(f => ({ ...f, user_ideas: f.user_ideas.filter((_, idx) => idx !== i) }));
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[#f6a610]">
          <CalendarDays className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">Step 2 of 6</span>
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900">What's changed this month?</h2>
        <p className="text-gray-500 font-light">Leave anything blank that hasn't changed.</p>
      </div>

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Month</label>
            <input type="month" value={form.month} onChange={e => set("month", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/20 focus:border-[#1e82b4] bg-white" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Market</label>
            <select value={form.market} onChange={e => set("market", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/20 focus:border-[#1e82b4] bg-white">
              <option value="English">English market (FB + Instagram · Maltese audience)</option>
              <option value="Italian">Italian market (Facebook only)</option>
            </select>
          </div>
        </div>
        {[
          { key: "offers" as const, label: "New or changed offers", placeholder: "e.g. One Day offer extended · New group rate" },
          { key: "campaigns" as const, label: "Campaigns or partnerships", placeholder: "e.g. Collaboration with VisitMalta" },
          { key: "hooks" as const, label: "Seasonal hooks or news", placeholder: "e.g. Summer school holidays start · peak season pricing" },
          { key: "other" as const, label: "Anything else", placeholder: "Format restrictions, pillar priorities, tone notes…" },
        ].map(f => (
          <div key={f.key} className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{f.label}</label>
            <textarea value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/20 focus:border-[#1e82b4] bg-white resize-none font-light" />
          </div>
        ))}

        {/* Events picker */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-[#1e82b4]" /> Events & moments
            </label>
            <p className="text-[11px] text-gray-400 mt-0.5">Select which events to activate this month. Tick from the previous month too if you want early lead-in posts.</p>
          </div>
          {form.month ? (
            <EventPicker
              planMonth={form.month}
              market={form.market}
              selected={form.selected_events}
              onChange={evs => setForm(f => ({ ...f, selected_events: evs }))}
            />
          ) : (
            <p className="text-xs text-gray-300 italic">Select a month above to see events.</p>
          )}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Additional events not in the library</label>
            <textarea value={form.extra_events} onChange={e => set("extra_events", e.target.value)}
              placeholder="e.g. Malta Arts Festival 5–15 June · local campaign not in the library"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/20 focus:border-[#1e82b4] bg-white resize-none font-light" />
          </div>
        </div>

        {/* Trending format */}
        <div className="space-y-1.5 pt-2 border-t border-gray-100">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#f6a610]" /> Trending format to try
          </label>
          <p className="text-[11px] text-gray-400">Describe a format you've seen working — the AI will adapt it to the brand for one post this month.</p>
          <textarea
            value={form.trending_format}
            onChange={e => set("trending_format", e.target.value)}
            placeholder={`e.g. "What colour do you see? Yellow = you need Vitamin D → come to Malta. Blue = you're already on the ferry ✓" (colour quiz meme) · Poll: would you rather Sicily in 1h or a 2h flight? · POV: you just stepped off the ferry in Valletta`}
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#f6a610]/20 focus:border-[#f6a610] bg-white resize-none font-light"
          />
        </div>

        {/* User ideas */}
        <div className="space-y-3 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5 text-[#1e82b4]" /> Your ideas
              </label>
              <p className="text-xs text-gray-400 mt-0.5">Concepts you already have in mind — these go straight into the plan, and the AI fills the remaining slots independently.</p>
            </div>
          </div>
          {form.user_ideas.length > 0 && (
            <div className="space-y-2">
              {form.user_ideas.map((idea, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 shrink-0 text-[#1e82b4]">
                    <Pin className="w-3 h-3" />
                    <span className="text-[10px] font-bold text-[#1e82b4] font-mono">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <input
                    type="text"
                    value={idea}
                    onChange={e => updateIdea(i, e.target.value)}
                    placeholder="e.g. Behind-the-scenes crew feature · International Dog Day content · Valletta sunset Reel"
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/20 focus:border-[#1e82b4] bg-white font-light"
                  />
                  <button
                    onClick={() => removeIdea(i)}
                    className="p-2 text-gray-300 hover:text-red-400 rounded-xl hover:bg-red-50 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={addIdea}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#1e82b4] hover:text-[#1a6d99] transition-colors py-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add an idea
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 font-medium">← Back</button>
        <Button onClick={() => onNext(form)} disabled={!form.month}
          className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white font-semibold px-6 rounded-xl">
          Generate ideas for {form.month ? monthLabel(form.month) : ""}
          <Lightbulb className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Step 4: Review Ideas ────────────────────────────────────────────────

function IdeaCard({ idea, onChange }: { idea: ReviewIdea; onChange: (u: Partial<ReviewIdea>) => void }) {
  const chipColor = pillarChipColor(idea.pillar);
  const dateFormatted = (() => {
    try { return new Date(idea.scheduled_date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); }
    catch { return idea.scheduled_date; }
  })();

  return (
    <div className={cn(
      "bg-white border rounded-2xl overflow-hidden transition-all",
      idea.kept ? "border-gray-100 hover:border-gray-200" : "border-gray-100 opacity-35"
    )}>
      <div className={cn("h-1", idea.kept ? "bg-[#1e82b4]" : "bg-gray-200")} />
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {idea.pinned && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#1e82b4] bg-[#1e82b4]/10 border border-[#1e82b4]/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                <Pin className="w-2.5 h-2.5" /> Your idea
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
              <CalendarDays className="w-3 h-3" />{dateFormatted}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
              {platformIcon(idea.platform)}{idea.platform}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: `${chipColor}15`, color: chipColor }}>
              {idea.pillar}
            </span>
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">{idea.format}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onChange({ kept: true })}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                idea.kept ? "bg-[#1e82b4] text-white" : "bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100"
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </button>
            <button
              onClick={() => onChange({ kept: false })}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                !idea.kept ? "bg-red-500 text-white" : "bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100"
              )}
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Concept</p>
          <p className="text-sm font-semibold text-gray-800">{idea.hook}</p>
          <p className="text-xs text-gray-400 italic mt-1">{idea.visual_direction}</p>
          <p className="text-[11px] text-gray-400 mt-1">{idea.tone_register} · {idea.format}</p>
        </div>
      </div>
    </div>
  );
}

function StepReviewIdeas({
  ideas, setIdeas, missedWindows, briefing, onNext, onBack,
}: {
  ideas: ReviewIdea[];
  setIdeas: (fn: (prev: ReviewIdea[]) => ReviewIdea[]) => void;
  missedWindows: string[];
  briefing: BriefingData;
  onNext: () => void;
  onBack: () => void;
}) {
  function update(id: string, updates: Partial<ReviewIdea>) {
    setIdeas(prev => prev.map(i => i._id === id ? { ...i, ...updates } : i));
  }

  const kept = ideas.filter(i => i.kept);
  const dropped = ideas.filter(i => !i.kept);

  function keepAll() { setIdeas(prev => prev.map(i => ({ ...i, kept: true }))); }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-[#1e82b4]">
          <CheckCircle2 className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">Step 4 of 6</span>
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900">Approve ideas</h2>
        <p className="text-gray-500 font-light">{ideas.length} ideas for {monthLabel(briefing.month)}. Approve what works, reject what doesn't. Copy gets written only for approved ideas.</p>
      </div>

      {missedWindows.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" />
            {missedWindows.length} cultural window{missedWindows.length > 1 ? "s" : ""} flagged
          </div>
          <ul className="space-y-1">
            {missedWindows.map((w, i) => (
              <li key={i} className="text-sm text-amber-600 font-light flex gap-2"><span className="opacity-40">—</span>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-[#1e82b4] font-semibold">{kept.length} approved</span>
          <span className="text-gray-400">{dropped.length} rejected</span>
        </div>
        {dropped.length > 0 && (
          <button onClick={keepAll} className="text-xs text-[#1e82b4] hover:underline font-medium">Approve all</button>
        )}
      </div>

      <div className="space-y-4">
        {ideas.map(idea => (
          <IdeaCard key={idea._id} idea={idea} onChange={u => update(idea._id, u)} />
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 font-medium">← Back to briefing</button>
        <Button
          onClick={onNext}
          disabled={kept.length === 0}
          className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white font-semibold px-6 rounded-xl disabled:opacity-50"
        >
          Write copy for {kept.length} idea{kept.length !== 1 ? "s" : ""}
          <PenLine className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Step 6: Final Approval ──────────────────────────────────────────────

function FinalPostCard({ post, onChange }: { post: FinalPost; onChange: (u: Partial<FinalPost>) => void }) {
  const chipColor = pillarChipColor(post.pillar);
  const dateFormatted = (() => {
    try { return new Date(post.scheduled_date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); }
    catch { return post.scheduled_date; }
  })();

  return (
    <div className={cn(
      "bg-white border rounded-2xl overflow-hidden transition-all",
      post.decision === "approve" ? "border-green-200" :
      post.decision === "reject" ? "border-red-200" : "border-gray-100 hover:border-gray-200"
    )}>
      <div className={cn("h-1", post.decision === "approve" ? "bg-green-400" : post.decision === "reject" ? "bg-red-400" : "bg-gray-100")} />
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
              <CalendarDays className="w-3 h-3" />{dateFormatted}
            </span>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
              {platformIcon(post.platform)}{post.platform}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: `${chipColor}15`, color: chipColor }}>{post.pillar}</span>
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">{post.format}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => onChange({ decision: post.decision === "approve" ? null : "approve" })}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                post.decision === "approve" ? "bg-green-500 text-white" : "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100")}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
            </button>
            <button onClick={() => onChange({ decision: post.decision === "reject" ? null : "reject" })}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                post.decision === "reject" ? "bg-red-500 text-white" : "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100")}>
              <XCircle className="w-3.5 h-3.5" /> Reject
            </button>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3.5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">Caption</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{post.caption}</p>
        </div>

        <button onClick={() => onChange({ expanded: !post.expanded })}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 font-medium">
          {post.expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {post.expanded ? "Less" : "More detail"}
        </button>

        <AnimatePresence>
          {post.expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
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
                <div className="text-xs text-[#1e82b4] bg-[#1e82b4]/5 border border-[#1e82b4]/15 rounded-xl px-4 py-2 mt-3">
                  ✦ Cross-post to Instagram
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepFinalApproval({
  posts, setPosts, briefing, onDone, onBack,
}: {
  posts: FinalPost[];
  setPosts: (fn: (prev: FinalPost[]) => FinalPost[]) => void;
  briefing: BriefingData;
  onDone: () => void;
  onBack: () => void;
}) {
  const [committing, setCommitting] = useState(false);
  const [committed, setCommitted] = useState(false);
  const [error, setError] = useState("");

  const approved = posts.filter(p => p.decision === "approve");
  const rejected = posts.filter(p => p.decision === "reject");
  const undecided = posts.filter(p => p.decision === null);

  function update(id: string, updates: Partial<FinalPost>) {
    setPosts(prev => prev.map(p => p._id === id ? { ...p, ...updates } : p));
  }
  function approveAll() { setPosts(prev => prev.map(p => p.decision === null ? { ...p, decision: "approve" } : p)); }

  async function commit() {
    if (approved.length === 0) return;
    setCommitting(true); setError("");
    try {
      for (const post of approved) {
        await fetch(`${API}/api/content/posts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            market: post.market, platform: post.platform, pillar: post.pillar,
            tone_register: post.tone_register, format: post.format, caption: post.caption,
            visual_direction: post.visual_direction, cta: post.cta, cross_post: post.cross_post,
            month: briefing.month, scheduled_date: post.scheduled_date, status: "approved",
          }),
        });
      }
      setCommitted(true);
      setTimeout(onDone, 1200);
    } catch {
      setError("Failed to save some posts — please try again.");
    } finally {
      setCommitting(false);
    }
  }

  if (committed) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 gap-5 text-center">
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
          <span className="text-xs font-semibold uppercase tracking-widest">Step 6 of 6</span>
        </div>
        <h2 className="text-2xl font-extrabold text-gray-900">Final approval</h2>
        <p className="text-gray-500 font-light">{posts.length} posts ready. Approve what goes into the calendar.</p>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-green-600 font-semibold"><CheckCircle2 className="w-4 h-4" />{approved.length} approved</span>
          <span className="flex items-center gap-1.5 text-red-500 font-semibold"><XCircle className="w-4 h-4" />{rejected.length} rejected</span>
          <span className="text-gray-400">{undecided.length} undecided</span>
        </div>
        {undecided.length > 0 && (
          <button onClick={approveAll} className="text-xs text-[#1e82b4] hover:underline font-medium">Approve all remaining</button>
        )}
      </div>

      <div className="space-y-4">
        {posts.map(post => (
          <FinalPostCard key={post._id} post={post} onChange={u => update(post._id, u)} />
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-3 text-sm text-red-600">{error}</div>}

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 font-medium">← Back</button>
        <Button onClick={commit} disabled={approved.length === 0 || committing}
          className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white font-semibold px-6 rounded-xl disabled:opacity-50">
          {committing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : <>Save {approved.length} post{approved.length !== 1 ? "s" : ""} to calendar</>}
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────

export default function MonthlyPlanning() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [missedWindows, setMissedWindows] = useState<string[]>([]);
  const [ideas, setIdeas] = useState<ReviewIdea[]>([]);
  const [finalPosts, setFinalPosts] = useState<FinalPost[]>([]);
  const [genError, setGenError] = useState("");

  function updateIdeas(fn: (prev: ReviewIdea[]) => ReviewIdea[]) { setIdeas(fn); }
  function updatePosts(fn: (prev: FinalPost[]) => FinalPost[]) { setFinalPosts(fn); }

  function reset() {
    setStep(1); setBriefing(null); setMissedWindows([]);
    setIdeas([]); setFinalPosts([]); setGenError("");
  }

  function handleIdeasDone(data: unknown) {
    const d = data as { missed_windows?: string[]; ideas?: IdeaItem[] };
    setMissedWindows(d.missed_windows ?? []);
    const sorted = (d.ideas ?? []).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
    setIdeas(sorted.map((idea, i) => ({ ...idea, _id: `idea-${i}`, kept: true })));
    setStep(4);
  }

  function handleCopyDone(data: unknown) {
    const d = data as { posts?: Array<IdeaItem & { caption: string; cta: string | null }> };
    const posts: FinalPost[] = (d.posts ?? []).map((p, i) => ({
      ...p, _id: `post-${i}`, decision: null, expanded: false,
    }));
    setFinalPosts(posts);
    setStep(6);
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
                Brief → generate ideas → approve → write copy → approve.
              </p>
            </div>
            {step > 1 && (
              <button onClick={reset} className="text-xs text-gray-400 hover:text-gray-600 font-medium flex items-center gap-1 mt-1">
                <RefreshCw className="w-3 h-3" /> Start over
              </button>
            )}
          </div>

          {/* Step indicators */}
          <div className="mt-8 flex items-center gap-0 flex-wrap">
            {STEPS.map((s, i) => {
              const active = s.id === step;
              const done = s.id < step;
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center">
                  <div className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                    active ? "bg-[#1e82b4] text-white" :
                    done ? "text-green-600 bg-green-50" : "text-gray-300"
                  )}>
                    {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn("w-5 h-px mx-0.5", done ? "bg-green-300" : "bg-gray-200")} />
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#e01814]">
                    <Lightbulb className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-widest">Step 3 of 6</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-gray-900">Generating ideas…</h2>
                  <p className="text-gray-500 font-light">The agent is building the idea plan — no copy yet, just concepts.</p>
                </div>
                {genError ? (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4 text-sm text-red-600">{genError}</div>
                    <Button onClick={() => { setGenError(""); setStep(3); }} className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white rounded-xl">Try again</Button>
                  </div>
                ) : (
                  <LoadingStep
                    lines={IDEAS_LOADING}
                    label={`Building ${monthLabel(briefing.month)} idea plan — ${briefing.market} market`}
                    onDone={handleIdeasDone}
                    onError={msg => setGenError(msg)}
                    fetch={() => fetch(`${API}/api/content/generate-ideas`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        month: briefing.month, market: briefing.market,
                        offers: briefing.offers || undefined,
                        events: [
                          ...briefing.selected_events.map(e =>
                            `${e.title} [${fmtEventDate(e.date, e.end_date)}${e.recurring ? ", annual" : ""}]`
                          ),
                          briefing.extra_events,
                        ].filter(Boolean).join(" · ") || undefined,
                        campaigns: [briefing.campaigns, briefing.hooks].filter(Boolean).join(" | ") || undefined,
                        other: briefing.other || undefined,
                        trending_format: briefing.trending_format || undefined,
                        user_ideas: briefing.user_ideas.filter(i => i.trim()) || undefined,
                      }),
                    })}
                  />
                )}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="s4" exit={{ opacity: 0, y: -8 }}>
              <StepReviewIdeas
                ideas={ideas}
                setIdeas={updateIdeas}
                missedWindows={missedWindows}
                briefing={briefing!}
                onNext={() => setStep(5)}
                onBack={() => setStep(2)}
              />
            </motion.div>
          )}

          {step === 5 && briefing && (
            <motion.div key="s5" exit={{ opacity: 0, y: -8 }}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#7c3aed]">
                    <PenLine className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-widest">Step 5 of 6</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-gray-900">Writing copy…</h2>
                  <p className="text-gray-500 font-light">Writing captions for {ideas.filter(i => i.kept).length} approved ideas.</p>
                </div>
                {genError ? (
                  <div className="space-y-4">
                    <div className="bg-red-50 border border-red-100 rounded-xl px-5 py-4 text-sm text-red-600">{genError}</div>
                    <Button onClick={() => { setGenError(""); setStep(5); }} className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white rounded-xl">Try again</Button>
                  </div>
                ) : (
                  <LoadingStep
                    lines={COPY_LOADING}
                    label="Writing captions for approved ideas…"
                    onDone={handleCopyDone}
                    onError={msg => setGenError(msg)}
                    fetch={() => {
                      const keptIdeas = ideas.filter(i => i.kept).map(i => ({
                        scheduled_date: i.scheduled_date, platform: i.platform, pillar: i.pillar,
                        format: i.format, tone_register: i.tone_register, visual_direction: i.visual_direction,
                        hook: i.hook, cross_post: i.cross_post, market: i.market,
                      }));
                      return fetch(`${API}/api/content/generate-copy`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ideas: keptIdeas }),
                      });
                    }}
                  />
                )}
              </div>
            </motion.div>
          )}

          {step === 6 && briefing && (
            <motion.div key="s6" exit={{ opacity: 0, y: -8 }}>
              <StepFinalApproval
                posts={finalPosts}
                setPosts={updatePosts}
                briefing={briefing}
                onDone={reset}
                onBack={() => setStep(4)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
