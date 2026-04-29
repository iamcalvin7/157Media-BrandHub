import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Facebook, Instagram, Copy, Check, Trash2, Loader2, Library, Tag, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/brand";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type LibraryEntry = {
  id: number;
  caption: string | null;
  platform: string | null;
  market: string | null;
  post_type: string | null;
  created_at: string;
};

const PLATFORMS = ["Facebook", "Instagram", "Both"];
const MARKETS = ["English Market", "Italian Market"];

function AddEntryPanel({ onClose, onAdded, isGozo }: { onClose: () => void; onAdded: (e: LibraryEntry) => void; isGozo: boolean }) {
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState("");
  const [market, setMarket] = useState("");
  const [postType, setPostType] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (!caption.trim()) { setError("Caption is required."); return; }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/content/copywriter-library`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: caption.trim(),
          platform: platform || null,
          market: market || null,
          post_type: postType.trim() || null,
        }),
      });
      if (!res.ok) { setError("Failed to save. Please try again."); return; }
      const entry: LibraryEntry = await res.json();
      onAdded(entry);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5";
  const inputCls = "w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/30 focus:border-[#1e82b4] bg-white";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-end"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ x: 420 }}
        animate={{ x: 0 }}
        exit={{ x: 420 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Add to Library</h2>
            <p className="text-xs text-gray-400 mt-0.5">Save a caption manually</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Caption */}
          <div>
            <label className={labelCls}>Caption <span className="text-red-400">*</span></label>
            <textarea
              rows={7}
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Paste or type the caption here…"
              className={inputCls + " resize-none leading-relaxed"}
            />
          </div>

          {/* Platform — VF only */}
          {!isGozo && (
            <div>
              <label className={labelCls}>Platform</label>
              <select value={platform} onChange={e => setPlatform(e.target.value)} className={inputCls}>
                <option value="">— Not specified —</option>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

          {/* Market — VF only */}
          {!isGozo && (
            <div>
              <label className={labelCls}>Market</label>
              <select value={market} onChange={e => setMarket(e.target.value)} className={inputCls}>
                <option value="">— Not specified —</option>
                {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          {/* Post type */}
          <div>
            <label className={labelCls}>Post type / tag</label>
            <input
              type="text"
              value={postType}
              onChange={e => setPostType(e.target.value)}
              placeholder="e.g. Offer, Destination, UGC…"
              className={inputCls}
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e82b4] hover:bg-[#1a6d99] text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Save to Library
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function CopywriterLibrary() {
  const { activeBrandSlug } = useBrand();
  const isGozo = activeBrandSlug === "gozo-highspeed";
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/content/copywriter-library`);
      const data = await res.json();
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLibrary(); }, [fetchLibrary]);

  async function remove(id: number) {
    await fetch(`${API}/api/content/copywriter-library/${id}`, { method: "DELETE" });
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function copyEntry(entry: LibraryEntry) {
    navigator.clipboard.writeText(entry.caption ?? "");
    setCopiedId(entry.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleAdded(entry: LibraryEntry) {
    setEntries(prev => [entry, ...prev]);
  }

  const postTypes = Array.from(new Set(entries.map(e => e.post_type).filter(Boolean))) as string[];
  const filtered = filterType ? entries.filter(e => e.post_type === filterType) : entries;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Library className="w-5 h-5 text-[#1e82b4]" />
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Copy Library</h1>
              {entries.length > 0 && (
                <span className="text-xs font-semibold text-[#1e82b4] bg-[#1e82b4]/10 px-2 py-0.5 rounded-full">
                  {entries.length}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 font-light">
              Captions you've marked as working well. Use them as inspiration or copy directly.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1e82b4] hover:bg-[#1a6d99] text-white text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add manually
          </button>
        </div>

        {/* Filters */}
        {postTypes.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType("")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
                filterType === ""
                  ? "bg-[#1e82b4] text-white border-[#1e82b4]"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
              )}
            >
              All types
            </button>
            {postTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all",
                  filterType === type
                    ? "bg-[#1e82b4] text-white border-[#1e82b4]"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                )}
              >
                <Tag className="w-3 h-3" />
                {type}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="w-7 h-7 text-[#1e82b4] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Library className="w-6 h-6 text-gray-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">
                {filterType ? `No "${filterType}" copies saved yet` : "No saved copies yet"}
              </p>
              <p className="text-xs text-gray-400 mt-1 font-light max-w-xs">
                Click "This worked" in the Copywriter, or use "Add manually" above.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {filtered.map((entry, i) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: i * 0.04 }}
                  layout
                  className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4 hover:border-gray-200 transition-colors flex flex-col"
                >
                  {/* Meta */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {!isGozo && entry.platform && (
                      <span className={cn(
                        "flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white",
                        entry.platform === "Facebook" ? "bg-[#1877F2]" : entry.platform === "Instagram" ? "bg-[#E1306C]" : "bg-gradient-to-r from-[#1877F2] to-[#E1306C]"
                      )}>
                        {entry.platform === "Facebook"
                          ? <Facebook className="w-2.5 h-2.5" />
                          : entry.platform === "Instagram"
                            ? <Instagram className="w-2.5 h-2.5" />
                            : <><Facebook className="w-2.5 h-2.5" /><Instagram className="w-2.5 h-2.5" /></>}
                        {entry.platform}
                      </span>
                    )}
                    {!isGozo && entry.market && (
                      <span className="text-[10px] font-semibold text-[#1e82b4] bg-[#1e82b4]/10 px-2 py-0.5 rounded-full">
                        {entry.market === "Italian Market" ? "🇮🇹" : "🇬🇧"} {entry.market}
                      </span>
                    )}
                    {entry.post_type && (
                      <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                        {entry.post_type}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-300 ml-auto">
                      {new Date(entry.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>

                  {/* Caption */}
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-light flex-1">
                    {entry.caption}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => copyEntry(entry)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                        copiedId === entry.id
                          ? "bg-green-500 text-white"
                          : "bg-[#1e82b4] hover:bg-[#1a6d99] text-white"
                      )}
                    >
                      {copiedId === entry.id
                        ? <><Check className="w-3.5 h-3.5" /> Copied!</>
                        : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>
                    <button
                      onClick={() => remove(entry.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-all ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add panel */}
      <AnimatePresence>
        {showAdd && (
          <AddEntryPanel
            onClose={() => setShowAdd(false)}
            onAdded={handleAdded}
            isGozo={isGozo}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
