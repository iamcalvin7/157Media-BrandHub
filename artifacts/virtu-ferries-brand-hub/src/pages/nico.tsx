import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  Camera, Plus, Trash2, ExternalLink, Loader2, Video, Mic,
  Image as ImageIcon, Music, FileText, ArrowLeft, ListChecks,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type Kind = "video" | "voiceover" | "image" | "audio" | "other";

interface NicoLink {
  id: number;
  kind: string;
  name: string | null;
  date: string | null;
  url: string;
  notes: string | null;
  createdAt: string;
}

interface NicoPost {
  id: number;
  brand_id: number;
  brand_name: string | null;
  brand_slug: string | null;
  brand_primary_color: string | null;
  title: string | null;
  caption: string;
  visual_direction: string | null;
  platform: string;
  pillar: string;
  format: string;
  market: string | null;
  status: string;
  creative_status: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  assigned_to: string | null;
  notes: string | null;
  drive_url: string | null;
  media_url: string | null;
  link_url: string | null;
}

const KIND_OPTIONS: { value: Kind; label: string; icon: React.ElementType; color: string }[] = [
  { value: "video", label: "Video", icon: Video, color: "text-red-400" },
  { value: "voiceover", label: "Voiceover", icon: Mic, color: "text-sky-400" },
  { value: "image", label: "Image", icon: ImageIcon, color: "text-amber-400" },
  { value: "audio", label: "Audio", icon: Music, color: "text-purple-400" },
  { value: "other", label: "Other", icon: FileText, color: "text-zinc-400" },
];

function kindMeta(k: string) {
  return KIND_OPTIONS.find(o => o.value === k) ?? KIND_OPTIONS[KIND_OPTIONS.length - 1];
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
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
  const [posts, setPosts] = useState<NicoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [linksRes, postsRes] = await Promise.all([
        fetch(`${API}/api/nico-links`),
        fetch(`${API}/api/nico-posts`),
      ]);
      if (linksRes.ok) setItems(await linksRes.json());
      if (postsRes.ok) setPosts(await postsRes.json());
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
    <div className="min-h-screen bg-[#121212] text-[#FAFAFA] selection:bg-[#39A15F] selection:text-black">
      <header className="px-6 sm:px-10 py-6 flex items-center justify-between gap-3 border-b border-[#272727]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-[#39A15F] grid place-items-center text-black font-bold">
            <span className="text-sm tracking-tight">BH</span>
          </div>
          <div className="text-sm font-medium text-[#A1A1AA]">Brand Hub</div>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#2D2D2D] hover:border-[#39A15F]/50 bg-[#1A1A1A] hover:bg-[#222222] text-[#A1A1AA] hover:text-[#FAFAFA] text-xs font-medium pl-2.5 pr-3 py-1.5 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Brands
        </Link>
      </header>

      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-10 space-y-12">
        {/* Title block */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#6B6B73] mb-3">
              <Camera className="w-3.5 h-3.5 text-[#39A15F]" />
              Videographer drop-zone
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#FAFAFA]">Nico</h1>
            <p className="text-sm text-[#A1A1AA] mt-2 max-w-2xl leading-relaxed">
              Drop links to videos, voiceovers, images and other raw assets here. Posts tagged for Nico Bazan in any brand's calendar also appear below.
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="shrink-0 inline-flex items-center gap-1.5 bg-[#39A15F] hover:bg-[#2f8a50] text-black text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add link
          </button>
        </div>

        {/* Tagged posts */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ListChecks className="w-4 h-4 text-[#39A15F]" />
            <h2 className="text-sm font-semibold tracking-tight text-[#FAFAFA]">Posts tagged for you</h2>
            <span className="text-xs text-[#6B6B73]">{loading ? "—" : posts.length}</span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-[#272727] bg-[#161616] p-10 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-[#6B6B73]" />
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#2D2D2D] bg-[#161616] p-10 text-center">
              <p className="text-sm text-[#A1A1AA]">
                No posts assigned to <span className="text-[#FAFAFA] font-medium">Nico Bazan</span> yet.
              </p>
              <p className="text-xs text-[#6B6B73] mt-1.5">
                In any brand's Content Calendar, set the assignee on a post to "Nico Bazan" and it will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {posts.map(p => (
                <article
                  key={p.id}
                  className="rounded-2xl border border-[#272727] bg-[#1A1A1A] hover:border-[#2D2D2D] transition-colors p-4 relative overflow-hidden"
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: p.brand_primary_color ?? "#39A15F" }}
                  />
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{
                          background: `${p.brand_primary_color ?? "#39A15F"}22`,
                          color: p.brand_primary_color ?? "#39A15F",
                        }}
                      >
                        {p.brand_name ?? `Brand #${p.brand_id}`}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-[#8E8E96]">
                        {p.platform} · {p.format}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#8E8E96] whitespace-nowrap">
                      {fmtDate(p.scheduled_date)}{p.scheduled_time ? ` · ${p.scheduled_time}` : ""}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-[#FAFAFA] leading-snug mb-1.5">
                    {p.title?.trim() || p.caption.split("\n")[0].slice(0, 80) || "Untitled post"}
                  </h3>
                  {p.visual_direction && (
                    <p className="text-xs text-[#A1A1AA] leading-relaxed line-clamp-3">
                      {p.visual_direction}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[#272727]">
                    <span className="text-[10px] uppercase tracking-wider text-[#6B6B73]">{p.pillar}</span>
                    <span className="text-[10px] text-[#3F3F46]">·</span>
                    <span className="text-[10px] uppercase tracking-wider text-[#6B6B73]">{p.creative_status ?? "To Do"}</span>
                    {p.drive_url && (
                      <a
                        href={p.drive_url}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-[#39A15F] hover:underline"
                      >
                        Drive <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Raw asset links */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-4 h-4 text-[#39A15F]" />
            <h2 className="text-sm font-semibold tracking-tight text-[#FAFAFA]">Asset links</h2>
            <span className="text-xs text-[#6B6B73]">{loading ? "—" : items.length}</span>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-[#272727] bg-[#161616] p-10 flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-[#6B6B73]" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#2D2D2D] bg-[#161616] p-10 text-center">
              <Camera className="w-7 h-7 text-[#3F3F46] mx-auto mb-3" />
              <p className="text-sm text-[#A1A1AA]">No links yet.</p>
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 text-sm font-semibold text-[#39A15F] hover:text-[#48b572]"
              >
                Add the first one →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#272727] bg-[#161616]">
              <table className="w-full text-sm">
                <thead className="bg-[#1A1A1A] border-b border-[#272727]">
                  <tr>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8E8E96]">Type</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8E8E96]">Name</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8E8E96]">Date</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-[#8E8E96]">Link</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const meta = kindMeta(it.kind);
                    const Icon = meta.icon;
                    return (
                      <tr key={it.id} className="border-b border-[#222222] last:border-0 hover:bg-[#1A1A1A]">
                        <td className="px-4 py-3 align-middle">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA]">
                            <Icon className={cn("w-3.5 h-3.5", meta.color)} />
                            <span className="capitalize">{it.kind}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle text-[#FAFAFA] font-semibold">
                          {it.name?.trim() || <span className="text-[#6B6B73] italic font-normal">Untitled</span>}
                        </td>
                        <td className="px-4 py-3 align-middle text-[#A1A1AA] whitespace-nowrap">{fmtDate(it.date)}</td>
                        <td className="px-4 py-3 align-middle">
                          <a
                            href={it.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[#39A15F] hover:underline break-all"
                          >
                            <span className="truncate max-w-[42ch]">{hostnameOf(it.url)}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                          {it.notes && (
                            <p className="text-xs text-[#8E8E96] mt-1 line-clamp-2 whitespace-pre-wrap">{it.notes}</p>
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
        </section>
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
        <button onClick={onConfirm} className="text-[11px] font-semibold text-white bg-red-600 hover:bg-red-500 px-2 py-1 rounded-md">Delete</button>
        <button onClick={() => setConfirm(false)} className="text-[11px] text-[#8E8E96] hover:text-[#A1A1AA] px-1">Cancel</button>
      </div>
    );
  }
  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-[#6B6B73] hover:text-red-400 p-1 rounded-md transition-colors"
      title="Delete"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

function AddModal({ onClose, onSaved }: { onClose: () => void; onSaved: (item: NicoLink) => void }) {
  const [kind, setKind] = useState<Kind>("video");
  const [name, setName] = useState("");
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
          name: name.trim() || null,
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

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1A1A1A] border border-[#2D2D2D] rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto overflow-x-hidden text-[#FAFAFA]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#272727]">
          <h2 className="text-lg font-bold">Add a link</h2>
          <button onClick={onClose} className="text-[#8E8E96] hover:text-[#FAFAFA] p-1 rounded-lg hover:bg-[#222222]" aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#8E8E96] font-semibold mb-2 block">Type</label>
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
                        ? "border-[#39A15F] bg-[#39A15F]/10 text-[#39A15F]"
                        : "border-[#2D2D2D] text-[#A1A1AA] hover:border-[#3F3F46]"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", active ? "text-[#39A15F]" : k.color)} />
                    <span className="text-[11px] font-semibold">{k.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#8E8E96] font-semibold mb-1.5 block">Name of content</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Pozzallo sunset b-roll"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#2D2D2D] bg-[#161616] text-[#FAFAFA] placeholder:text-[#6B6B73] focus:border-[#39A15F] focus:outline-none focus:ring-1 focus:ring-[#39A15F]/30"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#8E8E96] font-semibold mb-1.5 block">Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#2D2D2D] bg-[#161616] text-[#FAFAFA] focus:border-[#39A15F] focus:outline-none focus:ring-1 focus:ring-[#39A15F]/30"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#8E8E96] font-semibold mb-1.5 block">Link</label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://…"
              autoFocus
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#2D2D2D] bg-[#161616] text-[#FAFAFA] placeholder:text-[#6B6B73] focus:border-[#39A15F] focus:outline-none focus:ring-1 focus:ring-[#39A15F]/30"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-wider text-[#8E8E96] font-semibold mb-1.5 block">Notes <span className="normal-case text-[#6B6B73] font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anything the team should know…"
              rows={2}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#2D2D2D] bg-[#161616] text-[#FAFAFA] placeholder:text-[#6B6B73] focus:border-[#39A15F] focus:outline-none focus:ring-1 focus:ring-[#39A15F]/30 resize-none"
            />
          </div>

          {error && (
            <div className="text-xs text-red-300 bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#272727]">
            <button type="button" onClick={onClose} className="text-sm text-[#A1A1AA] hover:text-[#FAFAFA] font-medium px-3 py-2">Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 text-sm font-semibold text-black bg-[#39A15F] hover:bg-[#2f8a50] px-4 py-2 rounded-lg disabled:opacity-50"
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
