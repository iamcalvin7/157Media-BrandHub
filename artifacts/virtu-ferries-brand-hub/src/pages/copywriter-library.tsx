import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Facebook, Instagram, Copy, Check, Trash2, Loader2, Library, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type LibraryEntry = {
  id: number;
  caption: string | null;
  platform: string | null;
  market: string | null;
  post_type: string | null;
  created_at: string;
};

export default function CopywriterLibrary() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

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

  const postTypes = Array.from(new Set(entries.map(e => e.post_type).filter(Boolean))) as string[];
  const filtered = filterType
    ? entries.filter(e => e.post_type === filterType)
    : entries;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

        {/* Header */}
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
                Click "This worked" on any option in the Copywriter and it will appear here.
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
                    {entry.platform && (
                      <span className={cn(
                        "flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full text-white",
                        entry.platform === "Facebook" ? "bg-[#1877F2]" : "bg-[#E1306C]"
                      )}>
                        {entry.platform === "Facebook" ? <Facebook className="w-2.5 h-2.5" /> : <Instagram className="w-2.5 h-2.5" />}
                        {entry.platform}
                      </span>
                    )}
                    {entry.market && (
                      <span className="text-[10px] font-semibold text-[#1e82b4] bg-[#1e82b4]/10 px-2 py-0.5 rounded-full">
                        {entry.market === "Italian" ? "🇮🇹" : "🇬🇧"} {entry.market}
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
    </div>
  );
}
