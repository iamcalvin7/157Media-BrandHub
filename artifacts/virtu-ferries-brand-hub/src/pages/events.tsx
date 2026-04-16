import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Pencil, Trash2, Calendar, Globe, ChevronDown,
  Loader2, Flag, Sparkles, Sun, PartyPopper, Anchor, Info, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
  { value: "public_holiday", label: "Public Holiday", icon: Flag, color: "bg-red-100 text-red-700" },
  { value: "festival", label: "Festival", icon: PartyPopper, color: "bg-purple-100 text-purple-700" },
  { value: "seasonal", label: "Seasonal", icon: Sun, color: "bg-amber-100 text-amber-700" },
  { value: "cultural", label: "Cultural", icon: Globe, color: "bg-blue-100 text-blue-700" },
  { value: "brand_event", label: "Brand Event", icon: Anchor, color: "bg-[#1e82b4]/10 text-[#1e82b4]" },
  { value: "other", label: "Other", icon: Sparkles, color: "bg-gray-100 text-gray-600" },
];

const MARKET_OPTIONS = [
  { value: "both", label: "Both markets" },
  { value: "English", label: "English market only" },
  { value: "Italian", label: "Italian market only" },
];

function typeConfig(type: string) {
  return EVENT_TYPES.find(t => t.value === type) ?? EVENT_TYPES[EVENT_TYPES.length - 1];
}

function marketBadge(market: string) {
  if (market === "English") return "bg-blue-100 text-blue-700";
  if (market === "Italian") return "bg-green-100 text-green-700";
  return "bg-gray-100 text-gray-600";
}

function marketLabel(market: string) {
  if (market === "English") return "EN";
  if (market === "Italian") return "IT";
  return "Both";
}

function formatDateRange(date: string, end_date: string | null): string {
  const start = new Date(date + "T12:00:00");
  const startStr = start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  if (!end_date || end_date === date) return startStr;
  const end = new Date(end_date + "T12:00:00");
  const endStr = end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${startStr} – ${endStr}`;
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

  const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/20 focus:border-[#1e82b4] bg-white";
  const labelCls = "text-[10px] font-semibold text-gray-500 uppercase tracking-widest block mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.16 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-extrabold text-gray-900">
            {initial ? "Edit event" : "Add event"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Title */}
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

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Start date *</label>
              <input type="date" value={form.date} onChange={e => set("date", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>End date <span className="text-gray-300 normal-case font-normal">(if multi-day)</span></label>
              <input type="date" value={form.end_date} min={form.date} onChange={e => set("end_date", e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Type + Market */}
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

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes for the AI <span className="text-gray-300 normal-case font-normal">(optional)</span></label>
            <textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="Context, content ideas, tone notes, relevance to the brand…"
              rows={3}
              className={`${inputCls} resize-none font-light`}
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
              <p className="text-xs text-gray-400 font-light">The AI will use this event for any future planning month, not just this year</p>
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

  const isPast = event.date < new Date().toISOString().slice(0, 10);

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await fetch(`${API}/api/events/${event.id}`, { method: "DELETE" });
      onDelete();
    } finally { setDeleting(false); }
  }

  return (
    <div className={cn(
      "bg-white border rounded-xl px-5 py-4 flex gap-4 group transition-colors",
      isPast ? "border-gray-100 opacity-60" : "border-gray-100 hover:border-[#1e82b4]/20"
    )}>
      {/* Date column */}
      <div className="w-14 shrink-0 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          {new Date(event.date + "T12:00:00").toLocaleString("en-GB", { month: "short" })}
        </p>
        <p className="text-2xl font-extrabold text-gray-900 leading-none">
          {new Date(event.date + "T12:00:00").getDate()}
        </p>
        {event.end_date && event.end_date !== event.date && (
          <p className="text-[10px] text-gray-400 mt-0.5">
            → {new Date(event.end_date + "T12:00:00").getDate()}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap mb-1">
          <p className="text-sm font-semibold text-gray-900">{event.title}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1", tc.color)}>
            <TypeIcon className="w-2.5 h-2.5" />
            {tc.label}
          </span>
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", marketBadge(event.market))}>
            {marketLabel(event.market)}
          </span>
          {event.recurring && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 flex items-center gap-1">
              <RefreshCw className="w-2.5 h-2.5" />
              Repeats yearly
            </span>
          )}
        </div>
        {event.notes && (
          <p className="text-xs text-gray-400 mt-2 italic leading-relaxed line-clamp-2">{event.notes}</p>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-lg disabled:opacity-50 flex items-center gap-1"
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 hover:text-gray-600 px-1">Cancel</button>
          </div>
        ) : (
          <>
            <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleDelete} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Events() {
  const [events, setEvents] = useState<VFEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<VFEvent | null>(null);
  const [showPast, setShowPast] = useState(false);

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
  const upcoming = events.filter(e => (e.end_date ?? e.date) >= today);
  const past = events.filter(e => (e.end_date ?? e.date) < today);
  const upcomingGroups = groupByMonth(upcoming);
  const pastGroups = groupByMonth(past).reverse();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100 bg-white sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">Events & Key Moments</h1>
            <p className="text-xs text-gray-400 mt-0.5">Holidays, festivals, and seasonal moments the AI uses when building the content calendar</p>
          </div>
          <Button
            onClick={() => { setEditingEvent(null); setShowModal(true); }}
            className="bg-[#1e82b4] hover:bg-[#1a6d99] text-white font-semibold rounded-xl gap-2"
          >
            <Plus className="w-4 h-4" />
            Add event
          </Button>
        </div>
      </div>

      {/* AI context note */}
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-[#1e82b4] shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 leading-relaxed">
            When you run Monthly Planning, the AI automatically reads all events for that month (and the weeks around it) and uses them to shape post ideas, timing, and tone. Use the <strong>Notes</strong> field to give the AI extra context about how the event relates to Virtu Ferries.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-10">
        {/* Loading */}
        {loading && (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && events.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <Calendar className="w-12 h-12 text-gray-200 mb-4" />
            <p className="text-gray-500 font-semibold">No events yet</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs">
              Add public holidays, festivals, and seasonal moments so the AI can plan content around them.
            </p>
            <Button
              onClick={() => { setEditingEvent(null); setShowModal(true); }}
              className="mt-6 bg-[#1e82b4] hover:bg-[#1a6d99] text-white font-semibold rounded-xl gap-2"
            >
              <Plus className="w-4 h-4" />
              Add your first event
            </Button>
          </div>
        )}

        {/* Upcoming events */}
        {!loading && upcomingGroups.length > 0 && (
          <div className="space-y-8">
            {upcomingGroups.map(group => (
              <div key={group.key}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">{group.label}</p>
                <div className="space-y-2">
                  {group.events.map(e => (
                    <EventCard
                      key={e.id}
                      event={e}
                      onEdit={() => { setEditingEvent(e); setShowModal(true); }}
                      onDelete={load}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Past events toggle */}
        {!loading && past.length > 0 && (
          <div>
            <button
              onClick={() => setShowPast(s => !s)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors"
            >
              <ChevronDown className={cn("w-4 h-4 transition-transform", showPast && "rotate-180")} />
              {showPast ? "Hide" : "Show"} {past.length} past event{past.length !== 1 ? "s" : ""}
            </button>

            <AnimatePresence>
              {showPast && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mt-6 space-y-8"
                >
                  {pastGroups.map(group => (
                    <div key={group.key}>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">{group.label}</p>
                      <div className="space-y-2">
                        {group.events.map(e => (
                          <EventCard
                            key={e.id}
                            event={e}
                            onEdit={() => { setEditingEvent(e); setShowModal(true); }}
                            onDelete={load}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
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
    </div>
  );
}
