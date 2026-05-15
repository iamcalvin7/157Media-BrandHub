import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Pencil, Trash2, Calendar, Globe, ChevronDown,
  Loader2, Flag, Sparkles, Sun, PartyPopper, Anchor, Info, RefreshCw,
  ExternalLink, MapPin, Radio, Search, CalendarDays, CalendarClock, Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/brand";

const API = import.meta.env.VITE_API_URL ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VFEvent {
  id: number;
  title: string;
  date: string;
  end_date: string | null;
  market: string;
  type: string;
  notes: string | null;
  recurring: boolean;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { value: "public_holiday", label: "Public Holiday", short: "Holiday",  icon: Flag,        pill: "bg-red-50 text-red-700 border border-red-100",            stripe: "#ef4444" },
  { value: "festival",       label: "Festival",       short: "Festival", icon: PartyPopper, pill: "bg-purple-50 text-purple-700 border border-purple-100",   stripe: "#a855f7" },
  { value: "seasonal",       label: "Seasonal",       short: "Seasonal", icon: Sun,         pill: "bg-amber-50 text-amber-700 border border-amber-100",      stripe: "#f6a610" },
  { value: "cultural",       label: "Cultural",       short: "Cultural", icon: Globe,       pill: "bg-sky-50 text-sky-700 border border-sky-100",            stripe: "#0ea5e9" },
  { value: "brand_event",    label: "Brand Event",    short: "Brand",    icon: Anchor,      pill: "bg-[#1e82b4]/10 text-[#1e82b4] border border-[#1e82b4]/20", stripe: "#1e82b4" },
  { value: "other",          label: "Other",          short: "Other",    icon: Sparkles,    pill: "bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E7]",     stripe: "#a1a1aa" },
];

const MARKET_OPTIONS = [
  { value: "both",    label: "Both markets",        short: "Both" },
  { value: "English", label: "English market only", short: "EN"   },
  { value: "Italian", label: "Italian market only", short: "IT"   },
];

function typeConfig(type: string) {
  return EVENT_TYPES.find(t => t.value === type) ?? EVENT_TYPES[EVENT_TYPES.length - 1];
}

function marketBadge(market: string) {
  if (market === "English") return "bg-blue-50 text-blue-700 border border-blue-100";
  if (market === "Italian") return "bg-emerald-50 text-emerald-700 border border-emerald-100";
  return "bg-[#F4F4F5] text-[#52525B] border border-[#E4E4E7]";
}

function marketLabel(market: string) {
  if (market === "English") return "EN";
  if (market === "Italian") return "IT";
  return "Both";
}

function startOfDay(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c;
}

function relativeLabel(dateStr: string): string {
  const today = startOfDay(new Date());
  const target = startOfDay(new Date(dateStr + "T12:00:00"));
  const days = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (days === 0)  return "Today";
  if (days === 1)  return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 0 && days <= 7)  return `In ${days} days`;
  if (days > 7 && days <= 30) return `In ${Math.round(days / 7)} weeks`;
  if (days > 30 && days <= 365) return `In ${Math.round(days / 30)} months`;
  if (days < 0  && days >= -7) return `${Math.abs(days)}d ago`;
  return target.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function groupByMonth(events: VFEvent[]): { key: string; label: string; events: VFEvent[] }[] {
  const groups: Record<string, VFEvent[]> = {};
  for (const e of events) {
    const key = e.date.slice(0, 7);
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, events]) => {
      const [y, m] = key.split("-").map(Number);
      const label = new Date(y, m - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
      return { key, label, events };
    });
}

// ─── Event Form Modal ─────────────────────────────────────────────────────────

interface EventFormValues {
  title: string;
  date: string;
  end_date: string;
  market: string;
  type: string;
  notes: string;
  recurring: boolean;
}

function EventModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: VFEvent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<EventFormValues>({
    title: initial?.title ?? "",
    date: initial?.date ?? today,
    end_date: initial?.end_date ?? "",
    market: initial?.market ?? "both",
    type: initial?.type ?? "seasonal",
    notes: initial?.notes ?? "",
    recurring: initial?.recurring ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof EventFormValues>(k: K, v: EventFormValues[K]) {
    setForm(f => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!form.title.trim() || !form.date) {
      setError("Title and date are required.");
      return;
    }
    setSaving(true); setError("");
    try {
      const url = initial ? `${API}/api/events/${initial.id}` : `${API}/api/events`;
      const method = initial ? "PUT" : "POST";
      const resp = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          date: form.date,
          end_date: form.end_date || null,
          market: form.market,
          type: form.type,
          notes: form.notes.trim() || null,
          recurring: form.recurring,
        }),
      });
      if (!resp.ok) throw new Error("Failed");
      onSaved();
    } catch {
      setError("Failed to save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full border border-[#E4E4E7] rounded-xl px-4 py-2.5 text-sm text-[#18181B] bg-white " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e82b4]/30 focus:border-[#1e82b4] transition-colors";
  const labelCls = "text-[10px] font-semibold text-[#71717A] uppercase tracking-widest block mb-1.5";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.16 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-[#E4E4E7]"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-5 border-b border-[#F4F4F5]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A1A1AA] mb-1">
                {initial ? "Editing" : "New entry"}
              </p>
              <h2 className="text-xl font-extrabold tracking-tight text-[#18181B]">
                {initial ? "Edit event" : "Add event or moment"}
              </h2>
              <p className="text-xs text-[#71717A] mt-1 font-light">
                Anything you log here feeds the agent's context when it plans content.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[#A1A1AA] hover:text-[#52525B] p-1.5 rounded-lg hover:bg-[#F4F4F5] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className={labelCls}>Event name *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="e.g. Easter Weekend, Malta Independence Day, Etna Wine Festival…"
              className={inputCls}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Start date *</label>
              <input type="date" value={form.date} onChange={e => set("date", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>End date <span className="text-[#D4D4D8] normal-case font-normal">(if multi-day)</span></label>
              <input type="date" value={form.end_date} min={form.date} onChange={e => set("end_date", e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Type</label>
              <select value={form.type} onChange={e => set("type", e.target.value)} className={inputCls}>
                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Relevant market</label>
              <select value={form.market} onChange={e => set("market", e.target.value)} className={inputCls}>
                {MARKET_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes for the AI <span className="text-[#D4D4D8] normal-case font-normal">(optional)</span></label>
            <textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="Context, content ideas, tone notes, relevance to the brand…"
              rows={3}
              className={`${inputCls} resize-none font-light leading-relaxed`}
            />
          </div>

          <button
            type="button"
            onClick={() => set("recurring", !form.recurring)}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-3 rounded-xl border text-left transition-all",
              form.recurring
                ? "border-[#1e82b4]/40 bg-[#1e82b4]/5"
                : "border-[#E4E4E7] bg-white hover:border-[#D4D4D8]"
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
              <p className="text-xs text-[#71717A] font-light mt-0.5">The AI will use this event for any future planning month, not just this year</p>
            </div>
          </button>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex items-center justify-end gap-3 border-t border-[#F4F4F5] pt-4">
          <button onClick={onClose} className="text-sm text-[#71717A] hover:text-[#27272A] font-medium px-2 py-2 transition-colors">
            Cancel
          </button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white font-semibold px-6 rounded-xl disabled:opacity-50"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving…</> : (initial ? "Save changes" : "Add event")}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event, onEdit, onDelete }: { event: VFEvent; onEdit: () => void; onDelete: () => void }) {
  const tc = typeConfig(event.type);
  const TypeIcon = tc.icon;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const isPast    = (event.end_date ?? event.date) < todayStr;
  const isToday   = !isPast && event.date <= todayStr && (event.end_date ?? event.date) >= todayStr;

  const start = new Date(event.date + "T12:00:00");
  const end   = event.end_date ? new Date(event.end_date + "T12:00:00") : null;
  const isMultiDay = !!end && event.end_date !== event.date;

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await fetch(`${API}/api/events/${event.id}`, { method: "DELETE" });
      onDelete();
    } finally { setDeleting(false); }
  }

  return (
    <div
      className={cn(
        "relative bg-white border rounded-xl pl-4 pr-3 py-2.5 flex items-center gap-3 group transition-colors",
        isPast
          ? "border-[#F4F4F5] opacity-70"
          : isToday
            ? "border-[#1e82b4]/30"
            : "border-[#E4E4E7] hover:border-[#D4D4D8]"
      )}
    >
      {/* Left accent stripe */}
      <span
        aria-hidden
        className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full"
        style={{ backgroundColor: tc.stripe }}
      />

      {/* Date chip */}
      <div className="w-11 shrink-0 text-center">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-[#A1A1AA] leading-none">
          {start.toLocaleString("en-GB", { month: "short" })}
        </p>
        <p className="text-lg font-extrabold text-[#18181B] leading-none mt-1 tracking-tight tabular-nums">
          {start.getDate()}
          {isMultiDay && end && (
            <span className="text-[10px] font-semibold text-[#A1A1AA] tracking-tight">–{end.getDate()}</span>
          )}
        </p>
      </div>

      {/* Divider */}
      <span aria-hidden className="self-stretch w-px bg-[#F4F4F5] my-0.5" />

      {/* Title + meta inline */}
      <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
        <p className="text-[13px] font-bold tracking-tight text-[#18181B] leading-tight truncate max-w-full">
          {event.title}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <span className={cn("text-[9.5px] font-semibold px-1.5 py-px rounded-full inline-flex items-center gap-0.5", tc.pill)}>
            <TypeIcon className="w-2.5 h-2.5" />
            {tc.short}
          </span>
          <span className={cn("text-[9.5px] font-semibold px-1.5 py-px rounded-full", marketBadge(event.market))}>
            {marketLabel(event.market)}
          </span>
          {event.recurring && (
            <span className="text-[9.5px] font-semibold px-1.5 py-px rounded-full bg-violet-50 text-violet-700 border border-violet-100 inline-flex items-center gap-0.5" title="Repeats yearly">
              <Repeat className="w-2.5 h-2.5" />
            </span>
          )}
          {!isPast && (
            <span
              className={cn(
                "text-[9.5px] font-semibold px-1.5 py-px rounded-full",
                isToday ? "bg-[#1e82b4]/10 text-[#1e82b4]" : "text-[#A1A1AA]"
              )}
            >
              {isToday ? (isMultiDay ? "Live" : "Today") : relativeLabel(event.date)}
            </span>
          )}
        </div>
        {event.notes && (
          <p className="text-[11px] text-[#A1A1AA] leading-snug truncate w-full font-light" title={event.notes}>
            {event.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-md disabled:opacity-50 flex items-center gap-1"
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-[#71717A] hover:text-[#27272A] px-1">
              Cancel
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={onEdit}
              className="p-1 text-[#A1A1AA] hover:text-[#1e82b4] rounded-md hover:bg-[#1e82b4]/5 transition-colors"
              title="Edit event"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 text-[#A1A1AA] hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"
              title="Delete event"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Timeline rail (shared) ───────────────────────────────────────────────────

function MonthRail({ label, count, muted = false, children }: { label: string; count: number; muted?: boolean; children: React.ReactNode }) {
  return (
    <div className="relative pl-7 md:pl-10">
      <div
        aria-hidden
        className={cn(
          "absolute left-2 md:left-3 top-3 bottom-3 w-px",
          muted ? "bg-[#EAEAEC]" : "bg-gradient-to-b from-[#E4E4E7] via-[#E4E4E7] to-transparent"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "absolute left-[3px] md:left-[7px] top-2 w-3 h-3 rounded-full ring-4 ring-[#F5F5F5]",
          muted ? "bg-[#D4D4D8]" : "bg-[#1e82b4]"
        )}
      />
      <div className="flex items-baseline gap-3 mb-3">
        <p className={cn("text-[11px] font-extrabold uppercase tracking-widest", muted ? "text-[#A1A1AA]" : "text-[#27272A]")}>
          {label}
        </p>
        <p className="text-[11px] text-[#A1A1AA] font-medium">{count} {count === 1 ? "event" : "events"}</p>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatTile({ icon: Icon, label, value, accent }: { icon: typeof Calendar; label: string; value: number; accent?: string }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-[#E4E4E7] rounded-2xl px-4 py-3 flex-1 min-w-0">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: (accent ?? "#1e82b4") + "15", color: accent ?? "#1e82b4" }}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-[#18181B] tracking-tight leading-none">{value}</p>
        <p className="text-[11px] text-[#71717A] font-medium mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

function FilterChip({
  active, onClick, children, dot,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all",
        active
          ? "bg-[#18181B] text-white border-[#18181B]"
          : "bg-white text-[#52525B] border-[#E4E4E7] hover:border-[#A1A1AA] hover:text-[#18181B]"
      )}
    >
      {dot && (
        <span
          aria-hidden
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: dot }}
        />
      )}
      {children}
    </button>
  );
}

// ─── Gozo Events live feed (eventsingozo.com) ───────────────────────────────
// Read-only section that shows every event from the public iCal feed.
// Only visible for the Gozo Highspeed brand.

interface GozoFeedEvent {
  uid: string;
  title: string;
  start: string;       // ISO datetime
  end: string | null;
  allDay: boolean;
  location: string | null;
  description: string | null;
  url: string | null;
  categories: string[];
}

interface GozoFeedResponse {
  source: string;
  fetchedAt: string;
  cached: boolean;
  count: number;
  events: GozoFeedEvent[];
}

function formatFeedDateRange(startIso: string, endIso: string | null, allDay: boolean): string {
  const start = new Date(startIso);
  const dateOpts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: false };

  const startDate = start.toLocaleDateString("en-GB", dateOpts);
  if (allDay) {
    if (!endIso) return startDate;
    const end = new Date(endIso);
    end.setDate(end.getDate() - 1);
    if (end.toDateString() === start.toDateString()) return startDate;
    return `${startDate} – ${end.toLocaleDateString("en-GB", dateOpts)}`;
  }

  const startTime = start.toLocaleTimeString("en-GB", timeOpts);
  if (!endIso) return `${startDate} · ${startTime}`;
  const end = new Date(endIso);
  const sameDay = end.toDateString() === start.toDateString();
  const endTime = end.toLocaleTimeString("en-GB", timeOpts);
  if (sameDay) return `${startDate} · ${startTime}–${endTime}`;
  return `${startDate} ${startTime} – ${end.toLocaleDateString("en-GB", dateOpts)} ${endTime}`;
}

function groupFeedByMonth(events: GozoFeedEvent[]): { key: string; label: string; events: GozoFeedEvent[] }[] {
  const groups: Record<string, GozoFeedEvent[]> = {};
  for (const e of events) {
    const key = e.start.slice(0, 7);
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => {
      const [y, m] = key.split("-").map(Number);
      const label = new Date(y, m - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
      return { key, label, events: items };
    });
}

function GozoFeedCard({ event }: { event: GozoFeedEvent }) {
  const [expanded, setExpanded] = useState(false);
  const desc = event.description ?? "";
  const isLong = desc.length > 220;
  const shown = !isLong || expanded ? desc : desc.slice(0, 220).trimEnd() + "…";

  const start = new Date(event.start);

  return (
    <div className="relative bg-white border border-[#E4E4E7] rounded-xl pl-4 pr-3 py-2.5 hover:border-[#D4D4D8] transition-colors flex gap-3">
      <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-emerald-500" />

      <div className="w-11 shrink-0 text-center">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-[#A1A1AA] leading-none">
          {start.toLocaleString("en-GB", { month: "short" })}
        </p>
        <p className="text-lg font-extrabold text-[#18181B] leading-none mt-1 tracking-tight tabular-nums">
          {start.getDate()}
        </p>
      </div>
      <span aria-hidden className="self-stretch w-px bg-[#F4F4F5] my-0.5" />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold tracking-tight text-[#18181B] leading-snug">
              {event.title}
            </p>
            <p className="text-xs text-[#71717A] mt-1 font-light">
              {formatFeedDateRange(event.start, event.end, event.allDay)}
            </p>
            {event.location && (
              <p className="text-xs text-[#A1A1AA] mt-1 flex items-start gap-1 font-light">
                <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                <span className="leading-snug">{event.location}</span>
              </p>
            )}
          </div>
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#1e82b4] hover:bg-[#1e82b4]/5 transition-colors"
              title="Open on eventsingozo.com"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {desc && (
          <div className="mt-2">
            <p className="text-xs text-[#52525B] leading-relaxed whitespace-pre-line font-light">{shown}</p>
            {isLong && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="text-[11px] font-semibold text-[#71717A] hover:text-[#27272A] mt-1"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}

        {event.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {event.categories.slice(0, 6).map(cat => (
              <span key={cat} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4F4F5] text-[#71717A] font-medium border border-[#E4E4E7]">
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GozoEventsSection() {
  const [data, setData] = useState<GozoFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API}/api/gozo-events${force ? "?refresh=1" : ""}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        setError(`Feed responded ${resp.status}`);
        return;
      }
      const json = (await resp.json()) as GozoFeedResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(false); }, [load]);

  const groups = data ? groupFeedByMonth(data.events) : [];

  return (
    <section className="border-t border-[#E4E4E7] pt-10 mt-12">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1.5">
            <Radio className="w-3 h-3" />
            Live feed
          </p>
          <h2 className="text-2xl md:text-[1.6rem] font-extrabold tracking-tight text-[#18181B]">
            eventsingozo.com
          </h2>
          <p className="text-sm text-[#71717A] mt-1.5 font-light leading-relaxed max-w-2xl">
            Every event from the public eventsingozo.com calendar. Read-only, refreshed hourly. Use these for inspiration when planning <em className="not-italic font-medium text-[#27272A]">Destination</em> or <em className="not-italic font-medium text-[#27272A]">Event Spotlight</em> posts.
          </p>
          {data && (
            <p className="text-[11px] text-[#A1A1AA] mt-2 font-light">
              {data.count} events · last fetched {new Date(data.fetchedAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
            </p>
          )}
        </div>
        <button
          onClick={() => load(true)}
          disabled={loading}
          className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[#52525B] hover:text-[#18181B] px-3 py-2 rounded-xl border border-[#E4E4E7] hover:border-[#A1A1AA] bg-white transition-colors disabled:opacity-50"
          title="Force refresh"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="border border-red-100 bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700">
          Couldn't load the feed: {error}
        </div>
      )}

      {loading && !data && (
        <div className="py-12 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-[#D4D4D8] animate-spin" />
        </div>
      )}

      {!loading && data && data.events.length === 0 && (
        <p className="text-sm text-[#71717A] py-6 text-center">No events in the feed right now.</p>
      )}

      {data && data.events.length > 0 && (
        <div className="space-y-10">
          {groups.map(group => (
            <MonthRail key={group.key} label={group.label} count={group.events.length}>
              {group.events.map(e => (
                <GozoFeedCard key={e.uid} event={e} />
              ))}
            </MonthRail>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Sicily Events live feed (visitsicily.info) ─────────────────────────────
// Read-only section that mirrors the Gozo feed, but for Virtu Ferries.
// Source is the public WordPress RSS at visitsicily.info; the server-side
// scraper enriches each item by fetching its detail page (start/end/place).

interface SicilyFeedEvent {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  location: string | null;
  description: string | null;
  url: string;
  image: string | null;
  website: string | null;
  social: string | null;
  categories: string[];
}

interface SicilyFeedResponse {
  source: string;
  fetchedAt: string;
  cached: boolean;
  count: number;
  events: SicilyFeedEvent[];
}

function formatSicilyDateRange(startIso: string | null, endIso: string | null): string {
  if (!startIso) return "Date TBA";
  const start = new Date(startIso);
  const dateOpts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const startDate = start.toLocaleDateString("en-GB", dateOpts);
  if (!endIso) return startDate;
  const end = new Date(endIso);
  if (end.toDateString() === start.toDateString()) return startDate;
  return `${startDate} – ${end.toLocaleDateString("en-GB", dateOpts)}`;
}

function groupSicilyByMonth(events: SicilyFeedEvent[]): { key: string; label: string; events: SicilyFeedEvent[] }[] {
  const groups: Record<string, SicilyFeedEvent[]> = {};
  for (const e of events) {
    const key = e.start ? e.start.slice(0, 7) : "tba";
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => {
      if (a === "tba") return 1;
      if (b === "tba") return -1;
      return a.localeCompare(b);
    })
    .map(([key, items]) => {
      if (key === "tba") return { key, label: "Date TBA", events: items };
      const [y, m] = key.split("-").map(Number);
      const label = new Date(y, m - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
      return { key, label, events: items };
    });
}

function SicilyFeedCard({ event }: { event: SicilyFeedEvent }) {
  const [expanded, setExpanded] = useState(false);
  const desc = event.description ?? "";
  const isLong = desc.length > 220;
  const shown = !isLong || expanded ? desc : desc.slice(0, 220).trimEnd() + "…";
  const start = event.start ? new Date(event.start) : null;

  return (
    <div className="relative bg-white border border-[#E4E4E7] rounded-xl pl-4 pr-3 py-2.5 hover:border-[#D4D4D8] transition-colors flex gap-3">
      <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full bg-[#1e82b4]" />

      <div className="w-11 shrink-0 text-center">
        {start ? (
          <>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-[#A1A1AA] leading-none">
              {start.toLocaleString("en-GB", { month: "short" })}
            </p>
            <p className="text-lg font-extrabold text-[#18181B] leading-none mt-1 tracking-tight tabular-nums">
              {start.getDate()}
            </p>
          </>
        ) : (
          <p className="text-[9px] font-semibold uppercase tracking-wider text-[#A1A1AA] leading-none">TBA</p>
        )}
      </div>
      <span aria-hidden className="self-stretch w-px bg-[#F4F4F5] my-0.5" />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-extrabold tracking-tight text-[#18181B] leading-snug">
              {event.title}
            </p>
            <p className="text-xs text-[#71717A] mt-1 font-light">
              {formatSicilyDateRange(event.start, event.end)}
            </p>
            {event.location && (
              <p className="text-xs text-[#A1A1AA] mt-1 flex items-start gap-1 font-light">
                <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                <span className="leading-snug">{event.location}</span>
              </p>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-0.5">
            {event.website && (
              <a
                href={event.website}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#1e82b4] hover:bg-[#1e82b4]/5 transition-colors"
                title="Open the official event website"
              >
                <Globe className="w-3.5 h-3.5" />
              </a>
            )}
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#1e82b4] hover:bg-[#1e82b4]/5 transition-colors"
              title="Open on visitsicily.info"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {desc && (
          <div className="mt-2">
            <p className="text-xs text-[#52525B] leading-relaxed whitespace-pre-line font-light">{shown}</p>
            {isLong && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="text-[11px] font-semibold text-[#71717A] hover:text-[#27272A] mt-1"
              >
                {expanded ? "Show less" : "Read more"}
              </button>
            )}
          </div>
        )}

        {event.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {event.categories.slice(0, 6).map(cat => (
              <span key={cat} className="text-[10px] px-2 py-0.5 rounded-full bg-[#F4F4F5] text-[#71717A] font-medium border border-[#E4E4E7]">
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SicilyEventsSection() {
  const [data, setData] = useState<SicilyFeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API}/api/sicily-events${force ? "?refresh=1" : ""}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        setError(`Feed responded ${resp.status}`);
        return;
      }
      const json = (await resp.json()) as SicilyFeedResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(false); }, [load]);

  // The visitsicily RSS returns events by publish date, which mixes past and
  // future. By default we only show events whose end (or start, when no end)
  // is today or later, so the section opens on what's still ahead instead of
  // months of stale items. Toggle to see the archive.
  const todayKey = new Date().toISOString().slice(0, 10);
  const visible = data
    ? data.events.filter(e => {
        const ref = e.end ?? e.start;
        if (!ref) return true; // TBA events stay visible
        return showPast ? true : ref.slice(0, 10) >= todayKey;
      })
    : [];
  const pastCount = data ? data.events.length - visible.length : 0;
  const groups = groupSicilyByMonth(visible);

  return (
    <section className="border-t border-[#E4E4E7] pt-10 mt-12">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#1e82b4] mb-2 flex items-center gap-1.5">
            <Radio className="w-3 h-3" />
            Live feed
          </p>
          <h2 className="text-2xl md:text-[1.6rem] font-extrabold tracking-tight text-[#18181B]">
            visitsicily.info
          </h2>
          <p className="text-sm text-[#71717A] mt-1.5 font-light leading-relaxed max-w-2xl">
            Every event from the official Visit Sicily portal, scraped from their public events listing. Read-only, refreshed hourly. Use these for inspiration when planning <em className="not-italic font-medium text-[#27272A]">Choose Sicily</em> or <em className="not-italic font-medium text-[#27272A]">Virtu Recommends</em> posts. Always credit visitsicily.info when paraphrasing their copy; treat their photos as visual reference only.
          </p>
          {data && (
            <p className="text-[11px] text-[#A1A1AA] mt-2 font-light">
              {visible.length} of {data.count} events shown{pastCount > 0 && !showPast ? ` · ${pastCount} past hidden` : ""} · last fetched {new Date(data.fetchedAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
            </p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {pastCount > 0 && (
            <button
              onClick={() => setShowPast(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#52525B] hover:text-[#18181B] px-3 py-2 rounded-xl border border-[#E4E4E7] hover:border-[#A1A1AA] bg-white transition-colors"
            >
              {showPast ? "Hide past" : `Show past (${pastCount})`}
            </button>
          )}
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#52525B] hover:text-[#18181B] px-3 py-2 rounded-xl border border-[#E4E4E7] hover:border-[#A1A1AA] bg-white transition-colors disabled:opacity-50"
            title="Force refresh"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="border border-red-100 bg-red-50 rounded-xl px-4 py-3 text-sm text-red-700">
          Couldn't load the feed: {error}
        </div>
      )}

      {loading && !data && (
        <div className="py-12 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-[#D4D4D8] animate-spin" />
        </div>
      )}

      {!loading && data && visible.length === 0 && (
        <p className="text-sm text-[#71717A] py-6 text-center">
          No upcoming events in the feed right now.{pastCount > 0 ? " Click Show past to see the archive." : ""}
        </p>
      )}

      {data && visible.length > 0 && (
        <div className="space-y-10">
          {groups.map(group => (
            <MonthRail key={group.key} label={group.label} count={group.events.length}>
              {group.events.map(e => (
                <SicilyFeedCard key={e.id} event={e} />
              ))}
            </MonthRail>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Events() {
  const { activeBrand } = useBrand();
  const isGhs = activeBrand?.slug === "gozo-highspeed";
  const isVirtu = activeBrand?.slug === "virtu-ferries";

  const [events, setEvents] = useState<VFEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<VFEvent | null>(null);
  const [showPast, setShowPast] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API}/api/events`);
      if (resp.ok) setEvents(await resp.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const monthKey = today.slice(0, 7);

  const stats = useMemo(() => {
    const upcoming = events.filter(e => (e.end_date ?? e.date) >= today);
    const thisMonth = events.filter(e => e.date.slice(0, 7) === monthKey);
    const recurring = events.filter(e => e.recurring);
    return {
      upcoming: upcoming.length,
      thisMonth: thisMonth.length,
      recurring: recurring.length,
      total: events.length,
    };
  }, [events, today, monthKey]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter(e => {
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (marketFilter !== "all" && e.market !== marketFilter) return false;
      if (recurringOnly && !e.recurring) return false;
      if (q && !(e.title.toLowerCase().includes(q) || (e.notes ?? "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [events, typeFilter, marketFilter, recurringOnly, search]);

  const upcoming = filtered.filter(e => (e.end_date ?? e.date) >= today);
  const past     = filtered.filter(e => (e.end_date ?? e.date) <  today);
  const upcomingGroups = groupByMonth(upcoming);
  const pastGroups     = groupByMonth(past).reverse();

  const filtersActive = typeFilter !== "all" || marketFilter !== "all" || recurringOnly || search.trim().length > 0;
  const clearFilters = () => { setTypeFilter("all"); setMarketFilter("all"); setRecurringOnly(false); setSearch(""); };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-[#F5F5F5]"
    >
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-8 md:py-12 pb-24">
        {/* Hero */}
        <header className="mb-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#1e82b4] mb-3 flex items-center gap-2">
                <span className="inline-block w-8 h-[2px] bg-[#1e82b4] rounded-full" />
                Editorial calendar
              </p>
              <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight leading-[1.04] text-[#18181B]">
                Events &amp; Moments
              </h1>
              <p className="text-base md:text-lg text-[#52525B] font-light max-w-2xl mt-3 leading-relaxed">
                Holidays, festivals, and seasonal moments the brand agent uses when planning the content calendar. Anything you log here flows straight into the AI's context.
              </p>
            </div>
            <Button
              onClick={() => { setEditingEvent(null); setShowModal(true); }}
              className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white font-semibold rounded-xl gap-2 h-10 px-5 shadow-none"
            >
              <Plus className="w-4 h-4" />
              Add event
            </Button>
          </div>
          <div className="mt-6 h-px bg-gradient-to-r from-[#E4E4E7] via-[#E4E4E7] to-transparent" />
        </header>

        {/* Stats */}
        {!loading && events.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-6">
            <StatTile icon={CalendarClock} label="Upcoming"  value={stats.upcoming}  accent="#1e82b4" />
            <StatTile icon={CalendarDays}  label="This month" value={stats.thisMonth} accent="#39A15F" />
            <StatTile icon={Repeat}        label="Recurring" value={stats.recurring} accent="#a855f7" />
            <StatTile icon={Calendar}      label="Total"     value={stats.total}     accent="#71717A" />
          </div>
        )}

        {/* Filters */}
        {!loading && events.length > 0 && (
          <div className="bg-white border border-[#E4E4E7] rounded-2xl p-4 mb-8 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A1A1AA]" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search events and notes…"
                  className="w-full text-sm border border-[#E4E4E7] rounded-xl pl-9 pr-3 py-2 text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1e82b4]/30 focus:border-[#1e82b4] transition-colors bg-white"
                />
              </div>
              {filtersActive && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-semibold text-[#71717A] hover:text-[#18181B] px-3 py-2 rounded-lg hover:bg-[#F4F4F5] transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}>All types</FilterChip>
              {EVENT_TYPES.map(t => (
                <FilterChip
                  key={t.value}
                  active={typeFilter === t.value}
                  onClick={() => setTypeFilter(typeFilter === t.value ? "all" : t.value)}
                  dot={t.stripe}
                >
                  {t.short}
                </FilterChip>
              ))}
              <span className="w-px h-5 bg-[#E4E4E7] mx-1 self-center" />
              <FilterChip active={marketFilter === "all"} onClick={() => setMarketFilter("all")}>All markets</FilterChip>
              {MARKET_OPTIONS.map(m => (
                <FilterChip
                  key={m.value}
                  active={marketFilter === m.value}
                  onClick={() => setMarketFilter(marketFilter === m.value ? "all" : m.value)}
                >
                  {m.short}
                </FilterChip>
              ))}
              <span className="w-px h-5 bg-[#E4E4E7] mx-1 self-center" />
              <FilterChip active={recurringOnly} onClick={() => setRecurringOnly(v => !v)} dot="#a855f7">
                <Repeat className="w-3 h-3" /> Recurring only
              </FilterChip>
            </div>
          </div>
        )}

        {/* AI context note */}
        {!loading && events.length > 0 && (
          <div className="flex items-start gap-3 bg-[#1e82b4]/[0.04] border border-[#1e82b4]/15 rounded-xl px-4 py-3 mb-8">
            <Info className="w-4 h-4 text-[#1e82b4] shrink-0 mt-0.5" />
            <p className="text-xs text-[#27272A] leading-relaxed font-light">
              Events feed into the brand agent's context — anything you log here (and in the Notes field) helps the AI understand timing, tone, and relevance when you ask for post ideas in chat.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="py-20 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[#D4D4D8] animate-spin" />
          </div>
        )}

        {/* Empty state — nothing logged */}
        {!loading && events.length === 0 && (
          <div className="bg-white border border-dashed border-[#E4E4E7] rounded-2xl py-20 flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-[#1e82b4]/10 flex items-center justify-center mb-5">
              <Calendar className="w-6 h-6 text-[#1e82b4]" />
            </div>
            <p className="text-base font-extrabold text-[#18181B] tracking-tight">No events yet</p>
            <p className="text-sm text-[#71717A] mt-1.5 max-w-sm font-light leading-relaxed">
              Add public holidays, festivals, and seasonal moments so the agent can plan content around them.
            </p>
            <Button
              onClick={() => { setEditingEvent(null); setShowModal(true); }}
              className="mt-6 bg-[#1e82b4] hover:bg-[#1a6d99] text-white font-semibold rounded-xl gap-2 h-10 px-5 shadow-none"
            >
              <Plus className="w-4 h-4" />
              Add your first event
            </Button>
          </div>
        )}

        {/* Empty state — filters hide everything */}
        {!loading && events.length > 0 && filtered.length === 0 && (
          <div className="bg-white border border-[#E4E4E7] rounded-2xl py-14 flex flex-col items-center justify-center text-center px-6">
            <Search className="w-8 h-8 text-[#D4D4D8] mb-3" />
            <p className="text-sm font-semibold text-[#27272A]">No events match these filters</p>
            <p className="text-xs text-[#A1A1AA] mt-1 font-light">Try clearing one of the filters above.</p>
            <button
              onClick={clearFilters}
              className="mt-4 text-xs font-semibold text-[#1e82b4] hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Upcoming events — timeline */}
        {!loading && upcomingGroups.length > 0 && (
          <div className="space-y-10">
            {upcomingGroups.map(group => (
              <MonthRail key={group.key} label={group.label} count={group.events.length}>
                {group.events.map(e => (
                  <EventCard
                    key={e.id}
                    event={e}
                    onEdit={() => { setEditingEvent(e); setShowModal(true); }}
                    onDelete={load}
                  />
                ))}
              </MonthRail>
            ))}
          </div>
        )}

        {/* Past events */}
        {!loading && past.length > 0 && (
          <div className="mt-12">
            <button
              onClick={() => setShowPast(s => !s)}
              className="flex items-center gap-2 text-xs font-semibold text-[#52525B] hover:text-[#18181B] bg-white border border-[#E4E4E7] hover:border-[#A1A1AA] rounded-full px-4 py-2 transition-colors"
            >
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showPast && "rotate-180")} />
              {showPast ? "Hide" : "Show"} {past.length} past event{past.length !== 1 ? "s" : ""}
            </button>

            <AnimatePresence initial={false}>
              {showPast && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-8 space-y-10"
                >
                  {pastGroups.map(group => (
                    <MonthRail key={group.key} label={group.label} count={group.events.length} muted>
                      {group.events.map(e => (
                        <EventCard
                          key={e.id}
                          event={e}
                          onEdit={() => { setEditingEvent(e); setShowModal(true); }}
                          onDelete={load}
                        />
                      ))}
                    </MonthRail>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Live feed from eventsingozo.com — GHS only */}
        {isGhs && <GozoEventsSection />}

        {/* Live feed from visitsicily.info — Virtu Ferries only */}
        {isVirtu && <SicilyEventsSection />}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <EventModal
            initial={editingEvent ?? undefined}
            onClose={() => { setShowModal(false); setEditingEvent(null); }}
            onSaved={() => { setShowModal(false); setEditingEvent(null); load(); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
