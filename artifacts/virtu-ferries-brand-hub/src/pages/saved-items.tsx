import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, Plus, Trash2, ExternalLink, Link2, Video, Palette, FileText, Loader2, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type Kind = "link" | "video" | "design" | "other";

interface SavedItem {
  id: number;
  kind: Kind;
  url: string | null;
  title: string | null;
  notes: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
}

const KINDS: { value: Kind | "all"; label: string; icon: any; color: string }[] = [
  { value: "all", label: "All", icon: Bookmark, color: "text-[#52525B]" },
  { value: "link", label: "Links", icon: Link2, color: "text-[#1e82b4]" },
  { value: "video", label: "Videos", icon: Video, color: "text-[#e01814]" },
  { value: "design", label: "Designs", icon: Palette, color: "text-[#f6a610]" },
  { value: "other", label: "Other", icon: FileText, color: "text-[#71717A]" },
];

function kindMeta(k: Kind) {
  return KINDS.find(x => x.value === k) ?? KINDS[0];
}

function hostnameOf(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

function timeAgo(iso: string) {
  const d = new Date(iso);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 7) return `${Math.floor(sec / 86400)}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function SavedItems() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/saved-items`);
      const data = await r.json();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
    await fetch(`${API}/api/saved-items/${id}`, { method: "DELETE" });
  }

  const visible = items.filter(i => {
    if (filter !== "all" && i.kind !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = [i.title, i.url, i.notes, hostnameOf(i.url)].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const counts: Record<string, number> = { all: items.length };
  for (const k of ["link", "video", "design", "other"] as Kind[]) {
    counts[k] = items.filter(i => i.kind === k).length;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#A1A1AA] mb-2">
              <Bookmark className="w-3.5 h-3.5" />
              Swipe File
            </div>
            <h1 className="text-3xl font-bold text-[#18181B]">Saved for Later</h1>
            <p className="text-sm text-[#71717A] mt-1.5 max-w-xl">
              Stash links, video references and design inspiration you want to pull on later — competitor ads, beautiful Reels, photographer references, anything worth a second look.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="shrink-0 flex items-center gap-1.5 bg-[#1e82b4] hover:bg-[#1a6d99] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Save something
          </button>
        </div>

        {/* Filters + search */}
        <div className="mt-8 flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {KINDS.map(k => {
              const Icon = k.icon;
              const active = filter === k.value;
              return (
                <button
                  key={k.value}
                  onClick={() => setFilter(k.value as any)}
                  className={cn(
                    "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors",
                    active
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-[#52525B] border-[#E4E4E7] hover:border-[#D4D4D8] hover:text-[#18181B]"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", active ? "text-white" : k.color)} />
                  {k.label}
                  <span className={cn("text-[10px] font-bold ml-0.5", active ? "text-white/70" : "text-[#A1A1AA]")}>
                    {counts[k.value] ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="relative md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search saved items…"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#E4E4E7] focus:border-[#1e82b4] focus:outline-none focus:ring-1 focus:ring-[#1e82b4]/30"
            />
          </div>
        </div>

        {/* Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-[#E4E4E7] rounded-2xl">
              <Bookmark className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-[#71717A]">
                {items.length === 0 ? "Nothing saved yet." : "No items match this filter."}
              </p>
              {items.length === 0 && (
                <button
                  onClick={() => setShowAdd(true)}
                  className="mt-4 text-sm font-semibold text-[#1e82b4] hover:text-[#1a6d99]"
                >
                  Save your first link →
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map(item => (
                <SavedCard key={item.id} item={item} onDelete={() => handleDelete(item.id)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddItemModal
            onClose={() => setShowAdd(false)}
            onSaved={(item) => { setItems(prev => [item, ...prev]); setShowAdd(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SavedCard({ item, onDelete }: { item: SavedItem; onDelete: () => void }) {
  const meta = kindMeta(item.kind);
  const Icon = meta.icon;
  const host = hostnameOf(item.url);
  const [confirm, setConfirm] = useState(false);
  const displayTitle = item.title?.trim() || host || item.url || "Untitled";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group bg-white rounded-2xl border border-[#E4E4E7] hover:border-[#D4D4D8] hover:shadow-md transition-all flex flex-col overflow-hidden"
    >
      {item.thumbnailUrl && (
        <a href={item.url ?? "#"} target="_blank" rel="noreferrer" className="block aspect-video bg-[#F4F4F5] overflow-hidden">
          <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </a>
      )}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#71717A] bg-[#F4F4F5] px-2 py-0.5 rounded-full">
            <Icon className={cn("w-3 h-3", meta.color)} />
            {item.kind}
          </span>
          {host && (
            <span className="text-[11px] text-[#A1A1AA] truncate">{host}</span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-[#18181B] leading-snug line-clamp-2">
          {displayTitle}
        </h3>
        {item.notes && (
          <p className="mt-2 text-xs text-[#52525B] leading-relaxed line-clamp-3 whitespace-pre-wrap">
            {item.notes}
          </p>
        )}
        <div className="mt-auto pt-4 flex items-center justify-between gap-2">
          <span className="text-[10px] text-[#A1A1AA]">{timeAgo(item.createdAt)}</span>
          <div className="flex items-center gap-1">
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-xs font-semibold text-[#1e82b4] hover:text-[#1a6d99] px-2 py-1 rounded-lg hover:bg-[#1e82b4]/5"
              >
                Open
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {confirm ? (
              <div className="flex items-center gap-1">
                <button onClick={onDelete} className="text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-md">Delete</button>
                <button onClick={() => setConfirm(false)} className="text-[11px] text-[#A1A1AA] hover:text-[#52525B] px-1">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirm(true)}
                className="text-gray-300 hover:text-red-500 p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AddItemModal({ onClose, onSaved }: { onClose: () => void; onSaved: (item: SavedItem) => void }) {
  const [kind, setKind] = useState<Kind>("link");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim() && !title.trim() && !notes.trim()) {
      setError("Add a URL, a title, or some notes — anything to identify it.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/saved-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          url: url.trim() || null,
          title: title.trim() || null,
          notes: notes.trim() || null,
          thumbnailUrl: thumbnailUrl.trim() || null,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || "Failed to save");
      }
      const item = await r.json();
      onSaved(item);
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-[#F4F4F5]">
          <div>
            <h2 className="text-lg font-bold text-[#18181B]">Save for later</h2>
            <p className="text-xs text-[#71717A] mt-0.5">A link, a video reference or a design idea.</p>
          </div>
          <button onClick={onClose} className="text-[#A1A1AA] hover:text-[#52525B] p-1 rounded-lg hover:bg-[#F4F4F5]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-2 block">Type</label>
            <div className="grid grid-cols-4 gap-2">
              {(["link", "video", "design", "other"] as Kind[]).map(k => {
                const m = kindMeta(k);
                const Icon = m.icon;
                const active = kind === k;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all",
                      active
                        ? "border-[#1e82b4] bg-[#1e82b4]/5 text-[#1e82b4]"
                        : "border-[#E4E4E7] text-[#71717A] hover:border-[#D4D4D8]"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", active ? "text-[#1e82b4]" : m.color)} />
                    <span className="text-xs font-semibold capitalize">{k}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-1.5 block">URL</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://…"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#E4E4E7] focus:border-[#1e82b4] focus:outline-none focus:ring-1 focus:ring-[#1e82b4]/30"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-1.5 block">Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Optional — what is this?"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#E4E4E7] focus:border-[#1e82b4] focus:outline-none focus:ring-1 focus:ring-[#1e82b4]/30"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-1.5 block">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Why is this worth saving? What might you use it for?"
              rows={3}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#E4E4E7] focus:border-[#1e82b4] focus:outline-none focus:ring-1 focus:ring-[#1e82b4]/30 resize-none"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-1.5 block">Thumbnail URL <span className="normal-case text-gray-300 font-normal">(optional)</span></label>
            <input
              type="url"
              value={thumbnailUrl}
              onChange={e => setThumbnailUrl(e.target.value)}
              placeholder="https://… image preview"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#E4E4E7] focus:border-[#1e82b4] focus:outline-none focus:ring-1 focus:ring-[#1e82b4]/30"
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F4F4F5]">
            <button type="button" onClick={onClose} className="text-sm text-[#71717A] hover:text-[#3F3F46] font-medium px-3 py-2">Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#1e82b4] hover:bg-[#1a6d99] px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
