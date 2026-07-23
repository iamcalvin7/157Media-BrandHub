import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus, Loader2, Trash2, FolderOpen, X, Check,
  Calendar, User, Ruler, Tag, FileText, ChevronDown, ClipboardList,
  Image as ImageIcon, Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/brand";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketingRequest {
  id: number;
  brand_id: number;
  name: string;
  request_type: string | null;
  sizes: string[] | null;
  designer: string | null;
  deadline: string | null;
  market: string | null;
  status: string;
  notes: string | null;
  drive_url: string | null;
  inspiration_urls: string[] | null;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REQUEST_TYPES = ["Print", "Digital", "Social Media", "Video", "Outdoor", "Other"] as const;
const MARKETS = ["English Market", "Italian Market"] as const;

const STATUSES = [
  { value: "pending",     label: "Pending",     color: "bg-amber-100 text-amber-700" },
  { value: "in_progress", label: "In Progress",  color: "bg-blue-100 text-blue-700" },
  { value: "review",      label: "In Review",    color: "bg-purple-100 text-purple-700" },
  { value: "done",        label: "Done",         color: "bg-emerald-100 text-emerald-700" },
] as const;

function statusMeta(status: string) {
  return STATUSES.find((s) => s.value === status) ?? { label: status, color: "bg-gray-100 text-gray-600" };
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function isOverdue(deadline: string | null, status: string) {
  if (!deadline || status === "done") return false;
  const [y, m, d] = deadline.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)) < new Date(new Date().toDateString());
}

function thumbUrl(objectPath: string, w = 400) {
  const stripped = objectPath.replace(/^\/objects\//, "");
  return `${API}/api/storage/thumb/objects/${stripped}?w=${w}`;
}

// ─── Upload helper ─────────────────────────────────────────────────────────────

async function uploadFileToStorage(file: File): Promise<string> {
  const metaRes = await fetch(`${API}/api/storage/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "application/octet-stream" }),
  });
  if (!metaRes.ok) {
    const body = await metaRes.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || "Failed to get upload URL");
  }
  const { uploadURL, objectPath } = (await metaRes.json()) as { uploadURL: string; objectPath: string };
  const putRes = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!putRes.ok) throw new Error("Upload to storage failed");
  return objectPath;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MarketingRequests() {
  const { activeBrand } = useBrand();
  const accent = activeBrand?.primaryColor ?? "#1e82b4";

  const [requests, setRequests] = useState<MarketingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<MarketingRequest | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/marketing-requests`);
      if (r.ok) setRequests(await r.json());
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [activeBrand?.slug, load]);

  async function updateStatus(id: number, status: string) {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    await fetch(`${API}/api/marketing-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function remove(id: number) {
    const prev = requests;
    setRequests((p) => p.filter((r) => r.id !== id));
    try {
      const res = await fetch(`${API}/api/marketing-requests/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      setRequests(prev);
      alert("Couldn't delete that request. Please try again.");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#A1A1AA] mb-2">
            <ClipboardList className="w-3.5 h-3.5" />
            Design & Production
          </div>
          <h1 className="text-3xl font-extrabold text-[#18181B] tracking-tight">Marketing Requests</h1>
          <p className="text-sm text-[#71717A] mt-1.5 max-w-xl">
            Submit and track design requests. A Google Drive folder is created automatically for each request.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: accent }}
        >
          <Plus className="w-4 h-4" />
          New Request
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-24 border-2 border-dashed border-[#E4E4E7] rounded-2xl">
          <ClipboardList className="w-9 h-9 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-[#71717A] font-medium">No marketing requests yet.</p>
          <p className="text-xs text-[#A1A1AA] mt-1">Click "New Request" to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E4E4E7] bg-white">
          <table className="w-full text-sm">
            <thead className="bg-[#F5F5F5] border-b border-[#E4E4E7]">
              <tr>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">Name</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">Type</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">Sizes</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">Designer</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">Deadline</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">Status</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r, i) => {
                const sm = statusMeta(r.status);
                const overdue = isOverdue(r.deadline, r.status);
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b border-[#F4F4F5] last:border-0 cursor-pointer group/row transition-colors",
                      i % 2 ? "bg-[#F5F5F5]/40 hover:bg-[#EBEBEB]" : "hover:bg-[#F5F5F5]",
                    )}
                    onClick={() => setViewing(r)}
                  >
                    <td className="px-4 py-3 align-middle max-w-[200px]">
                      <div className="font-semibold text-[#18181B] truncate group-hover/row:text-[#1e82b4] transition-colors">{r.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {r.market && (
                          <span className={cn(
                            "inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                            r.market.toLowerCase().includes("italian")
                              ? "bg-[#1e82b4]/10 text-[#1e82b4]"
                              : "bg-[#f6a610]/10 text-[#f6a610]",
                          )}>
                            {r.market.toLowerCase().includes("italian") ? "IT" : "EN"}
                          </span>
                        )}
                        {r.inspiration_urls && r.inspiration_urls.length > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-[#A1A1AA]">
                            <ImageIcon className="w-2.5 h-2.5" />
                            {r.inspiration_urls.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-[#52525B]">{r.request_type || "—"}</td>
                    <td className="px-4 py-3 align-middle">
                      {r.sizes && r.sizes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {r.sizes.slice(0, 2).map((s) => (
                            <span key={s} className="text-[10px] font-semibold bg-[#F4F4F5] text-[#3F3F46] px-1.5 py-0.5 rounded-md">{s}</span>
                          ))}
                          {r.sizes.length > 2 && (
                            <span className="text-[10px] text-[#A1A1AA]">+{r.sizes.length - 2}</span>
                          )}
                        </div>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-[#52525B]">{r.designer || "—"}</td>
                    <td className={cn("px-4 py-3 align-middle text-xs font-medium whitespace-nowrap", overdue ? "text-red-500" : "text-[#52525B]")}>
                      {fmtDate(r.deadline)}
                      {overdue && <span className="ml-1 text-[9px] font-bold uppercase tracking-wide">Overdue</span>}
                    </td>
                    <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                      <StatusDropdown status={r.status} onChange={(s) => updateStatus(r.id, s)} />
                    </td>
                    <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 justify-end">
                        {r.drive_url && (
                          <a
                            href={r.drive_url}
                            target="_blank"
                            rel="noreferrer"
                            title="Open Drive folder"
                            className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#1e82b4] hover:bg-[#F4F4F5] transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <DeleteBtn onConfirm={() => remove(r.id)} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <NewRequestModal
          accent={accent}
          onClose={() => setShowForm(false)}
          onCreated={(req) => {
            setRequests((prev) => [req, ...prev]);
            setShowForm(false);
          }}
        />
      )}

      {viewing && (
        <RequestDetailModal
          request={viewing}
          accent={accent}
          onClose={() => setViewing(null)}
          onStatusChange={(id, status) => {
            updateStatus(id, status);
            setViewing((v) => v ? { ...v, status } : v);
          }}
          onDelete={(id) => { remove(id); setViewing(null); }}
        />
      )}
    </div>
  );
}

// ─── Status dropdown ──────────────────────────────────────────────────────────

function StatusDropdown({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const [open, setOpen] = useState(false);
  const sm = statusMeta(status);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full", sm.color)}
      >
        {sm.label}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-[#E4E4E7] rounded-xl shadow-lg py-1 min-w-[120px]">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                onClick={() => { onChange(s.value); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#F5F5F5] flex items-center gap-2"
              >
                <span className={cn("w-2 h-2 rounded-full", s.color.split(" ")[0])} />
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Delete button ────────────────────────────────────────────────────────────

function DeleteBtn({ onConfirm }: { onConfirm: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <div className="flex items-center gap-0.5">
        <button onClick={onConfirm} className="text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 px-1.5 py-1 rounded-md">Del</button>
        <button onClick={() => setConfirm(false)} className="text-[10px] text-[#A1A1AA] hover:text-[#52525B] px-1">×</button>
      </div>
    );
  }
  return (
    <button onClick={() => setConfirm(true)} className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-[#F4F4F5] transition-colors" title="Delete">
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function commit() {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setValue("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !value && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  function removeTag(t: string) {
    onChange(tags.filter((x) => x !== t));
  }

  return (
    <div
      className="min-h-[42px] flex flex-wrap gap-1.5 items-center border border-[#E4E4E7] rounded-xl px-3 py-2 bg-white cursor-text focus-within:ring-2 ring-[#1e82b4]/40"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 text-[11px] font-semibold bg-[#F4F4F5] text-[#3F3F46] px-2 py-1 rounded-lg">
          {t}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(t); }}
            className="text-[#A1A1AA] hover:text-[#27272A] transition-colors"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] text-sm text-[#18181B] bg-transparent outline-none placeholder:text-[#A1A1AA]"
      />
    </div>
  );
}

// ─── Inspiration uploader ─────────────────────────────────────────────────────

interface PendingFile {
  id: string;
  file: File;
  preview: string;
  status: "idle" | "uploading" | "done" | "error";
  objectPath?: string;
  error?: string;
}

function InspirationUploader({
  onPathsChange,
}: {
  onPathsChange: (paths: string[]) => void;
}) {
  const [files, setFiles] = useState<PendingFile[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const newEntries: PendingFile[] = Array.from(selected)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({
        id: `${Date.now()}-${Math.random()}`,
        file: f,
        preview: URL.createObjectURL(f),
        status: "idle" as const,
      }));
    if (!newEntries.length) return;

    setFiles((prev) => {
      const next = [...prev, ...newEntries];
      uploadAll(newEntries, next);
      return next;
    });
  }

  async function uploadAll(entries: PendingFile[], allFiles: PendingFile[]) {
    const uploaded: string[] = [];

    for (const entry of entries) {
      setFiles((prev) =>
        prev.map((f) => f.id === entry.id ? { ...f, status: "uploading" } : f)
      );
      try {
        const objectPath = await uploadFileToStorage(entry.file);
        setFiles((prev) => {
          const next = prev.map((f) =>
            f.id === entry.id ? { ...f, status: "done", objectPath } : f
          );
          const paths = next.filter((f) => f.objectPath).map((f) => f.objectPath!);
          onPathsChange(paths);
          return next;
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        setFiles((prev) =>
          prev.map((f) => f.id === entry.id ? { ...f, status: "error", error: msg } : f)
        );
      }
    }
  }

  function remove(id: string) {
    setFiles((prev) => {
      const next = prev.filter((f) => f.id !== id);
      onPathsChange(next.filter((f) => f.objectPath).map((f) => f.objectPath!));
      return next;
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-[#E4E4E7] rounded-xl px-4 py-5 flex flex-col items-center gap-1.5 cursor-pointer hover:border-[#1e82b4]/50 hover:bg-[#F5FBFF] transition-colors"
      >
        <Upload className="w-5 h-5 text-[#A1A1AA]" />
        <p className="text-xs font-medium text-[#71717A]">Click or drag images here</p>
        <p className="text-[10px] text-[#A1A1AA]">JPG, PNG, WEBP — multiple allowed</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {files.map((f) => (
            <div key={f.id} className="relative group aspect-square rounded-lg overflow-hidden border border-[#E4E4E7] bg-[#F4F4F5]">
              <img src={f.preview} alt="" className="w-full h-full object-cover" />
              {f.status === "uploading" && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
              )}
              {f.status === "error" && (
                <div className="absolute inset-0 bg-red-500/70 flex items-center justify-center p-1">
                  <p className="text-white text-[9px] text-center font-semibold leading-tight">{f.error}</p>
                </div>
              )}
              {f.status === "done" && (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 text-white" />
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(f.id)}
                className="absolute top-1 left-1 w-4 h-4 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── New request modal ────────────────────────────────────────────────────────

interface FormState {
  name: string;
  request_type: string;
  sizes: string[];
  designer: string;
  deadline: string;
  market: string;
  notes: string;
  inspiration_urls: string[];
}

function NewRequestModal({
  accent,
  onClose,
  onCreated,
}: {
  accent: string;
  onClose: () => void;
  onCreated: (r: MarketingRequest) => void;
}) {
  const [form, setForm] = useState<FormState>({
    name: "", request_type: "Print", sizes: [], designer: "", deadline: "", market: "English Market", notes: "", inspiration_urls: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    fetch(`${API}/api/team-members`)
      .then((r) => r.json())
      .then((data) => setTeamMembers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/marketing-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          request_type: form.request_type || null,
          sizes: form.sizes.length ? form.sizes : null,
          designer: form.designer || null,
          deadline: form.deadline || null,
          market: form.market || null,
          notes: form.notes.trim() || null,
          inspiration_urls: form.inspiration_urls.length ? form.inspiration_urls : null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error || "Failed to save");
      }
      const created: MarketingRequest = await res.json();
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const label = "text-[11px] font-semibold text-[#52525B] uppercase tracking-wider mb-1.5 block";
  const input = "w-full text-sm border border-[#E4E4E7] rounded-xl px-3 py-2.5 text-[#18181B] focus:outline-none focus:ring-2 ring-[#1e82b4]/40 bg-white placeholder:text-[#A1A1AA]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F4F4F5]">
          <h2 className="text-base font-bold text-[#18181B]">New Marketing Request</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#27272A] hover:bg-[#F4F4F5] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-5">
          {/* Name */}
          <div>
            <label className={label}>Request Name *</label>
            <input
              className={input}
              placeholder="e.g. Summer Campaign Flyers"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />
          </div>

          {/* Type + Market row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Type</label>
              <select
                className={input}
                value={form.request_type}
                onChange={(e) => setForm((f) => ({ ...f, request_type: e.target.value }))}
              >
                {REQUEST_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Market</label>
              <select
                className={input}
                value={form.market}
                onChange={(e) => setForm((f) => ({ ...f, market: e.target.value }))}
              >
                {MARKETS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Sizes — free text tags */}
          <div>
            <label className={label}>
              Sizes
              <span className="text-[#A1A1AA] font-normal normal-case tracking-normal ml-1">— type and press Enter</span>
            </label>
            <TagInput
              tags={form.sizes}
              onChange={(sizes) => setForm((f) => ({ ...f, sizes }))}
              placeholder="e.g. A4, Roll-Up 80×200cm…"
            />
          </div>

          {/* Designer + Deadline row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Designer</label>
              <select
                className={input}
                value={form.designer}
                onChange={(e) => setForm((f) => ({ ...f, designer: e.target.value }))}
              >
                <option value="">— Unassigned —</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Deadline</label>
              <input
                type="date"
                className={input}
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={label}>Notes</label>
            <textarea
              className={cn(input, "resize-none h-20")}
              placeholder="Brief description, colour notes, special requirements…"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          {/* Inspiration images */}
          <div>
            <label className={label}>
              Inspiration Images
              <span className="text-[#A1A1AA] font-normal normal-case tracking-normal ml-1">— optional</span>
            </label>
            <InspirationUploader
              onPathsChange={(paths) => setForm((f) => ({ ...f, inspiration_urls: paths }))}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="pt-1 pb-1 text-[11px] text-[#A1A1AA] flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5" />
            A Google Drive folder will be created automatically based on the selected market.
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#F4F4F5] flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#52525B] hover:text-[#18181B] rounded-xl hover:bg-[#F4F4F5] transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit as unknown as React.MouseEventHandler}
            disabled={saving || !form.name.trim()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: accent }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {saving ? "Creating…" : "Create Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function RequestDetailModal({
  request,
  accent,
  onClose,
  onStatusChange,
  onDelete,
}: {
  request: MarketingRequest;
  accent: string;
  onClose: () => void;
  onStatusChange: (id: number, status: string) => void;
  onDelete: (id: number) => void;
}) {
  const sm = statusMeta(request.status);
  const overdue = isOverdue(request.deadline, request.status);
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-[#F4F4F5]">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-[#18181B] leading-snug">{request.name}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", sm.color)}>{sm.label}</span>
                {request.market && (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    request.market.toLowerCase().includes("italian")
                      ? "bg-[#1e82b4]/10 text-[#1e82b4]"
                      : "bg-[#f6a610]/10 text-[#f6a610]",
                  )}>
                    {request.market.toLowerCase().includes("italian") ? "IT" : "EN"}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="shrink-0 p-1 rounded-lg text-[#A1A1AA] hover:text-[#27272A] hover:bg-[#F4F4F5] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {request.request_type && (
                <div className="flex items-start gap-2">
                  <Tag className="w-3.5 h-3.5 text-[#A1A1AA] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold">Type</p>
                    <p className="text-[13px] text-[#27272A] font-medium">{request.request_type}</p>
                  </div>
                </div>
              )}
              {request.designer && (
                <div className="flex items-start gap-2">
                  <User className="w-3.5 h-3.5 text-[#A1A1AA] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold">Designer</p>
                    <p className="text-[13px] text-[#27272A] font-medium">{request.designer}</p>
                  </div>
                </div>
              )}
              {request.deadline && (
                <div className="flex items-start gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#A1A1AA] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold">Deadline</p>
                    <p className={cn("text-[13px] font-medium", overdue ? "text-red-500" : "text-[#27272A]")}>
                      {fmtDate(request.deadline)}
                      {overdue && <span className="ml-1 text-[10px] font-bold uppercase">Overdue</span>}
                    </p>
                  </div>
                </div>
              )}
              {request.market && (
                <div className="flex items-start gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#A1A1AA] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold">Market</p>
                    <p className="text-[13px] text-[#27272A] font-medium">{request.market}</p>
                  </div>
                </div>
              )}
            </div>

            {request.sizes && request.sizes.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Ruler className="w-3.5 h-3.5 text-[#A1A1AA]" />
                  <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold">Sizes</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {request.sizes.map((s) => (
                    <span key={s} className="text-[12px] font-semibold bg-[#F4F4F5] text-[#3F3F46] px-2.5 py-1 rounded-lg">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {request.notes && (
              <div className="bg-[#FAFAFA] rounded-xl px-4 py-3 border border-[#F4F4F5]">
                <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-1">Notes</p>
                <p className="text-[13px] text-[#27272A] whitespace-pre-wrap leading-relaxed">{request.notes}</p>
              </div>
            )}

            {/* Inspiration images */}
            {request.inspiration_urls && request.inspiration_urls.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <ImageIcon className="w-3.5 h-3.5 text-[#A1A1AA]" />
                  <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold">
                    Inspiration ({request.inspiration_urls.length})
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {request.inspiration_urls.map((path, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setLightbox(thumbUrl(path, 1200))}
                      className="aspect-square rounded-xl overflow-hidden border border-[#E4E4E7] bg-[#F4F4F5] hover:opacity-80 transition-opacity"
                    >
                      <img src={thumbUrl(path, 400)} alt={`Inspiration ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Status changer */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-2">Change Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => onStatusChange(request.id, s.value)}
                    className={cn(
                      "text-[11px] font-semibold px-3 py-1.5 rounded-full border-2 transition-colors",
                      request.status === s.value
                        ? cn(s.color, "border-current")
                        : "border-transparent bg-[#F4F4F5] text-[#71717A] hover:bg-[#EBEBEB]",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-[#F4F4F5] flex items-center justify-between gap-2">
            <DeleteBtn onConfirm={() => onDelete(request.id)} />
            <div className="flex items-center gap-2">
              {request.drive_url && (
                <a
                  href={request.drive_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-[#E4E4E7] text-[#52525B] hover:text-[#1e82b4] hover:border-[#1e82b4] transition-colors"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Open in Drive
                </a>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-white rounded-xl hover:opacity-90 transition-opacity"
                style={{ backgroundColor: accent }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img src={lightbox} alt="Inspiration" className="max-w-full max-h-full rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
