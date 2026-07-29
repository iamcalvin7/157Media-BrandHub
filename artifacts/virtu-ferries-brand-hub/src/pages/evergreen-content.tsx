import { useState, useEffect, useRef } from "react";
import {
  Leaf, Plus, ExternalLink, Trash2, Loader2, Video, Image as ImageIcon,
  Clock, RefreshCw, X, ChevronDown, Upload, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/brand";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type MediaType = "image" | "video";

interface EvergreenItem {
  id: number;
  brand_id: number;
  title: string;
  link: string | null;
  thumbnail_url: string | null;
  media_type: MediaType;
  last_used_at: string | null;
  notes: string | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtLastUsed(iso: string | null): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function thumbSrc(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/objects/")) return `${API}/api/storage/thumb${url}?w=200`;
  return url;
}

function serveSrc(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("/objects/")) return `${API}/api/storage${url}`;
  return url;
}

// ─── Thumbnail preview ────────────────────────────────────────────────────────

function Thumbnail({ item }: { item: EvergreenItem }) {
  const thumb = thumbSrc(item.thumbnail_url);
  const full = serveSrc(item.thumbnail_url);

  if (!thumb) {
    return (
      <div className="w-16 h-12 rounded-lg bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center shrink-0">
        {item.media_type === "video"
          ? <Video className="w-5 h-5 text-[#A1A1AA]" />
          : <ImageIcon className="w-5 h-5 text-[#A1A1AA]" />}
      </div>
    );
  }

  if (item.media_type === "video" && full) {
    return (
      <div className="w-16 h-12 rounded-lg overflow-hidden bg-black shrink-0 relative">
        <video src={full} className="w-full h-full object-cover" muted playsInline preload="none" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Video className="w-4 h-4 text-white drop-shadow" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-16 h-12 rounded-lg overflow-hidden bg-[#F4F4F5] border border-[#E4E4E7] shrink-0">
      <img src={thumb} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
    </div>
  );
}

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadToStorage(file: File): Promise<string> {
  const metaRes = await fetch(`${API}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!metaRes.ok) {
    const j = await metaRes.json().catch(() => ({})) as { error?: string };
    throw new Error(j.error ?? "Failed to get upload URL");
  }
  const { uploadURL, objectPath } = await metaRes.json() as { uploadURL: string; objectPath: string };
  const putRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
  if (!putRes.ok) throw new Error("Storage upload failed");
  return objectPath;
}

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

interface FormState {
  title: string;
  link: string;
  thumbnail_url: string;
  media_type: MediaType;
  notes: string;
}

const emptyForm: FormState = { title: "", link: "", thumbnail_url: "", media_type: "image", notes: "" };

function ItemModal({
  initial,
  onClose,
  onSaved,
  brandId,
}: {
  initial?: EvergreenItem;
  onClose: () => void;
  onSaved: (item: EvergreenItem) => void;
  brandId: number;
}) {
  const [form, setForm] = useState<FormState>(
    initial
      ? { title: initial.title, link: initial.link ?? "", thumbnail_url: initial.thumbnail_url ?? "", media_type: initial.media_type, notes: initial.notes ?? "" }
      : { ...emptyForm }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const path = await uploadToStorage(file);
      setForm(f => ({ ...f, thumbnail_url: path, media_type: file.type.startsWith("video/") ? "video" : "image" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const body = {
        title: form.title.trim(),
        link: form.link.trim() || null,
        thumbnail_url: form.thumbnail_url.trim() || null,
        media_type: form.media_type,
        notes: form.notes.trim() || null,
      };
      const res = await fetch(
        initial ? `${API}/api/evergreen-content/${initial.id}` : `${API}/api/evergreen-content`,
        {
          method: initial ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(j.error ?? "Save failed");
      }
      const saved = await res.json() as EvergreenItem;
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const thumb = thumbSrc(form.thumbnail_url || null);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white border border-[#E4E4E7] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#E4E4E7]">
          <h2 className="text-base font-bold text-[#18181B]">{initial ? "Edit item" : "Add evergreen item"}</h2>
          <button onClick={onClose} className="text-[#A1A1AA] hover:text-[#18181B] p-1 rounded-lg hover:bg-[#F4F4F5]"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-1">Title *</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Summer sailing video"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E4E7] bg-white text-[#18181B] placeholder:text-[#A1A1AA] focus:border-[#39A15F] focus:outline-none focus:ring-1 focus:ring-[#39A15F]/30"
            />
          </div>

          {/* Thumbnail upload */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-1">Thumbnail / Media</label>
            <div className="flex items-center gap-3">
              {thumb ? (
                <div className="w-20 h-14 rounded-lg overflow-hidden border border-[#E4E4E7] bg-[#F4F4F5] shrink-0">
                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-20 h-14 rounded-lg border-2 border-dashed border-[#E4E4E7] bg-[#FAFAFA] flex items-center justify-center shrink-0">
                  {form.media_type === "video" ? <Video className="w-5 h-5 text-[#A1A1AA]" /> : <ImageIcon className="w-5 h-5 text-[#A1A1AA]" />}
                </div>
              )}
              <div className="flex-1 space-y-1.5">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold border border-[#E4E4E7] text-[#71717A] hover:text-[#18181B] hover:border-[#D4D4D8] py-1.5 rounded-lg disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? "Uploading…" : "Upload file"}
                </button>
                <input
                  value={form.thumbnail_url}
                  onChange={e => setForm(f => ({ ...f, thumbnail_url: e.target.value }))}
                  placeholder="…or paste a URL"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E4E4E7] bg-white text-[#18181B] placeholder:text-[#A1A1AA] focus:border-[#39A15F] focus:outline-none focus:ring-1 focus:ring-[#39A15F]/30"
                />
              </div>
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-1">Type</label>
            <div className="flex gap-2">
              {(["image", "video"] as MediaType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, media_type: t }))}
                  className={cn(
                    "flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg border transition-colors",
                    form.media_type === t
                      ? "bg-[#39A15F] text-white border-[#39A15F]"
                      : "border-[#E4E4E7] text-[#71717A] hover:border-[#D4D4D8]"
                  )}
                >
                  {t === "video" ? <Video className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Link */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-1">Link</label>
            <input
              value={form.link}
              onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
              placeholder="https://…"
              type="url"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E4E7] bg-white text-[#18181B] placeholder:text-[#A1A1AA] focus:border-[#39A15F] focus:outline-none focus:ring-1 focus:ring-[#39A15F]/30"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Best performing in summer, use with Italian copy…"
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-[#E4E4E7] bg-white text-[#18181B] placeholder:text-[#A1A1AA] focus:border-[#39A15F] focus:outline-none focus:ring-1 focus:ring-[#39A15F]/30 resize-none"
            />
          </div>

          {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#E4E4E7]">
            <button type="button" onClick={onClose} className="text-sm text-[#A1A1AA] hover:text-[#18181B] font-medium px-3 py-2">Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#39A15F] hover:bg-[#2f8a50] px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              {initial ? "Save changes" : "Add item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Mark-as-used confirmation ────────────────────────────────────────────────

function MarkUsedButton({ item, onUpdated }: { item: EvergreenItem; onUpdated: (item: EvergreenItem) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function markUsed() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/evergreen-content/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ last_used_at: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error("Failed");
      const updated = await res.json() as EvergreenItem;
      onUpdated(updated);
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={markUsed}
          disabled={loading}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 px-2 py-1 rounded-md disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Confirm
        </button>
        <button onClick={() => setConfirming(false)} className="text-[11px] text-[#A1A1AA] hover:text-[#18181B] px-1">Cancel</button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1 text-[11px] text-[#71717A] hover:text-[#18181B] font-medium px-2 py-1 rounded-md hover:bg-[#F4F4F5] transition-colors group"
      title="Mark as used today"
    >
      <RefreshCw className="w-3 h-3 group-hover:text-emerald-600" />
      <span className={cn("tabular-nums", !item.last_used_at && "text-[#A1A1AA] italic")}>
        {fmtLastUsed(item.last_used_at)}
      </span>
    </button>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onUpdated,
  onEdit,
  onDelete,
}: {
  item: EvergreenItem;
  onUpdated: (item: EvergreenItem) => void;
  onEdit: (item: EvergreenItem) => void;
  onDelete: (id: number) => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function doDelete() {
    setDeleting(true);
    try {
      await fetch(`${API}/api/evergreen-content/${item.id}`, { method: "DELETE" });
      onDelete(item.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <tr className="border-b border-[#F4F4F5] last:border-0 hover:bg-[#FAFAFA] transition-colors group">
      {/* Thumbnail */}
      <td className="px-4 py-3 align-middle w-20">
        <Thumbnail item={item} />
      </td>

      {/* Title + notes */}
      <td className="px-4 py-3 align-middle min-w-0">
        <button
          onClick={() => onEdit(item)}
          className="text-left group/title"
        >
          <p className="text-sm font-semibold text-[#18181B] group-hover/title:text-[#39A15F] transition-colors leading-snug">{item.title}</p>
          {item.notes && <p className="text-xs text-[#A1A1AA] mt-0.5 line-clamp-1">{item.notes}</p>}
        </button>
      </td>

      {/* Type */}
      <td className="px-4 py-3 align-middle whitespace-nowrap">
        <span className={cn(
          "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border",
          item.media_type === "video"
            ? "bg-violet-50 text-violet-600 border-violet-200"
            : "bg-sky-50 text-sky-600 border-sky-200"
        )}>
          {item.media_type === "video" ? <Video className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
          {item.media_type}
        </span>
      </td>

      {/* Last used */}
      <td className="px-4 py-3 align-middle whitespace-nowrap">
        <MarkUsedButton item={item} onUpdated={onUpdated} />
      </td>

      {/* Link */}
      <td className="px-4 py-3 align-middle">
        {item.link ? (
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#1e82b4] hover:underline"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate max-w-[24ch]">{item.link.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
          </a>
        ) : (
          <span className="text-xs text-[#D4D4D8]">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 align-middle text-right">
        {confirmDel ? (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={doDelete}
              disabled={deleting}
              className="text-[11px] font-semibold text-white bg-red-600 hover:bg-red-500 px-2 py-1 rounded-md disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
            </button>
            <button onClick={() => setConfirmDel(false)} className="text-[11px] text-[#A1A1AA] hover:text-[#18181B] px-1">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDel(true)}
            className="text-[#A1A1AA] hover:text-red-500 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function EvergreenContent() {
  const { activeBrand } = useBrand();
  const [items, setItems] = useState<EvergreenItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<EvergreenItem | null>(null);
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");

  const accent = activeBrand?.primaryColor ?? "#39A15F";

  useEffect(() => {
    fetch(`${API}/api/evergreen-content`)
      .then(r => r.json())
      .then(d => setItems(d as EvergreenItem[]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const visible = filter === "all" ? items : items.filter(i => i.media_type === filter);

  function handleSaved(saved: EvergreenItem) {
    if (editItem) {
      setItems(prev => prev.map(i => i.id === saved.id ? saved : i));
      setEditItem(null);
    } else {
      setItems(prev => [saved, ...prev]);
      setShowAdd(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}18` }}>
            <Leaf className="w-4.5 h-4.5" style={{ color: accent }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#18181B] tracking-tight">Evergreen Content</h1>
            <p className="text-xs text-[#A1A1AA] mt-0.5">Reusable posts — track when each was last used</p>
          </div>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: accent }}
        >
          <Plus className="w-4 h-4" /> Add item
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 mb-4">
        {(["all", "image", "video"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors",
              filter === f
                ? "text-white border-transparent"
                : "border-[#E4E4E7] text-[#71717A] hover:border-[#D4D4D8] bg-white"
            )}
            style={filter === f ? { background: accent, borderColor: accent } : {}}
          >
            {f === "all" ? `All · ${items.length}` : f === "image" ? `Images · ${items.filter(i => i.media_type === "image").length}` : `Videos · ${items.filter(i => i.media_type === "video").length}`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E4E4E7] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-[#A1A1AA]">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-[#F4F4F5] flex items-center justify-center mb-3">
              <Leaf className="w-5 h-5 text-[#A1A1AA]" />
            </div>
            <p className="text-sm font-semibold text-[#18181B]">No evergreen content yet</p>
            <p className="text-xs text-[#A1A1AA] mt-1 max-w-xs">
              Add reusable posts — videos, images, or recurring creative — and track when you last used each one.
            </p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg"
              style={{ background: accent }}
            >
              <Plus className="w-4 h-4" /> Add first item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F4F4F5]">
                  <th className="px-4 py-3 text-left w-20" />
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">Title</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">Type</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">
                    <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Last used</span>
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA]">Link</th>
                  <th className="px-4 py-3 w-24" />
                </tr>
              </thead>
              <tbody>
                {visible.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onUpdated={updated => setItems(prev => prev.map(i => i.id === updated.id ? updated : i))}
                    onEdit={setEditItem}
                    onDelete={id => setItems(prev => prev.filter(i => i.id !== id))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && activeBrand && (
        <ItemModal
          onClose={() => setShowAdd(false)}
          onSaved={handleSaved}
          brandId={activeBrand.id}
        />
      )}
      {editItem && activeBrand && (
        <ItemModal
          initial={editItem}
          onClose={() => setEditItem(null)}
          onSaved={handleSaved}
          brandId={activeBrand.id}
        />
      )}
    </div>
  );
}
