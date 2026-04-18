import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Search, X, Trash2, Download, Copy, Check, Image as ImageIcon, Video, FileText, Loader2, Tag, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type Kind = "image" | "video" | "document" | "other";

interface MediaAsset {
  id: number;
  name: string;
  description: string | null;
  kind: Kind;
  objectPath: string;
  mimeType: string | null;
  sizeBytes: number | null;
  tags: string[];
  createdAt: string;
}

const KINDS: { value: Kind | "all"; label: string; icon: any }[] = [
  { value: "all", label: "All", icon: ImageIcon },
  { value: "image", label: "Images", icon: ImageIcon },
  { value: "video", label: "Videos", icon: Video },
  { value: "document", label: "Documents", icon: FileText },
];

function kindIcon(kind: Kind) {
  if (kind === "image") return ImageIcon;
  if (kind === "video") return Video;
  if (kind === "document") return FileText;
  return FileText;
}

function formatSize(b: number | null) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function resolveSrc(path: string): string {
  if (path.startsWith("/objects/")) return `${API}/api/storage${path}`;
  if (path.startsWith("/")) return `${API}${path}`;
  return path;
}

export function MediaLibrary() {
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Kind | "all">("all");
  const [search, setSearch] = useState("");
  const [previewing, setPreviewing] = useState<MediaAsset | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/media-assets`);
      const data = await r.json();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
    if (previewing?.id === id) setPreviewing(null);
    await fetch(`${API}/api/media-assets/${id}`, { method: "DELETE" });
  }

  async function handleUpdate(id: number, patch: Partial<Pick<MediaAsset, "name" | "description" | "tags">>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
    if (previewing?.id === id) setPreviewing(p => p ? { ...p, ...patch } : p);
    await fetch(`${API}/api/media-assets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  const visible = items.filter(i => {
    if (filter !== "all" && i.kind !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = [i.name, i.description, i.tags.join(" ")].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const counts: Record<string, number> = { all: items.length };
  for (const k of ["image", "video", "document"] as Kind[]) counts[k] = items.filter(i => i.kind === k).length;

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#e01814] block" />
          Media Library
        </h2>
        <Uploader onUploaded={(asset) => setItems(prev => [asset, ...prev])} />
      </div>

      <p className="text-sm text-gray-500 -mt-2">
        Photography, video and reference files for the team. Upload once, reuse everywhere.
      </p>

      {/* Filters + search */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
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
                  active ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-900"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {k.label}
                <span className={cn("text-[10px] font-bold ml-0.5", active ? "text-white/70" : "text-gray-400")}>
                  {counts[k.value] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, tag…"
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-[#1e82b4] focus:outline-none focus:ring-1 focus:ring-[#1e82b4]/30"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {items.length === 0 ? "No media uploaded yet." : "No items match this filter."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {visible.map(item => (
            <MediaCard key={item.id} item={item} onClick={() => setPreviewing(item)} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {previewing && (
          <PreviewModal
            asset={previewing}
            onClose={() => setPreviewing(null)}
            onDelete={() => handleDelete(previewing.id)}
            onUpdate={(patch) => handleUpdate(previewing.id, patch)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function MediaCard({ item, onClick }: { item: MediaAsset; onClick: () => void }) {
  const Icon = kindIcon(item.kind);
  const src = resolveSrc(item.objectPath);
  return (
    <motion.button
      layout
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group text-left bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all overflow-hidden flex flex-col"
    >
      <div className="aspect-square bg-gray-50 relative overflow-hidden flex items-center justify-center">
        {item.kind === "image" ? (
          <img src={src} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : item.kind === "video" ? (
          <>
            <video src={src} className="w-full h-full object-cover" preload="metadata" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <Video className="w-8 h-8 text-white drop-shadow" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Icon className="w-10 h-10" />
            <span className="text-[10px] uppercase tracking-wider font-semibold">{item.mimeType?.split("/")[1] ?? item.kind}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{item.name}</p>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-gray-400">
          <span className="uppercase tracking-wider font-bold">{item.kind}</span>
          {item.sizeBytes && <span>{formatSize(item.sizeBytes)}</span>}
        </div>
      </div>
    </motion.button>
  );
}

function PreviewModal({ asset, onClose, onDelete, onUpdate }: {
  asset: MediaAsset;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (patch: Partial<Pick<MediaAsset, "name" | "description" | "tags">>) => void;
}) {
  const src = resolveSrc(asset.objectPath);
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [name, setName] = useState(asset.name);
  const [description, setDescription] = useState(asset.description ?? "");
  const [tagInput, setTagInput] = useState("");

  function copyLink() {
    const fullUrl = window.location.origin + src;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function commitName() {
    setEditingName(false);
    if (name.trim() && name.trim() !== asset.name) onUpdate({ name: name.trim() });
    else setName(asset.name);
  }

  function commitDesc() {
    setEditingDesc(false);
    const v = description.trim() || null;
    if (v !== (asset.description ?? null)) onUpdate({ description: v as any });
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (!t) return;
    if (asset.tags.includes(t)) { setTagInput(""); return; }
    onUpdate({ tags: [...asset.tags, t] });
    setTagInput("");
  }

  function removeTag(t: string) {
    onUpdate({ tags: asset.tags.filter(x => x !== t) });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="grid md:grid-cols-2">
          {/* Preview */}
          <div className="bg-gray-50 flex items-center justify-center p-6 min-h-[280px] md:min-h-[420px]">
            {asset.kind === "image" ? (
              <img src={src} alt={asset.name} className="max-w-full max-h-[420px] object-contain rounded-lg" />
            ) : asset.kind === "video" ? (
              <video src={src} controls className="max-w-full max-h-[420px] rounded-lg" />
            ) : (
              <div className="text-gray-400 flex flex-col items-center gap-3">
                <FileText className="w-16 h-16" />
                <a href={src} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#1e82b4] hover:underline">Open file</a>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="p-6 flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-4">
              <span className="text-[10px] uppercase tracking-wider font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {asset.kind}
              </span>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Name */}
            <div className="group mb-4">
              {editingName ? (
                <input
                  autoFocus
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={e => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setName(asset.name); setEditingName(false); } }}
                  className="w-full text-lg font-bold text-gray-900 border-b-2 border-[#1e82b4] bg-transparent focus:outline-none pb-1"
                />
              ) : (
                <button onClick={() => setEditingName(true)} className="text-left flex items-start gap-2 w-full">
                  <h3 className="text-lg font-bold text-gray-900 leading-snug flex-1">{asset.name}</h3>
                  <Pencil className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 mt-1.5 shrink-0" />
                </button>
              )}
            </div>

            {/* Description */}
            <div className="mb-5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-semibold">Description</p>
              {editingDesc ? (
                <textarea
                  autoFocus
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onBlur={commitDesc}
                  rows={3}
                  className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-2 focus:border-[#1e82b4] focus:outline-none focus:ring-1 focus:ring-[#1e82b4]/30 resize-none"
                />
              ) : (
                <button onClick={() => setEditingDesc(true)} className="text-left text-sm text-gray-600 leading-relaxed w-full hover:text-gray-900">
                  {asset.description?.trim() ? asset.description : <span className="text-gray-300 italic">Add a description…</span>}
                </button>
              )}
            </div>

            {/* Tags */}
            <div className="mb-5">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {asset.tags.map(t => (
                  <span key={t} className="group flex items-center gap-1 text-xs bg-[#1e82b4]/10 text-[#1e82b4] px-2 py-1 rounded-full font-medium">
                    {t}
                    <button onClick={() => removeTag(t)} className="text-[#1e82b4]/50 hover:text-[#1e82b4]">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  placeholder="Add tag…"
                  className="text-xs px-2 py-1 border border-gray-200 rounded-full focus:border-[#1e82b4] focus:outline-none w-24"
                />
              </div>
            </div>

            {/* Meta details */}
            <div className="text-xs text-gray-400 space-y-1 mb-5">
              {asset.mimeType && <p><span className="font-semibold text-gray-500">Type</span> · {asset.mimeType}</p>}
              {asset.sizeBytes && <p><span className="font-semibold text-gray-500">Size</span> · {formatSize(asset.sizeBytes)}</p>}
              <p><span className="font-semibold text-gray-500">Added</span> · {new Date(asset.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>

            {/* Actions */}
            <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
              {confirm ? (
                <div className="flex items-center gap-2">
                  <button onClick={onDelete} className="text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                  <button onClick={() => setConfirm(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirm(true)} className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
              <div className="flex items-center gap-2">
                <button onClick={copyLink} className="text-xs font-semibold text-gray-600 hover:text-[#1e82b4] flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy link"}
                </button>
                <a
                  href={src}
                  download={asset.name}
                  className="text-xs font-semibold text-white bg-[#1e82b4] hover:bg-[#1a6d99] px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Uploader({ onUploaded }: { onUploaded: (asset: MediaAsset) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadOne(file: File): Promise<MediaAsset> {
    const urlResp = await fetch(`${API}/api/storage/uploads/request-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
    });
    if (!urlResp.ok) throw new Error("Failed to get upload URL");
    const { uploadURL, objectPath } = await urlResp.json();
    const putResp = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!putResp.ok) throw new Error("Upload failed");
    const createResp = await fetch(`${API}/api/media-assets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: file.name.replace(/\.[^.]+$/, ""),
        objectPath,
        mimeType: file.type,
        sizeBytes: file.size,
      }),
    });
    if (!createResp.ok) throw new Error("Failed to register asset");
    return createResp.json();
  }

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setError(null);
    setUploading(true);
    setProgress({ current: 0, total: files.length });
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress({ current: i + 1, total: files.length });
        const asset = await uploadOne(files[i]);
        onUploaded(asset);
      }
    } catch (e: any) {
      setError(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-xs text-red-600">{error}</span>}
      {uploading && progress && (
        <span className="text-xs text-gray-500 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Uploading {progress.current} / {progress.total}…
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,video/*,application/pdf"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-1.5 bg-[#1e82b4] hover:bg-[#1a6d99] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm disabled:opacity-60"
      >
        <Upload className="w-4 h-4" />
        Upload
      </button>
    </div>
  );
}
