import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, ExternalLink, Trash2, Loader2, Plus, Pencil, X, Printer, FileText, ImageIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface BrandPrint {
  id: number;
  brand_id: number;
  title: string;
  description: string | null;
  media_url: string;
  media_kind: "image" | "pdf";
  drive_url: string | null;
  print_type: string | null;
  created_at: string;
}

// Standard print asset types — shown as quick-fill presets in the editor
// and as the dropdown options for the Type field.
const PRINT_TYPES = [
  "Flyer",
  "Poster",
  "Leaflet",
  "Brochure",
  "Magazine Ad",
  "Newspaper Ad",
  "Billboard",
  "Bus Shelter Ad",
  "Roll-up Banner",
  "A4 Factsheet",
  "Timetable",
  "Ticket",
  "Sticker",
  "Other",
] as const;

// Standard asset presets — clicking one pre-fills title + description in the editor.
const STANDARD_ASSETS: { type: string; label: string; description: string }[] = [
  { type: "Flyer", label: "A5 Flyer", description: "A5 double-sided promotional flyer." },
  { type: "Poster", label: "A3 Poster", description: "A3 portrait poster for port and terminal display." },
  { type: "Leaflet", label: "DL Leaflet", description: "DL tri-fold leaflet for customer information." },
  { type: "Brochure", label: "A4 Brochure", description: "A4 folded brochure — route overview and onboard services." },
  { type: "Magazine Ad", label: "Magazine Ad (Full Page)", description: "Full-page magazine advertisement — A4 format." },
  { type: "Magazine Ad", label: "Magazine Ad (Half Page)", description: "Half-page magazine advertisement — landscape." },
  { type: "Newspaper Ad", label: "Newspaper Ad", description: "Newspaper display advertisement." },
  { type: "Billboard", label: "Billboard (6×3m)", description: "Large-format billboard — 6×3 m roadside." },
  { type: "Bus Shelter Ad", label: "Bus Shelter Ad", description: "Bus shelter 6-sheet poster (1200×1800 mm)." },
  { type: "Roll-up Banner", label: "Roll-up Banner", description: "Pull-up/roll-up banner for events and exhibitions." },
  { type: "A4 Factsheet", label: "A4 Factsheet", description: "Single A4 page — product or route fact sheet." },
  { type: "Timetable", label: "Seasonal Timetable", description: "Printed seasonal timetable leaflet." },
];

const MAX_BYTES = 25 * 1024 * 1024;

function resolveSrc(p: string): string {
  if (p.startsWith("/objects/")) return `${API}/api/storage${p}`;
  if (p.startsWith("/")) return `${API}${p}`;
  return p;
}

function formatUploaded(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-xs text-[#A1A1AA]">—</span>;
  return (
    <span className="inline-flex items-center text-[11px] font-medium text-[#52525B] bg-[#F4F4F5] px-2 py-0.5 rounded-full whitespace-nowrap">
      {type}
    </span>
  );
}

function Thumbnail({ item }: { item: BrandPrint }) {
  const [err, setErr] = useState(false);
  if (item.media_kind === "pdf" || err) {
    return (
      <div className="w-12 h-12 rounded-lg bg-[#F4F4F5] flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-[#71717A]" />
      </div>
    );
  }
  return (
    <div className="w-12 h-12 rounded-lg bg-[#F4F4F5] overflow-hidden shrink-0 border border-[#E4E4E7]">
      <img
        src={resolveSrc(item.media_url)}
        alt=""
        className="w-full h-full object-cover"
        onError={() => setErr(true)}
      />
    </div>
  );
}

export default function Prints() {
  const [items, setItems] = useState<BrandPrint[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BrandPrint | "new" | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/prints`);
      if (r.ok) setItems(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    if (!confirm("Delete this print?")) return;
    setItems(prev => prev.filter(i => i.id !== id));
    await fetch(`${API}/api/prints/${id}`, { method: "DELETE" });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-6xl mx-auto pb-24"
    >
      <header className="space-y-3 mb-10 flex items-start justify-between gap-4">
        <div className="space-y-3">
          <h1 className="font-extrabold text-4xl md:text-5xl text-[#18181B]">Print</h1>
          <p className="text-lg text-[#71717A] font-light max-w-2xl">
            Archive of printed materials — flyers, posters, leaflets. Upload the artwork or PDF,
            link the editable file on Google Drive.
          </p>
        </div>
        <Button onClick={() => setEditing("new")} className="shrink-0 gap-2">
          <Plus className="w-4 h-4" />
          New print
        </Button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#A1A1AA]">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-[#E4E4E7] rounded-2xl py-20 text-center bg-white">
          <Printer className="w-10 h-10 text-[#A1A1AA] mx-auto mb-4" />
          <p className="text-[#52525B] font-semibold mb-1">No prints yet</p>
          <p className="text-sm text-[#A1A1AA] mb-6">Add your first printed flyer, poster, or leaflet.</p>
          <Button onClick={() => setEditing("new")} className="gap-2">
            <Plus className="w-4 h-4" /> Add the first one
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E4E4E7] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-[#E4E4E7] text-left">
                  <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#71717A]">Title</th>
                  <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#71717A] w-36">Type</th>
                  <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#71717A] w-40">Uploaded</th>
                  <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#71717A]">Links</th>
                  <th className="px-5 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(t => (
                  <tr key={t.id} className="border-b border-[#F4F4F5] last:border-b-0 hover:bg-[#FAFAFA]">
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setEditing(t)}
                        className="flex items-center gap-3 text-left group/title"
                      >
                        <Thumbnail item={t} />
                        <span className="min-w-0">
                          <span className="block font-semibold text-[#18181B] group-hover/title:underline">{t.title}</span>
                          {t.description && (
                            <span className="block text-xs text-[#71717A] line-clamp-1 mt-0.5">{t.description}</span>
                          )}
                        </span>
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <TypeBadge type={t.print_type} />
                    </td>
                    <td className="px-5 py-4 text-[#52525B] whitespace-nowrap">{formatUploaded(t.created_at)}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <a
                          href={resolveSrc(t.media_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary)] hover:underline"
                        >
                          {t.media_kind === "pdf" ? "Open PDF" : "Open image"}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {t.drive_url ? (
                          <a
                            href={t.drive_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary)] hover:underline"
                          >
                            Google Drive
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-[#A1A1AA]">No Drive link</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditing(t)}
                          className="p-1.5 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5] transition"
                          aria-label="Edit print"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 rounded-lg text-[#71717A] hover:text-red-600 hover:bg-red-50 transition"
                          aria-label="Delete print"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <PrintEditor
          print={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setItems(prev => {
              const idx = prev.findIndex(p => p.id === saved.id);
              const next = idx === -1 ? [saved, ...prev] : prev.map((p, i) => i === idx ? saved : p);
              return [...next].sort((a, b) => b.created_at.localeCompare(a.created_at));
            });
            setEditing(null);
          }}
        />
      )}
    </motion.div>
  );
}

interface EditorProps {
  print: BrandPrint | null;
  onClose: () => void;
  onSaved: (t: BrandPrint) => void;
}

function PrintEditor({ print, onClose, onSaved }: EditorProps) {
  const [title, setTitle] = useState(print?.title ?? "");
  const [description, setDescription] = useState(print?.description ?? "");
  const [driveUrl, setDriveUrl] = useState(print?.drive_url ?? "");
  const [mediaUrl, setMediaUrl] = useState(print?.media_url ?? "");
  const [mediaKind, setMediaKind] = useState<"image" | "pdf">(print?.media_kind ?? "image");
  const [printType, setPrintType] = useState(print?.print_type ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPresets, setShowPresets] = useState(!print);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function applyPreset(preset: typeof STANDARD_ASSETS[number]) {
    setTitle(prev => prev || preset.label);
    setDescription(prev => prev || preset.description);
    setPrintType(preset.type);
    setShowPresets(false);
  }

  async function handleFile(file: File) {
    setError(null);
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      setError("Only images and PDFs are supported.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`File too large — must be under ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`);
      return;
    }
    setUploading(true);
    try {
      const reqResp = await fetch(`${API}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || (isPdf ? "application/pdf" : "application/octet-stream") }),
      });
      if (!reqResp.ok) throw new Error((await reqResp.json().catch(() => ({ error: "Upload failed" }))).error);
      const { uploadURL, objectPath } = await reqResp.json();
      const putResp = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type || (isPdf ? "application/pdf" : "application/octet-stream") },
        body: file,
      });
      if (!putResp.ok) throw new Error("Upload failed");
      setMediaUrl(objectPath);
      setMediaKind(isPdf ? "pdf" : "image");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setError(null);
    if (!title.trim()) { setError("Give your print a title."); return; }
    if (!mediaUrl) { setError("Upload an image or PDF."); return; }
    setSaving(true);
    try {
      const body = JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        media_url: mediaUrl,
        drive_url: driveUrl.trim() || null,
        print_type: printType.trim() || null,
      });
      const resp = print
        ? await fetch(`${API}/api/prints/${print.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
        : await fetch(`${API}/api/prints`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({ error: "Save failed" }))).error);
      onSaved(await resp.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <header className="px-6 py-4 border-b border-[#E4E4E7] flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-extrabold text-lg text-[#18181B]">{print ? "Edit print" : "New print"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F4F4F5]" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-6 space-y-5">
          {/* ─── Standard asset presets ─────────────────────────────────── */}
          {!print && (
            <div>
              <button
                type="button"
                onClick={() => setShowPresets(v => !v)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-primary)] hover:underline mb-2"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Start from a standard asset
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showPresets && "rotate-180")} />
              </button>
              {showPresets && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-[#FAFAFA] rounded-xl border border-[#E4E4E7]">
                  {STANDARD_ASSETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="text-left px-3 py-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-[#E4E4E7] transition-all"
                    >
                      <div className="text-[12px] font-semibold text-[#18181B] leading-tight">{preset.label}</div>
                      <div className="text-[10px] text-[#71717A] mt-0.5 leading-snug line-clamp-2">{preset.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Artwork upload ─────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-2">Artwork</label>
            {mediaUrl ? (
              <div className="relative rounded-xl border border-[#E4E4E7] overflow-hidden bg-[#F4F4F5]">
                {mediaKind === "pdf" ? (
                  <a
                    href={resolveSrc(mediaUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-6 hover:bg-[#FAFAFA]"
                  >
                    <FileText className="w-10 h-10 text-[var(--brand-primary)]" />
                    <div className="min-w-0">
                      <div className="font-semibold text-[#18181B]">PDF uploaded</div>
                      <div className="text-xs text-[#71717A] flex items-center gap-1">Open in new tab <ExternalLink className="w-3 h-3" /></div>
                    </div>
                  </a>
                ) : (
                  <img src={resolveSrc(mediaUrl)} alt="" className="w-full max-h-[320px] object-contain" />
                )}
                <button
                  onClick={() => inputRef.current?.click()}
                  className="absolute top-2 right-2 text-xs font-semibold bg-white/95 text-[#18181B] px-3 py-1.5 rounded-full shadow hover:bg-white"
                >
                  Replace
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className={cn(
                  "w-full border-2 border-dashed rounded-xl py-10 px-6 flex flex-col items-center gap-2 text-center transition",
                  uploading ? "border-[#A1A1AA] bg-[#FAFAFA] cursor-wait" : "border-[#E4E4E7] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5",
                )}
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--brand-primary)]" />
                ) : (
                  <Upload className="w-6 h-6 text-[#71717A]" />
                )}
                <span className="font-semibold text-[#18181B]">
                  {uploading ? "Uploading…" : "Upload image or PDF"}
                </span>
                <span className="text-xs text-[#A1A1AA]">Up to 25 MB</span>
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*,application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>

          {/* ─── Title ──────────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-2">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Summer 2026 flyer" />
          </div>

          {/* ─── Type dropdown ──────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-2">Type</label>
            <div className="relative">
              <select
                value={printType}
                onChange={(e) => setPrintType(e.target.value)}
                className="w-full appearance-none text-sm text-[#18181B] bg-white border border-[#E4E4E7] rounded-lg px-3 py-2 pr-8 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]/30"
              >
                <option value="">— Select type —</option>
                {PRINT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
            </div>
          </div>

          {/* ─── Google Drive ───────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-2">Google Drive link</label>
            <Input
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/…"
            />
          </div>

          {/* ─── Description ────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-2">Description (optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Where was it printed, what was the run, any usage notes?"
              rows={3}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-[#E4E4E7] flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (print ? "Save" : "Create print")}
          </Button>
        </footer>
      </motion.div>
    </div>
  );
}
