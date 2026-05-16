import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bookmark, Plus, Trash2, ExternalLink, Link2, Video, Palette,
  FileText, Loader2, X, Search, Pencil, Upload, ImageIcon, Tag,
} from "lucide-react";
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
  tags: string[];
  createdAt: string;
}

// Tags are normalised server-side (lower-cased, trimmed, ≤40 chars). Anything
// that touches user-entered tag input on the client funnels through here so
// the displayed pills match what the server actually stored.
function normalizeTag(t: string): string {
  return t.trim().slice(0, 40).toLowerCase();
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

// Object-storage `objectPath`s come back as `/objects/...` from the presigned
// upload endpoint. To actually render them as <img src>, route through the
// storage server route (`/api/storage/objects/...`). Mirrors `resolveSrc` in
// `components/MediaLibrary.tsx`. External http(s) URLs and bundled `/media/...`
// paths pass through unchanged.
function resolveThumbnailSrc(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("/objects/")) return `${API}/api/storage${path}`;
  if (path.startsWith("/") && !path.startsWith("//")) return `${API}${path}`;
  return path;
}

// Auto-detect kind from URL so users don't have to think about it. Only fires
// for the *add* flow and only when the user hasn't manually picked a kind.
function detectKindFromUrl(url: string): Kind | null {
  const u = url.toLowerCase();
  if (!u) return null;
  if (/(youtube\.com|youtu\.be|vimeo\.com|tiktok\.com|instagram\.com\/reel|\/reels\/)/.test(u)) return "video";
  if (/(figma\.com|behance\.net|dribbble\.com|pinterest\.|are\.na)/.test(u)) return "design";
  if (/^https?:\/\//.test(u)) return "link";
  return null;
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
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: "add" } | { mode: "edit"; item: SavedItem } | null>(null);

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
    if (tagFilter && !(i.tags ?? []).includes(tagFilter)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = [i.title, i.url, i.notes, hostnameOf(i.url), ...(i.tags ?? [])]
        .filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const counts: Record<string, number> = { all: items.length };
  for (const k of ["link", "video", "design", "other"] as Kind[]) {
    counts[k] = items.filter(i => i.kind === k).length;
  }

  // Aggregate the universe of tags across the (kind-)filtered items so the
  // tag rail only ever surfaces categories that actually exist for the
  // current Kind view. Sorted by frequency desc, then alphabetically for a
  // stable order. The active tag filter is always shown even if it would
  // otherwise have zero matches under the current Kind, so users can see why
  // the grid is empty and one-click clear it.
  const tagCountMap = new Map<string, number>();
  for (const i of items) {
    if (filter !== "all" && i.kind !== filter) continue;
    for (const t of i.tags ?? []) tagCountMap.set(t, (tagCountMap.get(t) ?? 0) + 1);
  }
  if (tagFilter && !tagCountMap.has(tagFilter)) tagCountMap.set(tagFilter, 0);
  const tagList = [...tagCountMap.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );

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
            onClick={() => setModal({ mode: "add" })}
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

        {/* Tag rail — second-level filter under the kind pills. Only renders
            when there's at least one tag in the current Kind view, so empty
            brands don't show an empty row. */}
        {tagList.length > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mr-1">
              <Tag className="w-3 h-3" />
              Tags
            </div>
            {tagFilter && (
              <button
                onClick={() => setTagFilter(null)}
                className="flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border border-[#E4E4E7] text-[#71717A] hover:text-[#18181B] hover:border-[#A1A1AA]"
              >
                <X className="w-3 h-3" />
                Clear
              </button>
            )}
            {tagList.map(([tag, count]) => {
              const active = tagFilter === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setTagFilter(active ? null : tag)}
                  className={cn(
                    "text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors",
                    active
                      ? "bg-[#1e82b4] text-white border-[#1e82b4]"
                      : "bg-white text-[#52525B] border-[#E4E4E7] hover:border-[#1e82b4]/40 hover:text-[#1e82b4]"
                  )}
                >
                  #{tag}
                  <span className={cn("ml-1 text-[10px]", active ? "text-white/70" : "text-[#A1A1AA]")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

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
                  onClick={() => setModal({ mode: "add" })}
                  className="mt-4 text-sm font-semibold text-[#1e82b4] hover:text-[#1a6d99]"
                >
                  Save your first link →
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visible.map(item => (
                <SavedCard
                  key={item.id}
                  item={item}
                  onDelete={() => handleDelete(item.id)}
                  onEdit={() => setModal({ mode: "edit", item })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {modal && (
          <ItemModal
            mode={modal.mode}
            existing={modal.mode === "edit" ? modal.item : undefined}
            onClose={() => setModal(null)}
            onSaved={(item, mode) => {
              setItems(prev => mode === "add"
                ? [item, ...prev]
                : prev.map(i => i.id === item.id ? item : i));
              setModal(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SavedCard({ item, onDelete, onEdit }: {
  item: SavedItem;
  onDelete: () => void;
  onEdit: () => void;
}) {
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
          <img src={resolveThumbnailSrc(item.thumbnailUrl)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
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
        {(item.tags?.length ?? 0) > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.tags!.map(t => (
              <span
                key={t}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#1e82b4]/8 text-[#1e82b4] border border-[#1e82b4]/15"
              >
                #{t}
              </span>
            ))}
          </div>
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
            <button
              onClick={onEdit}
              aria-label="Edit saved item"
              className="text-gray-300 hover:text-[#1e82b4] p-1 rounded-md transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e82b4]/40"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {confirm ? (
              <div className="flex items-center gap-1">
                <button onClick={onDelete} className="text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-md">Delete</button>
                <button onClick={() => setConfirm(false)} className="text-[11px] text-[#A1A1AA] hover:text-[#52525B] px-1">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirm(true)}
                aria-label="Delete saved item"
                className="text-gray-300 hover:text-red-500 p-1 rounded-md transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
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

/**
 * Shared Add + Edit modal. `mode` controls the verb in the chrome and which
 * HTTP verb fires on submit (POST for add, PATCH for edit). The thumbnail
 * field now accepts either an uploaded image (via the existing presigned-URL
 * pipeline at /api/storage/uploads/request-url) OR a pasted URL, with a live
 * preview either way. The auto-detect-kind helper only runs in add mode and
 * only when the user hasn't manually picked a kind, so editing an item never
 * silently rewrites its kind out from under them.
 */
function ItemModal({
  mode, existing, onClose, onSaved,
}: {
  mode: "add" | "edit";
  existing?: SavedItem;
  onClose: () => void;
  onSaved: (item: SavedItem, mode: "add" | "edit") => void;
}) {
  const [kind, setKind] = useState<Kind>(existing?.kind ?? "link");
  const [kindTouched, setKindTouched] = useState(mode === "edit");
  const [url, setUrl] = useState(existing?.url ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(existing?.thumbnailUrl ?? "");
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [tagDraft, setTagDraft] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbBroken, setThumbBroken] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Reset the broken-image flag whenever the source changes so a new upload or
  // a corrected paste-URL recovers immediately without remounting the <img>.
  useEffect(() => { setThumbBroken(false); }, [thumbnailUrl]);

  function onUrlChange(next: string) {
    setUrl(next);
    if (mode === "add" && !kindTouched) {
      const detected = detectKindFromUrl(next);
      if (detected) setKind(detected);
    }
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Thumbnails must be an image (JPG, PNG, WebP).");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const urlResp = await fetch(`${API}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlResp.ok) throw new Error("Couldn't request an upload URL.");
      const { uploadURL, objectPath } = await urlResp.json();
      const putResp = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putResp.ok) throw new Error("Upload failed — please try again.");
      setThumbnailUrl(objectPath);
    } catch (e: any) {
      setError(e?.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim() && !title.trim() && !notes.trim()) {
      setError("Add a URL, a title, or some notes — anything to identify it.");
      return;
    }
    setSaving(true);
    try {
      // Fold any half-typed tag still in the input into the payload so users
      // who hit Save without pressing Enter/comma first don't lose it.
      const pendingTag = normalizeTag(tagDraft);
      const finalTags = pendingTag && !tags.includes(pendingTag)
        ? [...tags, pendingTag] : tags;
      const body = {
        kind,
        url: url.trim() || null,
        title: title.trim() || null,
        notes: notes.trim() || null,
        thumbnailUrl: thumbnailUrl.trim() || null,
        tags: finalTags,
      };
      const r = await fetch(
        mode === "add"
          ? `${API}/api/saved-items`
          : `${API}/api/saved-items/${existing!.id}`,
        {
          method: mode === "add" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save");
      }
      const item = await r.json();
      onSaved(item, mode);
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
            <h2 className="text-lg font-bold text-[#18181B]">
              {mode === "add" ? "Save for later" : "Edit saved item"}
            </h2>
            <p className="text-xs text-[#71717A] mt-0.5">
              {mode === "add"
                ? "A link, a video reference or a design idea."
                : "Update any field, then save."}
            </p>
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
                    onClick={() => { setKind(k); setKindTouched(true); }}
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
              onChange={e => onUrlChange(e.target.value)}
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

          {/* Thumbnail — upload or paste URL. Live preview always shows
              whichever source is set, so editors immediately see what will
              render on the card. */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-1.5 block">
              Thumbnail <span className="normal-case text-gray-300 font-normal">(optional)</span>
            </label>

            <div className="flex items-stretch gap-3">
              {/* Preview */}
              <div className="w-24 h-24 shrink-0 rounded-lg border border-[#E4E4E7] bg-[#F4F4F5] overflow-hidden flex items-center justify-center">
                {thumbnailUrl && !thumbBroken ? (
                  <img
                    src={resolveThumbnailSrc(thumbnailUrl)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => setThumbBroken(true)}
                  />
                ) : (
                  <ImageIcon className="w-5 h-5 text-[#D4D4D8]" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) void handleFile(f);
                    e.target.value = "";
                  }}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#18181B] bg-white border border-[#E4E4E7] hover:border-[#A1A1AA] px-3 py-2 rounded-lg disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploading ? "Uploading…" : "Upload image"}
                  </button>
                  {thumbnailUrl && (
                    <button
                      type="button"
                      onClick={() => setThumbnailUrl("")}
                      className="text-[11px] text-[#A1A1AA] hover:text-red-500 font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={e => setThumbnailUrl(e.target.value)}
                  placeholder="…or paste an image URL"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#E4E4E7] focus:border-[#1e82b4] focus:outline-none focus:ring-1 focus:ring-[#1e82b4]/30"
                />
              </div>
            </div>
          </div>

          {/* Tags — chip-style multi-input. Enter or comma commits the
              current draft, Backspace on an empty draft pops the last chip.
              All tags are normalised (lower-case, ≤40 chars) so the same
              spelling always maps to the same filter pill on the page. */}
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-1.5 block">
              Tags <span className="normal-case text-gray-300 font-normal">(optional — e.g. summer, visual, pillar:guides)</span>
            </label>
            <div
              className="flex flex-wrap items-center gap-1.5 px-2 py-2 rounded-lg border border-[#E4E4E7] focus-within:border-[#1e82b4] focus-within:ring-1 focus-within:ring-[#1e82b4]/30"
              onClick={() => (document.getElementById("tag-draft-input") as HTMLInputElement | null)?.focus()}
            >
              {tags.map(t => (
                <span
                  key={t}
                  className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#1e82b4]/10 text-[#1e82b4] border border-[#1e82b4]/20"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setTags(prev => prev.filter(x => x !== t)); }}
                    className="hover:text-red-500"
                    aria-label={`Remove tag ${t}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                id="tag-draft-input"
                value={tagDraft}
                onChange={e => {
                  const v = e.target.value;
                  // Commit on comma: split out everything except the
                  // trailing fragment, push the rest as chips.
                  if (v.includes(",")) {
                    const parts = v.split(",");
                    const tail = parts.pop() ?? "";
                    const next = [...tags];
                    for (const p of parts) {
                      const n = normalizeTag(p);
                      if (n && !next.includes(n)) next.push(n);
                    }
                    setTags(next);
                    setTagDraft(tail.trimStart());
                  } else {
                    setTagDraft(v);
                  }
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const n = normalizeTag(tagDraft);
                    if (n && !tags.includes(n)) setTags([...tags, n]);
                    setTagDraft("");
                  } else if (e.key === "Backspace" && !tagDraft && tags.length) {
                    e.preventDefault();
                    setTags(tags.slice(0, -1));
                  }
                }}
                placeholder={tags.length ? "" : "Type and press Enter…"}
                className="flex-1 min-w-[8rem] text-xs px-1 py-0.5 bg-transparent focus:outline-none"
              />
            </div>
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F4F4F5]">
            <button type="button" onClick={onClose} className="text-sm text-[#71717A] hover:text-[#3F3F46] font-medium px-3 py-2">Cancel</button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#1e82b4] hover:bg-[#1a6d99] px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className="w-3.5 h-3.5" />}
              {mode === "add" ? "Save" : "Save changes"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
