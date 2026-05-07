import { useEffect, useState } from "react";
import { Camera, Plus, Trash2, ExternalLink, Loader2, Video, Mic, Image as ImageIcon, Music, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type Kind = "video" | "voiceover" | "image" | "audio" | "other";

interface NicoLink {
  id: number;
  kind: string;
  date: string | null;
  url: string;
  notes: string | null;
  createdAt: string;
}

const KIND_OPTIONS: { value: Kind; label: string; icon: React.ElementType; color: string }[] = [
  { value: "video", label: "Video", icon: Video, color: "text-[#e01814]" },
  { value: "voiceover", label: "Voiceover", icon: Mic, color: "text-[#1e82b4]" },
  { value: "image", label: "Image", icon: ImageIcon, color: "text-[#f6a610]" },
  { value: "audio", label: "Audio", icon: Music, color: "text-purple-500" },
  { value: "other", label: "Other", icon: FileText, color: "text-gray-500" },
];

function kindMeta(k: string) {
  return KIND_OPTIONS.find(o => o.value === k) ?? KIND_OPTIONS[KIND_OPTIONS.length - 1];
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  // `date` columns come back as YYYY-MM-DD strings.
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return d;
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function hostnameOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

export default function Nico() {
  const [items, setItems] = useState<NicoLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/nico-links`);
      const data = await r.json();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
    await fetch(`${API}/api/nico-links/${id}`, { method: "DELETE" });
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-400 mb-2">
              <Camera className="w-3.5 h-3.5" />
              Videographer
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Nico</h1>
            <p className="text-sm text-gray-500 mt-1.5 max-w-xl">
              Drop links to videos, voiceovers, images and other raw assets here. The team picks them up from this list.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="shrink-0 flex items-center gap-1.5 bg-[#1e82b4] hover:bg-[#1a6d99] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add link
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
            <Camera className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No links yet.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="mt-4 text-sm font-semibold text-[#1e82b4] hover:text-[#1a6d99]"
            >
              Add the first one →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Type</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Date</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Link</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const meta = kindMeta(it.kind);
                  const Icon = meta.icon;
                  return (
                    <tr key={it.id} className={cn("border-b border-gray-100 last:border-0 hover:bg-gray-50/60", i % 2 ? "bg-gray-50/30" : "")}>
                      <td className="px-4 py-3 align-middle">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                          <Icon className={cn("w-3.5 h-3.5", meta.color)} />
                          <span className="capitalize">{it.kind}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle text-gray-600 whitespace-nowrap">{fmtDate(it.date)}</td>
                      <td className="px-4 py-3 align-middle">
                        <a
                          href={it.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[#1e82b4] hover:underline break-all"
                        >
                          <span className="truncate max-w-[42ch]">{hostnameOf(it.url)}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        {it.notes && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 whitespace-pre-wrap">{it.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle text-right">
                        <DeleteButton onConfirm={() => handleDelete(it.id)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onSaved={(item) => { setItems(prev => [item, ...prev]); setShowAdd(false); }}
        />
      )}
    </div>
  );
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return (
      <div className="flex items-center justify-end gap-1">
        <button onClick={onConfirm} className="text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-md">Delete</button>
        <button onClick={() => setConfirm(false)} className="text-[11px] text-gray-400 hover:text-gray-600 px-1">Cancel</button>
      </div>
    );
  }
  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-gray-300 hover:text-red-500 p-1 rounded-md transition-colors"
      title="Delete"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: (item: NicoLink) => void }) {
  const [kind, setKind] = useState<Kind>("video");
  const [url, setUrl] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!url.trim()) {
      setError("A link is required.");
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/nico-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          url: url.trim(),
          date: date || null,
          notes: notes.trim() || null,
        }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || "Failed to save");
      }
      onSaved(await r.json());
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  // Lock body scroll while modal open (mobile jitter fix).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add a link</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100" aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2 block">Type</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {KIND_OPTIONS.map(k => {
                const Icon = k.icon;
                const active = kind === k.value;
                return (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setKind(k.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all",
                      active
                        ? "border-[#1e82b4] bg-[#1e82b4]/5 text-[#1e82b4]"
                        : "border-gray-200 text-gray-500 hover:border-gray-300"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", active ? "text-[#1e82b4]" : k.color)} />
                    <span className="text-[11px] font-semibold">{k.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#1e82b4] focus:outline-none focus:ring-1 focus:ring-[#1e82b4]/30"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">Link</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://…"
              autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#1e82b4] focus:outline-none focus:ring-1 focus:ring-[#1e82b4]/30"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1.5 block">Notes <span className="normal-case text-gray-300 font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anything the team should know…"
              rows={2}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:border-[#1e82b4] focus:outline-none focus:ring-1 focus:ring-[#1e82b4]/30 resize-none"
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-2">Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#1e82b4] hover:bg-[#1a6d99] px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
