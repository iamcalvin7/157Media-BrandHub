import { useEffect, useState, useCallback } from "react";
import {
  Plus, Loader2, Trash2, FolderOpen, ExternalLink, X, Check,
  Calendar, User, Ruler, Tag, FileText, ChevronDown, ClipboardList,
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
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REQUEST_TYPES = ["Print", "Digital", "Social Media", "Video", "Outdoor", "Other"] as const;

const PRINT_SIZES = [
  "A6", "A5", "A4", "A3", "A2", "A1", "A0",
  "Roll-Up 80×200cm", "Roll-Up 85×200cm",
  "X-Banner 60×160cm",
  "Billboard",
  "Business Card",
  "Flyer",
  "Poster",
  "Pull-Up Banner",
  "Window Sticker",
  "Brochure",
  "Square 30×30cm",
  "Custom",
] as const;

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
                    {/* Name */}
                    <td className="px-4 py-3 align-middle max-w-[200px]">
                      <div className="font-semibold text-[#18181B] truncate group-hover/row:text-[#1e82b4] transition-colors">{r.name}</div>
                      {r.market && (
                        <span className={cn(
                          "inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                          r.market.toLowerCase().includes("italian")
                            ? "bg-[#1e82b4]/10 text-[#1e82b4]"
                            : "bg-[#f6a610]/10 text-[#f6a610]",
                        )}>
                          {r.market.toLowerCase().includes("italian") ? "IT" : "EN"}
                        </span>
                      )}
                    </td>
                    {/* Type */}
                    <td className="px-4 py-3 align-middle text-xs text-[#52525B]">{r.request_type || "—"}</td>
                    {/* Sizes */}
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
                    {/* Designer */}
                    <td className="px-4 py-3 align-middle text-xs text-[#52525B]">{r.designer || "—"}</td>
                    {/* Deadline */}
                    <td className={cn("px-4 py-3 align-middle text-xs font-medium whitespace-nowrap", overdue ? "text-red-500" : "text-[#52525B]")}>
                      {fmtDate(r.deadline)}
                      {overdue && <span className="ml-1 text-[9px] font-bold uppercase tracking-wide">Overdue</span>}
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                      <StatusDropdown status={r.status} onChange={(s) => updateStatus(r.id, s)} />
                    </td>
                    {/* Actions */}
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

// ─── New request modal ────────────────────────────────────────────────────────

interface FormState {
  name: string;
  request_type: string;
  sizes: string[];
  designer: string;
  deadline: string;
  market: string;
  notes: string;
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
    name: "", request_type: "Print", sizes: [], designer: "", deadline: "", market: "English Market", notes: "",
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

  function toggleSize(s: string) {
    setForm((f) => ({
      ...f,
      sizes: f.sizes.includes(s) ? f.sizes.filter((x) => x !== s) : [...f.sizes, s],
    }));
  }

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

          {/* Sizes */}
          <div>
            <label className={label}>Sizes <span className="text-[#A1A1AA] font-normal normal-case tracking-normal">(select all that apply)</span></label>
            <div className="flex flex-wrap gap-1.5">
              {PRINT_SIZES.map((s) => {
                const selected = form.sizes.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSize(s)}
                    className={cn(
                      "text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors",
                      selected
                        ? "bg-[#1e82b4] border-[#1e82b4] text-white"
                        : "bg-white border-[#E4E4E7] text-[#52525B] hover:border-[#1e82b4] hover:text-[#1e82b4]",
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
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

  return (
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

          {request.notes?.trim() && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-1">Notes</p>
              <p className="text-[13px] text-[#27272A] leading-relaxed whitespace-pre-wrap">{request.notes}</p>
            </div>
          )}

          {/* Status change */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#A1A1AA] font-semibold mb-1.5">Update Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => onStatusChange(request.id, s.value)}
                  className={cn(
                    "text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all",
                    request.status === s.value
                      ? cn(s.color, "border-transparent")
                      : "bg-white border-[#E4E4E7] text-[#71717A] hover:border-[#A1A1AA]",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Drive link */}
          {request.drive_url && (
            <a
              href={request.drive_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-[13px] font-semibold hover:underline"
              style={{ color: accent }}
            >
              <FolderOpen className="w-4 h-4 shrink-0" />
              Open Drive Folder
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          )}
          {!request.drive_url && (
            <p className="text-[12px] text-[#A1A1AA] flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              Drive folder is being created…
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#F4F4F5] flex items-center justify-between">
          <button
            onClick={() => onDelete(request.id)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#52525B] hover:text-[#18181B] rounded-xl hover:bg-[#F4F4F5] transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
