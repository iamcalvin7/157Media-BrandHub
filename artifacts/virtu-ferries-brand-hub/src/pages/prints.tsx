import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Upload, ExternalLink, Trash2, Loader2, Plus, Pencil, X,
  Printer, FileText, ImageIcon, ChevronDown, Link2, GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface PrintFile {
  url: string;
  kind: "image" | "pdf";
  label: string;
}

interface PrintLink {
  url: string;
  label: string;
}

interface BrandPrint {
  id: number;
  brand_id: number;
  title: string;
  description: string | null;
  media_url: string;
  media_kind: "image" | "pdf";
  drive_url: string | null;
  print_type: string | null;
  thumbnail_url: string | null;
  files: PrintFile[] | null;
  links: PrintLink[] | null;
  created_at: string;
}

const PRINT_TYPES = [
  "Flyer", "Poster", "Leaflet", "Brochure", "Magazine Ad", "Newspaper Ad",
  "Billboard", "Bus Shelter Ad", "Roll-up Banner", "A4 Factsheet", "Timetable",
  "Ticket", "Sticker", "Other",
] as const;

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

function getDisplayFiles(item: BrandPrint): PrintFile[] {
  if (item.files && item.files.length > 0) return item.files;
  if (item.media_url) return [{ url: item.media_url, kind: item.media_kind, label: "" }];
  return [];
}

function getDisplayLinks(item: BrandPrint): PrintLink[] {
  if (item.links && item.links.length > 0) return item.links;
  if (item.drive_url) return [{ url: item.drive_url, label: "Google Drive" }];
  return [];
}

function Thumbnail({ item }: { item: BrandPrint }) {
  const [err, setErr] = useState(false);
  const files = getDisplayFiles(item);
  const firstImage = item.thumbnail_url ?? files.find(f => f.kind === "image")?.url ?? null;
  if (!firstImage || err) {
    return (
      <div className="w-12 h-12 rounded-lg bg-[#F4F4F5] flex items-center justify-center shrink-0">
        <FileText className="w-5 h-5 text-[#71717A]" />
      </div>
    );
  }
  return (
    <div className="w-12 h-12 rounded-lg bg-[#F4F4F5] overflow-hidden shrink-0 border border-[#E4E4E7]">
      <img
        src={resolveSrc(firstImage)}
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
            Archive of printed materials — flyers, posters, leaflets. Upload artwork or PDFs,
            link editable files and references.
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
                  <th className="px-5 py-3 font-bold text-xs uppercase tracking-wider text-[#71717A]">Files & Links</th>
                  <th className="px-5 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(t => {
                  const displayFiles = getDisplayFiles(t);
                  const displayLinks = getDisplayLinks(t);
                  return (
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
                        <div className="flex flex-col gap-1">
                          {displayFiles.map((f, i) => (
                            <a
                              key={i}
                              href={resolveSrc(f.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary)] hover:underline"
                            >
                              {f.kind === "pdf" ? <FileText className="w-3.5 h-3.5 shrink-0" /> : <ImageIcon className="w-3.5 h-3.5 shrink-0" />}
                              {f.label || (f.kind === "pdf" ? "PDF" : "Image")}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                          {displayLinks.map((l, i) => (
                            <a
                              key={i}
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary)] hover:underline"
                            >
                              <Link2 className="w-3.5 h-3.5 shrink-0" />
                              {l.label || "Link"}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ))}
                          {displayFiles.length === 0 && displayLinks.length === 0 && (
                            <span className="text-xs text-[#A1A1AA]">No files</span>
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
                  );
                })}
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
  const [printType, setPrintType] = useState(print?.print_type ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(print?.thumbnail_url ?? "");
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPresets, setShowPresets] = useState(!print);

  // Multi-file state — init from files array or legacy media_url
  const [files, setFiles] = useState<PrintFile[]>(() => {
    if (!print) return [];
    if (print.files && print.files.length > 0) return print.files;
    if (print.media_url) return [{ url: print.media_url, kind: print.media_kind, label: "" }];
    return [];
  });

  // Multi-link state — init from links array or legacy drive_url
  const [links, setLinks] = useState<PrintLink[]>(() => {
    if (!print) return [];
    if (print.links && print.links.length > 0) return print.links;
    if (print.drive_url) return [{ url: print.drive_url, label: "Google Drive" }];
    return [];
  });

  const addFileRef = useRef<HTMLInputElement | null>(null);
  const thumbRef = useRef<HTMLInputElement | null>(null);

  function applyPreset(preset: typeof STANDARD_ASSETS[number]) {
    setTitle(prev => prev || preset.label);
    setDescription(prev => prev || preset.description);
    setPrintType(preset.type);
    setShowPresets(false);
  }

  async function uploadFile(file: File): Promise<{ url: string; kind: "image" | "pdf" } | null> {
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      setError("Only images and PDFs are supported.");
      return null;
    }
    if (file.size > MAX_BYTES) {
      setError(`File too large — must be under ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`);
      return null;
    }
    const ct = file.type || (isPdf ? "application/pdf" : "application/octet-stream");
    const reqResp = await fetch(`${API}/api/storage/uploads/request-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: ct }),
    });
    if (!reqResp.ok) throw new Error((await reqResp.json().catch(() => ({ error: "Upload failed" }))).error);
    const { uploadURL, objectPath } = await reqResp.json();
    const putResp = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": ct }, body: file });
    if (!putResp.ok) throw new Error("Upload failed");
    return { url: objectPath, kind: isPdf ? "pdf" : "image" };
  }

  async function handleAddFile(file: File) {
    setError(null);
    setUploadingFile(true);
    try {
      const result = await uploadFile(file);
      if (!result) return;
      const stem = file.name.replace(/\.[^.]+$/, "");
      setFiles(prev => [...prev, { url: result.url, kind: result.kind, label: stem }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleThumbFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Thumbnail must be an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`File too large — must be under ${Math.round(MAX_BYTES / 1024 / 1024)} MB.`);
      return;
    }
    setUploadingThumb(true);
    try {
      const reqResp = await fetch(`${API}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!reqResp.ok) throw new Error((await reqResp.json().catch(() => ({ error: "Upload failed" }))).error);
      const { uploadURL, objectPath } = await reqResp.json();
      const putResp = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!putResp.ok) throw new Error("Upload failed");
      setThumbnailUrl(objectPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingThumb(false);
    }
  }

  function updateFileLabel(idx: number, label: string) {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, label } : f));
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  }

  function addLink() {
    setLinks(prev => [...prev, { url: "", label: "" }]);
  }

  function updateLink(idx: number, field: "url" | "label", value: string) {
    setLinks(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }

  function removeLink(idx: number) {
    setLinks(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setError(null);
    if (!title.trim()) { setError("Give your print a title."); return; }
    if (files.length === 0) { setError("Upload at least one image or PDF."); return; }
    // Validate links — must have both label and url
    for (const l of links) {
      if (!l.url.trim()) { setError("All links need a URL."); return; }
    }
    setSaving(true);
    try {
      const body = JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        print_type: printType.trim() || null,
        thumbnail_url: thumbnailUrl || null,
        files: files.map(f => ({ url: f.url, kind: f.kind, label: f.label.trim() })),
        links: links.filter(l => l.url.trim()).map(l => ({ url: l.url.trim(), label: l.label.trim() || "Link" })),
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

          {/* ─── Files (multi-upload) ────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-2">
              Files <span className="normal-case font-normal text-[#A1A1AA]">— images and PDFs</span>
            </label>

            {files.length > 0 && (
              <div className="space-y-2 mb-2">
                {files.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 bg-[#FAFAFA] rounded-xl border border-[#E4E4E7]">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-white border border-[#E4E4E7] flex items-center justify-center">
                      {f.kind === "pdf"
                        ? <FileText className="w-4 h-4 text-[var(--brand-primary)]" />
                        : <ImageIcon className="w-4 h-4 text-[var(--brand-primary)]" />}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <Input
                        value={f.label}
                        onChange={(e) => updateFileLabel(idx, e.target.value)}
                        placeholder={f.kind === "pdf" ? "Label, e.g. English PDF" : "Label, e.g. Front artwork"}
                        className="h-8 text-sm"
                      />
                    </div>
                    <a
                      href={resolveSrc(f.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-[#71717A] hover:text-[var(--brand-primary)] hover:bg-white transition"
                      aria-label="Open file"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="p-1.5 rounded-lg text-[#71717A] hover:text-red-600 hover:bg-red-50 transition"
                      aria-label="Remove file"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => addFileRef.current?.click()}
              disabled={uploadingFile}
              className={cn(
                "w-full border-2 border-dashed rounded-xl py-5 px-6 flex items-center justify-center gap-2 transition",
                uploadingFile
                  ? "border-[#A1A1AA] bg-[#FAFAFA] cursor-wait"
                  : "border-[#E4E4E7] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5",
              )}
            >
              {uploadingFile
                ? <Loader2 className="w-4 h-4 animate-spin text-[var(--brand-primary)]" />
                : <Upload className="w-4 h-4 text-[#71717A]" />}
              <span className="text-sm font-semibold text-[#52525B]">
                {uploadingFile ? "Uploading…" : files.length === 0 ? "Upload image or PDF" : "Add another file"}
              </span>
              <span className="text-xs text-[#A1A1AA]">up to 25 MB</span>
            </button>
            <input
              ref={addFileRef}
              type="file"
              accept="image/*,application/pdf,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAddFile(f);
                e.target.value = "";
              }}
            />
          </div>

          {/* ─── Cover thumbnail ────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-2">
              Cover image <span className="normal-case font-normal text-[#A1A1AA]">— thumbnail shown in the list</span>
            </label>
            {thumbnailUrl ? (
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-xl border border-[#E4E4E7] overflow-hidden bg-[#F4F4F5] shrink-0">
                  <img src={resolveSrc(thumbnailUrl)} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <button type="button" onClick={() => thumbRef.current?.click()} disabled={uploadingThumb}
                    className="text-xs font-semibold text-[var(--brand-primary)] hover:underline">
                    {uploadingThumb ? "Uploading…" : "Replace"}
                  </button>
                  <button type="button" onClick={() => setThumbnailUrl("")} className="text-xs text-[#A1A1AA] hover:text-red-500">
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => thumbRef.current?.click()}
                disabled={uploadingThumb}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed transition",
                  uploadingThumb
                    ? "border-[#A1A1AA] bg-[#FAFAFA] cursor-wait"
                    : "border-[#E4E4E7] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5",
                )}
              >
                {uploadingThumb
                  ? <Loader2 className="w-5 h-5 animate-spin text-[var(--brand-primary)]" />
                  : <ImageIcon className="w-5 h-5 text-[#71717A]" />}
                <span className="text-sm text-[#52525B]">
                  {uploadingThumb ? "Uploading…" : "Upload a cover image"}
                </span>
              </button>
            )}
            <input ref={thumbRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleThumbFile(f);
                e.target.value = "";
              }}
            />
          </div>

          {/* ─── Links (multi-link) ──────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-2">
              Links <span className="normal-case font-normal text-[#A1A1AA]">— Google Drive, Dropbox, Canva, etc.</span>
            </label>

            {links.length > 0 && (
              <div className="space-y-2 mb-2">
                {links.map((l, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 bg-[#FAFAFA] rounded-xl border border-[#E4E4E7]">
                    <Link2 className="w-4 h-4 text-[#A1A1AA] shrink-0" />
                    <Input
                      value={l.label}
                      onChange={(e) => updateLink(idx, "label", e.target.value)}
                      placeholder="Label, e.g. Google Drive"
                      className="h-8 text-sm w-36 shrink-0"
                    />
                    <Input
                      value={l.url}
                      onChange={(e) => updateLink(idx, "url", e.target.value)}
                      placeholder="https://…"
                      className="h-8 text-sm flex-1 min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() => removeLink(idx)}
                      className="p-1.5 rounded-lg text-[#71717A] hover:text-red-600 hover:bg-red-50 transition shrink-0"
                      aria-label="Remove link"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addLink}
              className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-[var(--brand-primary)] rounded-lg border border-dashed border-[#E4E4E7] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Add link
            </button>
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

        <footer className="px-6 py-4 border-t border-[#E4E4E7] sticky bottom-0 bg-white flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || uploadingFile || uploadingThumb} className="gap-2 min-w-[100px]">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Saving…" : print ? "Save changes" : "Add print"}
          </Button>
        </footer>
      </motion.div>
    </div>
  );
}
