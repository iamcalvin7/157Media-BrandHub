import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, Link2, ExternalLink, Trash2, Loader2, Plus, Pencil, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface BrandTemplate {
  id: number;
  brand_id: number;
  title: string;
  description: string | null;
  media_url: string;
  media_kind: "image" | "video";
  template_url: string | null;
  created_at: string;
}

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

function resolveSrc(p: string): string {
  if (p.startsWith("/objects/")) return `${API}/api/storage${p}`;
  if (p.startsWith("/")) return `${API}${p}`;
  return p;
}

function templateLabel(url: string): string {
  const lower = url.toLowerCase();
  if (lower.endsWith(".psd")) return "PSD";
  if (lower.endsWith(".ai")) return "Illustrator";
  if (lower.endsWith(".indd")) return "InDesign";
  if (lower.endsWith(".sketch")) return "Sketch";
  if (lower.endsWith(".fig")) return "Figma";
  if (lower.endsWith(".xd")) return "XD";
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    if (h.includes("canva.")) return "Canva";
    if (h.includes("figma.")) return "Figma";
    if (h.includes("adobe.") || h.includes("creativecloud.")) return "Adobe";
    if (h.includes("dropbox.")) return "Dropbox";
    if (h.includes("drive.google.")) return "Google Drive";
    return h;
  } catch {
    return "Template file";
  }
}

export default function Templates() {
  const [items, setItems] = useState<BrandTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BrandTemplate | "new" | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/templates`);
      if (r.ok) setItems(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    if (!confirm("Delete this template?")) return;
    setItems(prev => prev.filter(i => i.id !== id));
    await fetch(`${API}/api/templates/${id}`, { method: "DELETE" });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-6xl mx-auto pb-24"
    >
      <header className="space-y-3 mb-10 flex items-start justify-between gap-4">
        <div className="space-y-3">
          <h1 className="font-extrabold text-4xl md:text-5xl text-[#18181B]">Templates</h1>
          <p className="text-lg text-[#71717A] font-light max-w-2xl">
            Reusable design templates — upload the preview image or video and link to the
            editable source file (PSD, Figma, Canva, etc).
          </p>
        </div>
        <Button onClick={() => setEditing("new")} className="shrink-0 gap-2">
          <Plus className="w-4 h-4" />
          New template
        </Button>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[#A1A1AA]">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="border border-dashed border-[#E4E4E7] rounded-2xl py-20 text-center bg-white">
          <FileText className="w-10 h-10 text-[#A1A1AA] mx-auto mb-4" />
          <p className="text-[#52525B] font-semibold mb-1">No templates yet</p>
          <p className="text-sm text-[#A1A1AA] mb-6">Upload a preview and link to the editable source.</p>
          <Button onClick={() => setEditing("new")} className="gap-2">
            <Plus className="w-4 h-4" /> Add the first one
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(t => (
            <article
              key={t.id}
              className="group rounded-2xl border border-[#E4E4E7] bg-white overflow-hidden flex flex-col"
            >
              <button
                type="button"
                onClick={() => setEditing(t)}
                className="block bg-[#F4F4F5] aspect-video w-full overflow-hidden text-left"
                aria-label={`Edit ${t.title}`}
              >
                {t.media_kind === "video" ? (
                  <video src={resolveSrc(t.media_url)} className="w-full h-full object-cover bg-black" muted playsInline />
                ) : (
                  <img src={resolveSrc(t.media_url)} alt={t.title} className="w-full h-full object-cover" loading="lazy" />
                )}
              </button>
              <div className="p-4 flex-1 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-extrabold text-[#18181B] leading-snug">{t.title}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditing(t)}
                      className="p-1.5 rounded-lg text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5] transition"
                      aria-label="Edit template"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 rounded-lg text-[#71717A] hover:text-red-600 hover:bg-red-50 transition"
                      aria-label="Delete template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {t.description && (
                  <p className="text-sm text-[#52525B] leading-relaxed line-clamp-3">{t.description}</p>
                )}
                {t.template_url && (
                  <a
                    href={t.template_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-primary)] hover:underline"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    Open {templateLabel(t.template_url)}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <TemplateEditor
          template={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setItems(prev => {
              const idx = prev.findIndex(p => p.id === saved.id);
              if (idx === -1) return [saved, ...prev];
              const next = [...prev];
              next[idx] = saved;
              return next;
            });
            setEditing(null);
          }}
        />
      )}
    </motion.div>
  );
}

interface EditorProps {
  template: BrandTemplate | null;
  onClose: () => void;
  onSaved: (t: BrandTemplate) => void;
}

function TemplateEditor({ template, onClose, onSaved }: EditorProps) {
  const [title, setTitle] = useState(template?.title ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [templateUrl, setTemplateUrl] = useState(template?.template_url ?? "");
  const [mediaUrl, setMediaUrl] = useState(template?.media_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    setError(null);
    const isVideo = file.type.startsWith("video/");
    const cap = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > cap) {
      setError(`File too large — ${isVideo ? "videos" : "images"} must be under ${Math.round(cap / 1024 / 1024)} MB.`);
      return;
    }
    setUploading(true);
    try {
      const reqResp = await fetch(`${API}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!reqResp.ok) throw new Error((await reqResp.json().catch(() => ({ error: "Upload failed" }))).error);
      const { uploadURL, objectPath } = await reqResp.json();
      const putResp = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!putResp.ok) throw new Error("Upload failed");
      setMediaUrl(objectPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setError(null);
    if (!title.trim()) { setError("Give your template a title."); return; }
    if (!mediaUrl) { setError("Upload a preview image or video."); return; }
    setSaving(true);
    try {
      const body = JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        media_url: mediaUrl,
        template_url: templateUrl.trim() || null,
      });
      const resp = template
        ? await fetch(`${API}/api/templates/${template.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body })
        : await fetch(`${API}/api/templates`, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      if (!resp.ok) throw new Error((await resp.json().catch(() => ({ error: "Save failed" }))).error);
      onSaved(await resp.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const isVideo = mediaUrl ? /\.(mp4|webm|mov|m4v)(\?|$)/i.test(mediaUrl) : false;

  return (
    <div className="fixed inset-0 z-50 bg-black/55 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <header className="px-6 py-4 border-b border-[#E4E4E7] flex items-center justify-between sticky top-0 bg-white">
          <h2 className="font-extrabold text-lg text-[#18181B]">{template ? "Edit template" : "New template"}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F4F4F5]" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-6 space-y-5">
          {/* Preview / uploader */}
          <div>
            <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-2">Preview</label>
            {mediaUrl ? (
              <div className="relative rounded-xl border border-[#E4E4E7] overflow-hidden bg-[#F4F4F5]">
                {isVideo ? (
                  <video src={resolveSrc(mediaUrl)} controls className="w-full max-h-[320px] object-contain bg-black" />
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
                  {uploading ? "Uploading…" : "Upload image or video"}
                </span>
                <span className="text-xs text-[#A1A1AA]">Images up to 25 MB · Videos up to 200 MB</span>
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-2">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Summer offer post" />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-2">Description (optional)</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this template for? Any usage notes?"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#71717A] uppercase tracking-wider mb-2">
              Link to editable file (optional)
            </label>
            <Input
              value={templateUrl}
              onChange={(e) => setTemplateUrl(e.target.value)}
              placeholder="https://drive.google.com/… or PSD link"
            />
            <p className="text-xs text-[#A1A1AA] mt-1.5">Canva, Figma, Drive, Dropbox — wherever the editable PSD/AI/Fig file lives.</p>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-[#E4E4E7] flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (template ? "Save" : "Create template")}
          </Button>
        </footer>
      </motion.div>
    </div>
  );
}
