import { useState, useEffect } from "react";
import {
  Repeat2, Plus, Check, ExternalLink, Trash2, Loader2,
  Instagram, Facebook, Globe, X, ChevronDown, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/brand";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

const PLATFORMS = ["Instagram", "Facebook", "TikTok", "X (Twitter)", "LinkedIn", "YouTube", "Other"] as const;
const MARKETS = ["English Market", "Italian Market"] as const;

interface Repost {
  id: number;
  platform: string;
  author_handle: string | null;
  author_name: string | null;
  source_url: string | null;
  caption: string | null;
  notes: string | null;
  market: string | null;
  permission_granted: boolean | null;
  reposted: boolean;
  reposted_at: string | null;
  reposted_on: string | null;
  created_at: string;
}

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const lc = platform.toLowerCase();
  if (lc === "instagram") return <Instagram className={className} />;
  if (lc === "facebook") return <Facebook className={className} />;
  return <Globe className={className} />;
}

function platformColor(platform: string) {
  const lc = platform.toLowerCase();
  if (lc === "instagram") return "#E1306C";
  if (lc === "facebook") return "#1877F2";
  if (lc === "tiktok") return "#010101";
  return "#71717A";
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const emptyForm = {
  platform: "Instagram" as string,
  author_handle: "",
  author_name: "",
  source_url: "",
  caption: "",
  notes: "",
  market: "" as string,
};

export default function Reposts() {
  const { activeBrand } = useBrand();
  const accent = activeBrand?.primaryColor ?? "#1e82b4";

  const [items, setItems] = useState<Repost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<string>("All");
  const [filterReposted, setFilterReposted] = useState<"all" | "pending" | "done">("all");
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [repostingId, setRepostingId] = useState<number | null>(null);
  const [permissionId, setPermissionId] = useState<number | null>(null);
  const [repostOnModal, setRepostOnModal] = useState<{ id: number; platform: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/reposts`);
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/reposts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: form.platform,
          author_handle: form.author_handle || null,
          author_name: form.author_name || null,
          source_url: form.source_url || null,
          caption: form.caption || null,
          notes: form.notes || null,
          market: form.market || null,
        }),
      });
      if (r.ok) {
        const created: Repost = await r.json();
        setItems(prev => [created, ...prev]);
        setForm({ ...emptyForm });
        setShowAdd(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleReposted(item: Repost) {
    if (!item.reposted) {
      setRepostOnModal({ id: item.id, platform: item.platform });
      return;
    }
    setRepostingId(item.id);
    try {
      await fetch(`${API}/api/reposts/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reposted: false }),
      });
      await load();
    } finally {
      setRepostingId(null);
    }
  }

  async function togglePermission(item: Repost) {
    const next =
      item.permission_granted === null || item.permission_granted === undefined
        ? true
        : item.permission_granted === true
          ? false
          : null;
    setPermissionId(item.id);
    try {
      const r = await fetch(`${API}/api/reposts/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission_granted: next }),
      });
      if (r.ok) {
        const updated: Repost = await r.json();
        setItems(prev => prev.map(i => i.id === item.id ? updated : i));
      }
    } finally {
      setPermissionId(null);
    }
  }

  async function confirmRepost(repostedOn: string) {
    if (!repostOnModal) return;
    const id = repostOnModal.id;
    setRepostOnModal(null);
    setRepostingId(id);
    try {
      await fetch(`${API}/api/reposts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reposted: true, reposted_on: repostedOn }),
      });
      await load();
    } finally {
      setRepostingId(null);
    }
  }

  async function handleDelete(id: number) {
    await fetch(`${API}/api/reposts/${id}`, { method: "DELETE" });
    setConfirmDelete(null);
    await load();
  }

  const allPlatforms = ["All", ...PLATFORMS];
  const filtered = items.filter(i => {
    if (filterPlatform !== "All" && i.platform !== filterPlatform) return false;
    if (filterReposted === "pending" && i.reposted) return false;
    if (filterReposted === "done" && !i.reposted) return false;
    return true;
  });

  const pending = items.filter(i => !i.reposted).length;
  const done = items.filter(i => i.reposted).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accent}15` }}>
              <Repeat2 className="w-5 h-5" style={{ color: accent }} />
            </div>
            <h1 className="text-2xl font-bold text-[#18181B] tracking-tight">Reposts</h1>
          </div>
          <p className="text-sm text-[#71717A] max-w-lg">
            Track UGC and content that mentions Virtu Ferries. Mark items as reposted once shared.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-xl transition-colors shrink-0"
          style={{ background: accent }}
        >
          <Plus className="w-4 h-4" />
          Add UGC
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="text-sm text-[#71717A]">
          <span className="font-semibold text-[#18181B]">{pending}</span> pending
        </div>
        <div className="text-sm text-[#71717A]">
          <span className="font-semibold text-[#18181B]">{done}</span> reposted
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white border border-[#E4E4E7] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-[#18181B]">New UGC entry</h2>
            <button type="button" onClick={() => setShowAdd(false)}>
              <X className="w-4 h-4 text-[#A1A1AA] hover:text-[#71717A]" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[#71717A] block mb-1">Market</label>
              <select
                value={form.market}
                onChange={e => setForm(f => ({ ...f, market: e.target.value }))}
                className="w-full text-sm border border-[#E4E4E7] rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-[#1e82b4]/50"
              >
                <option value="">—</option>
                {MARKETS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-[#71717A] block mb-1">Author handle</label>
              <input
                value={form.author_handle}
                onChange={e => setForm(f => ({ ...f, author_handle: e.target.value }))}
                placeholder="@handle"
                className="w-full text-sm border border-[#E4E4E7] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1e82b4]/50"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[#71717A] block mb-1">Source URL</label>
            <input
              value={form.source_url}
              onChange={e => setForm(f => ({ ...f, source_url: e.target.value }))}
              placeholder="https://www.instagram.com/p/..."
              className="w-full text-sm border border-[#E4E4E7] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1e82b4]/50"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#71717A] block mb-1">Internal notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="e.g. Great shot of the Catania crossing, ideal for Stories"
              className="w-full text-sm border border-[#E4E4E7] rounded-lg px-3 py-2 focus:outline-none focus:border-[#1e82b4]/50 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="text-sm text-[#71717A] hover:text-[#27272A]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-xl disabled:opacity-50"
              style={{ background: accent }}
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center bg-[#F4F4F5] rounded-lg p-1 gap-1">
          {(["all", "pending", "done"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterReposted(f)}
              className={cn(
                "text-xs font-medium px-3 py-1.5 rounded-md transition-colors capitalize",
                filterReposted === f
                  ? "bg-white text-[#18181B] shadow-sm"
                  : "text-[#71717A] hover:text-[#27272A]"
              )}
            >
              {f === "all" ? "All" : f === "pending" ? "Pending" : "Reposted"}
            </button>
          ))}
        </div>
        <select
          value={filterPlatform}
          onChange={e => setFilterPlatform(e.target.value)}
          className="text-xs border border-[#E4E4E7] rounded-lg px-2 py-1.5 bg-white focus:outline-none"
        >
          {allPlatforms.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#A1A1AA]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Repeat2 className="w-10 h-10 text-[#E4E4E7] mx-auto" />
          <p className="text-sm text-[#A1A1AA]">No UGC entries yet — add one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const color = platformColor(item.platform);
            const isIT = item.market?.toLowerCase().includes("italian") ?? false;
            const isEN = item.market?.toLowerCase().includes("english") ?? false;
            return (
              <div
                key={item.id}
                className={cn(
                  "bg-white border border-[#E4E4E7] rounded-2xl p-4 flex gap-4 transition-all",
                  item.reposted ? "opacity-70" : "",
                )}
              >
                {/* Platform icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${color}15` }}
                >
                  <PlatformIcon platform={item.platform} className="w-4.5 h-4.5" style={{ color }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.author_handle && (
                      <span className="text-sm font-semibold text-[#18181B]">@{item.author_handle}</span>
                    )}
                    {isIT && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">IT</span>
                    )}
                    {isEN && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-100 text-sky-700">EN</span>
                    )}
                    <span className="text-[10px] text-[#C4C4C8] ml-auto">{fmtDate(item.created_at)}</span>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-[#A1A1AA] italic">{item.notes}</p>
                  )}

                  {/* Permission badge */}
                  <button
                    onClick={() => togglePermission(item)}
                    disabled={permissionId === item.id}
                    title={
                      item.permission_granted === true
                        ? "Permission granted — click to mark as denied"
                        : item.permission_granted === false
                          ? "Permission denied — click to clear"
                          : "Permission unknown — click to mark as granted"
                    }
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors disabled:opacity-50 w-fit",
                      item.permission_granted === true
                        ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                        : item.permission_granted === false
                          ? "bg-red-50 text-red-500 hover:bg-red-100"
                          : "bg-[#F4F4F5] text-[#A1A1AA] hover:bg-[#E4E4E7] hover:text-[#71717A]"
                    )}
                  >
                    {permissionId === item.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : item.permission_granted === true ? (
                      <><Check className="w-3 h-3" /> Permission granted</>
                    ) : item.permission_granted === false ? (
                      <><X className="w-3 h-3" /> Permission denied</>
                    ) : (
                      "Permission?"
                    )}
                  </button>

                  {/* Reposted badge */}
                  {item.reposted && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                      <Check className="w-3.5 h-3.5" />
                      <span>Reposted{item.reposted_on ? ` on ${item.reposted_on}` : ""}</span>
                      {item.reposted_at && (
                        <span className="text-[#A1A1AA] font-normal">· {fmtDateTime(item.reposted_at)}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#A1A1AA] hover:text-[#71717A] transition-colors"
                      title="Open source post"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  {/* Repost toggle */}
                  {confirmDelete === item.id ? (
                    <div className="flex items-center gap-1.5 mt-auto">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-xs font-semibold text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-[#A1A1AA]">No</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-auto">
                      <button
                        onClick={() => setConfirmDelete(item.id)}
                        className="text-[#D4D4D8] hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleReposted(item)}
                        disabled={repostingId === item.id}
                        title={item.reposted ? "Mark as not reposted" : "Mark as reposted"}
                        className={cn(
                          "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50",
                          item.reposted
                            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            : "bg-[#F4F4F5] text-[#71717A] hover:bg-[#E4E4E7] hover:text-[#27272A]"
                        )}
                      >
                        {repostingId === item.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : item.reposted
                            ? <><Check className="w-3 h-3" /> Reposted</>
                            : "Mark reposted"
                        }
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* "Reposted on" modal */}
      {repostOnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#18181B]">Where did you repost it?</h2>
              <button onClick={() => setRepostOnModal(null)}>
                <X className="w-4 h-4 text-[#A1A1AA]" />
              </button>
            </div>
            <p className="text-sm text-[#71717A]">Choose the platform you reposted this UGC on.</p>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p}
                  onClick={() => confirmRepost(p)}
                  className="text-sm font-medium border border-[#E4E4E7] rounded-xl py-2.5 px-3 hover:border-[#A1A1AA] hover:bg-[#FAFAFA] transition-colors text-left"
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => confirmRepost(repostOnModal.platform)}
              className="w-full text-sm font-semibold text-white py-2.5 rounded-xl"
              style={{ background: accent }}
            >
              Reposted on {repostOnModal.platform}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
