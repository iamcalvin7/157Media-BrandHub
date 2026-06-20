import { useEffect, useState, useRef } from "react";
import { Plus, Loader2, Pencil, Trash2, Check, X, ExternalLink, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/brand";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Resource {
  id: number;
  brand_id: number;
  name: string;
  url: string;
  notes: string | null;
}

function cleanUrl(u: string): string {
  const t = u.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export default function GhsResources() {
  const { activeBrand } = useBrand();
  const brandId = activeBrand?.id;
  const accent = activeBrand?.primaryColor ?? "#1e82b4";

  const [items, setItems] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  async function load() {
    if (!brandId) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/brand-resources?brand_id=${brandId}`);
      setItems(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [brandId]);

  async function handleAdd(name: string, url: string, notes: string) {
    const r = await fetch(`${API}/api/brand-resources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brand_id: brandId, name, url: cleanUrl(url), notes: notes || null }),
    });
    if (r.ok) {
      const created = await r.json();
      setItems(prev => [...prev, created]);
      setAdding(false);
    }
  }

  async function handleEdit(id: number, name: string, url: string, notes: string) {
    const r = await fetch(`${API}/api/brand-resources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url: cleanUrl(url), notes: notes || null }),
    });
    if (r.ok) {
      const updated = await r.json();
      setItems(prev => prev.map(x => x.id === id ? updated : x));
      setEditingId(null);
    }
  }

  async function handleDelete(id: number) {
    setItems(prev => prev.filter(x => x.id !== id));
    const r = await fetch(`${API}/api/brand-resources/${id}`, { method: "DELETE" });
    if (!r.ok) void load();
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#A1A1AA] mb-2">
            <Globe className="w-3.5 h-3.5" />
            Reference
          </div>
          <h1 className="text-3xl font-extrabold text-[#18181B] tracking-tight">Resources</h1>
          <p className="text-sm text-[#71717A] mt-1.5">
            Useful websites and links for the GHS team.
          </p>
        </div>
        <button
          onClick={() => { setAdding(true); setEditingId(null); }}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-2 rounded-lg text-white transition-colors shadow-sm"
          style={{ backgroundColor: accent }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add resource
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-[#E4E4E7] bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F5F5F5] border-b border-[#E4E4E7]">
            <tr>
              <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">Website</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">Link</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">Notes</th>
              <th className="px-5 py-3 w-20" />
            </tr>
          </thead>
          <tbody>
            {/* Add row */}
            {adding && (
              <AddRow
                accent={accent}
                onSave={handleAdd}
                onCancel={() => setAdding(false)}
              />
            )}

            {loading ? (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-[#A1A1AA] mx-auto" />
                </td>
              </tr>
            ) : items.length === 0 && !adding ? (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center text-sm text-[#A1A1AA]">
                  No resources yet — click <strong>Add resource</strong> to get started.
                </td>
              </tr>
            ) : (
              items.map((item, i) =>
                editingId === item.id ? (
                  <EditRow
                    key={item.id}
                    item={item}
                    accent={accent}
                    onSave={(name, url, notes) => handleEdit(item.id, name, url, notes)}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <ResourceRow
                    key={item.id}
                    item={item}
                    striped={i % 2 === 1}
                    onEdit={() => { setEditingId(item.id); setAdding(false); }}
                    onDelete={() => handleDelete(item.id)}
                  />
                )
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ResourceRow({
  item, striped, onEdit, onDelete,
}: {
  item: Resource;
  striped: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <tr className={cn("border-b border-[#F4F4F5] last:border-0 group", striped ? "bg-[#F9F9F9]" : "bg-white")}>
      <td className="px-5 py-3 font-semibold text-[#18181B] align-top whitespace-nowrap">
        {item.name}
      </td>
      <td className="px-5 py-3 align-top">
        <a
          href={cleanUrl(item.url)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[#1e82b4] hover:underline text-[12px] break-all"
        >
          {item.url}
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      </td>
      <td className="px-5 py-3 text-[13px] text-[#52525B] align-top whitespace-pre-wrap">
        {item.notes || <span className="text-[#D4D4D8] italic">—</span>}
      </td>
      <td className="px-5 py-3 align-top">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {confirmDelete ? (
            <>
              <button
                onClick={onDelete}
                className="text-[11px] font-semibold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded-md transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[11px] text-[#A1A1AA] hover:text-[#52525B] px-1 py-1"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="p-1.5 rounded-md text-[#A1A1AA] hover:text-[#27272A] hover:bg-[#F4F4F5] transition-colors"
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-md text-[#A1A1AA] hover:text-red-500 hover:bg-red-50 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function AddRow({ accent, onSave, onCancel }: {
  accent: string;
  onSave: (name: string, url: string, notes: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);
  const valid = name.trim() && url.trim();
  return (
    <tr className="bg-[#F0F9FF] border-b border-[#E4E4E7]">
      <td className="px-5 py-2.5 align-top">
        <input ref={nameRef} value={name} onChange={e => setName(e.target.value)}
          placeholder="Website name"
          className="w-full text-[13px] bg-white border border-[#E4E4E7] rounded-lg px-2.5 py-1.5 text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/30 focus:border-[#1e82b4]/60"
        />
      </td>
      <td className="px-5 py-2.5 align-top">
        <input value={url} onChange={e => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full text-[13px] bg-white border border-[#E4E4E7] rounded-lg px-2.5 py-1.5 text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/30 focus:border-[#1e82b4]/60"
        />
      </td>
      <td className="px-5 py-2.5 align-top">
        <input value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Optional notes"
          className="w-full text-[13px] bg-white border border-[#E4E4E7] rounded-lg px-2.5 py-1.5 text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/30 focus:border-[#1e82b4]/60"
        />
      </td>
      <td className="px-5 py-2.5 align-top">
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => valid && onSave(name.trim(), url.trim(), notes.trim())} disabled={!valid}
            className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Save"
          >
            <Check className="w-4 h-4" />
          </button>
          <button onClick={onCancel}
            className="p-1.5 rounded-md text-[#A1A1AA] hover:text-[#52525B] hover:bg-[#F4F4F5] transition-colors"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function EditRow({ item, accent, onSave, onCancel }: {
  item: Resource;
  accent: string;
  onSave: (name: string, url: string, notes: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [url, setUrl] = useState(item.url);
  const [notes, setNotes] = useState(item.notes ?? "");
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);
  const valid = name.trim() && url.trim();
  return (
    <tr className="bg-[#FFFBEB] border-b border-[#E4E4E7]">
      <td className="px-5 py-2.5 align-top">
        <input ref={nameRef} value={name} onChange={e => setName(e.target.value)}
          className="w-full text-[13px] bg-white border border-[#E4E4E7] rounded-lg px-2.5 py-1.5 text-[#18181B] focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/30 focus:border-[#1e82b4]/60"
        />
      </td>
      <td className="px-5 py-2.5 align-top">
        <input value={url} onChange={e => setUrl(e.target.value)}
          className="w-full text-[13px] bg-white border border-[#E4E4E7] rounded-lg px-2.5 py-1.5 text-[#18181B] focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/30 focus:border-[#1e82b4]/60"
        />
      </td>
      <td className="px-5 py-2.5 align-top">
        <input value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full text-[13px] bg-white border border-[#E4E4E7] rounded-lg px-2.5 py-1.5 text-[#18181B] focus:outline-none focus:ring-2 focus:ring-[#1e82b4]/30 focus:border-[#1e82b4]/60"
        />
      </td>
      <td className="px-5 py-2.5 align-top">
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => valid && onSave(name.trim(), url.trim(), notes.trim())} disabled={!valid}
            className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Save"
          >
            <Check className="w-4 h-4" />
          </button>
          <button onClick={onCancel}
            className="p-1.5 rounded-md text-[#A1A1AA] hover:text-[#52525B] hover:bg-[#F4F4F5] transition-colors"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
