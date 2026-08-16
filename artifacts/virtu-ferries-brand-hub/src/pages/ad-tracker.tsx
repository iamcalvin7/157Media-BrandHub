import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Megaphone, Plus, Trash2, ExternalLink, Check, Loader2, ArrowLeft } from "lucide-react";
import { useBrands } from "@/lib/brand";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

type AdBoost = {
  id: number;
  brand_id: number;
  post_url: string;
  post_name: string | null;
  posted_on: string | null;
  boost_amount: number | null;
  boost_duration: string | null;
  target_audience: string | null;
  done: boolean;
  created_at: string;
};

const AUDIENCES = ["EN", "IT", "EN + IT"];

function isValidUrl(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function AdTracker() {
  const { brands } = useBrands();
  const [rows, setRows] = useState<AdBoost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [postUrl, setPostUrl] = useState("");
  const [postName, setPostName] = useState("");
  const [postedOn, setPostedOn] = useState("");
  const [brandId, setBrandId] = useState<number | "">("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [audience, setAudience] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Brand switch: null = all brands, otherwise show only that brand's boosts
  const [filterBrandId, setFilterBrandId] = useState<number | null>(null);

  const brandById = useMemo(() => {
    const m = new Map<number, string>();
    brands.forEach((b) => m.set(b.id, b.name));
    return m;
  }, [brands]);

  const load = useCallback(async () => {
    try {
      const resp = await fetch(`${API}/api/ad-boosts`);
      if (!resp.ok) throw new Error(`Failed to load (${resp.status})`);
      setRows((await resp.json()) as AdBoost[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ad boosts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleAdd = async () => {
    setFormError(null);
    if (!postUrl.trim() || !isValidUrl(postUrl.trim())) {
      setFormError("Please paste a valid post link (starting with https://).");
      return;
    }
    if (brandId === "") {
      setFormError("Please choose a brand.");
      return;
    }
    setSaving(true);
    try {
      const resp = await fetch(`${API}/api/ad-boosts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_url: postUrl.trim(),
          post_name: postName.trim() || null,
          posted_on: postedOn || null,
          brand_id: brandId,
          boost_amount: amount.trim() ? Number(amount) : null,
          boost_duration: duration.trim() || null,
          target_audience: audience || null,
        }),
      });
      if (!resp.ok) throw new Error("Failed to save");
      const row = (await resp.json()) as AdBoost;
      setRows((prev) => [row, ...prev]);
      setPostUrl(""); setPostName(""); setPostedOn(""); setAmount(""); setDuration(""); setAudience("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = async (row: AdBoost) => {
    // Optimistic update
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, done: !r.done } : r)));
    try {
      const resp = await fetch(`${API}/api/ad-boosts/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !row.done }),
      });
      if (!resp.ok) throw new Error();
    } catch {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, done: row.done } : r)));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Remove this boost entry?")) return;
    const prev = rows;
    setRows((p) => p.filter((r) => r.id !== id));
    try {
      const resp = await fetch(`${API}/api/ad-boosts/${id}`, { method: "DELETE" });
      if (!resp.ok) throw new Error();
    } catch {
      setRows(prev);
    }
  };

  const visible = filterBrandId === null ? rows : rows.filter((r) => r.brand_id === filterBrandId);
  const active = visible.filter((r) => !r.done);
  const completed = visible.filter((r) => r.done);
  const totalSpent = visible.reduce((sum, r) => sum + (r.boost_amount ?? 0), 0);

  // Virtu Ferries view is split by audience: English on top, Italian below.
  const vfBrandId = brands.find((b) => b.slug === "virtu-ferries")?.id;
  const isVfView = filterBrandId !== null && filterBrandId === vfBrandId;
  const isItalian = (r: AdBoost) => (r.target_audience ?? "").includes("IT");
  const isEnglish = (r: AdBoost) => !isItalian(r) || (r.target_audience ?? "").includes("EN");
  const englishRows = visible.filter(isEnglish);
  const italianRows = visible.filter(isItalian);

  const renderGrouped = (list: AdBoost[]) => {
    const running = list.filter((r) => !r.done);
    const done = list.filter((r) => r.done);
    return (
      <div className="space-y-4">
        {running.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A1A1AA] mb-2">
              Running / To do ({running.length})
            </h3>
            <div className="space-y-2">{running.map(renderRow)}</div>
          </div>
        )}
        {done.length > 0 && (
          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A1A1AA] mb-2">
              Done ({done.length})
            </h3>
            <div className="space-y-2">{done.map(renderRow)}</div>
          </div>
        )}
        {list.length === 0 && (
          <p className="text-[12px] text-[#A1A1AA] py-2">Nothing here yet.</p>
        )}
      </div>
    );
  };

  const renderRow = (row: AdBoost) => (
    <div
      key={row.id}
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl border bg-white transition-colors ${
        row.done ? "border-[#E4E4E7] opacity-60" : "border-[#E4E4E7] hover:border-[#D4D4D8]"
      }`}
      data-testid={`ad-boost-row-${row.id}`}
    >
      <button
        onClick={() => void toggleDone(row)}
        className={`shrink-0 h-5 w-5 rounded-md border grid place-items-center transition-colors ${
          row.done
            ? "bg-[#39A15F] border-[#39A15F] text-white"
            : "border-[#D4D4D8] hover:border-[#39A15F] text-transparent"
        }`}
        title={row.done ? "Mark as not done" : "Mark as done"}
        data-testid={`ad-boost-done-${row.id}`}
      >
        <Check className="w-3.5 h-3.5" />
      </button>

      <div className="min-w-0 flex-1">
        <a
          href={row.post_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 text-[13px] font-medium truncate max-w-full ${
            row.done ? "text-[#71717A] line-through" : "text-[#2563EB] hover:underline"
          }`}
        >
          <span className="truncate">{row.post_name || row.post_url.replace(/^https?:\/\//, "")}</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-[#71717A]">
          <span className="font-semibold text-[#18181B]">{brandById.get(row.brand_id) ?? "—"}</span>
          {row.boost_amount != null && <span>€{row.boost_amount}</span>}
          {row.boost_duration && <span>{row.boost_duration}</span>}
          {row.target_audience && (
            <span className="px-1.5 py-px rounded bg-[#F4F4F5] text-[#52525B] font-medium">{row.target_audience}</span>
          )}
          <span className="text-[#A1A1AA]">
            Posted {new Date(row.posted_on ?? row.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>

      <button
        onClick={() => void handleDelete(row.id)}
        className="shrink-0 opacity-0 group-hover:opacity-100 text-[#A1A1AA] hover:text-red-500 transition-all p-1"
        title="Delete"
        data-testid={`ad-boost-delete-${row.id}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-3xl mx-auto p-6 md:p-10"
      >
        <header className="mb-7">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] text-[#71717A] hover:text-[#18181B] transition-colors mb-4"
            data-testid="link-back-to-hub"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to hub
          </Link>
          <br />
          <span className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.28em] text-[#71717A] mb-3">
            <Megaphone className="w-3.5 h-3.5 text-[#39A15F]" />
            Paid Social
          </span>
          <h1 className="text-2xl font-bold text-[#18181B] tracking-[-0.015em] uppercase">Ad Tracker</h1>
          <p className="text-[14px] text-[#71717A] mt-1.5 font-light">
            Keep track of every boosted post — what it cost, how long it ran, and who it targeted.
          </p>
        </header>

        {/* Brand switch */}
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#E9E9EB] mb-5" data-testid="ad-boost-brand-switch">
          <button
            onClick={() => setFilterBrandId(null)}
            className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
              filterBrandId === null ? "bg-white text-[#18181B] shadow-sm" : "text-[#71717A] hover:text-[#18181B]"
            }`}
            data-testid="brand-switch-all"
          >
            All
          </button>
          {brands.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setFilterBrandId(b.id);
                setBrandId(b.id); // preset the add form to the selected brand
              }}
              className={`px-3.5 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                filterBrandId === b.id ? "bg-white text-[#18181B] shadow-sm" : "text-[#71717A] hover:text-[#18181B]"
              }`}
              data-testid={`brand-switch-${b.slug}`}
            >
              {b.shortName ?? b.name}
            </button>
          ))}
        </div>

        {/* Add form */}
        <div className="bg-white rounded-2xl border border-[#E4E4E7] p-5 mb-8">
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={postName}
                onChange={(e) => setPostName(e.target.value)}
                placeholder="Post name (e.g. Summer Gozo offer)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] text-[13px] focus:outline-none focus:border-[#39A15F] focus:ring-1 focus:ring-[#39A15F]/40 placeholder:text-[#A1A1AA]"
                data-testid="ad-boost-name-input"
              />
              <input
                type="url"
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                placeholder="Paste the live post link (https://…)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E4E4E7] text-[13px] focus:outline-none focus:border-[#39A15F] focus:ring-1 focus:ring-[#39A15F]/40 placeholder:text-[#A1A1AA]"
                data-testid="ad-boost-url-input"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : "")}
                className="px-3 py-2.5 rounded-xl border border-[#E4E4E7] text-[13px] bg-white focus:outline-none focus:border-[#39A15F] text-[#18181B]"
                data-testid="ad-boost-brand-select"
              >
                <option value="">Brand…</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={postedOn}
                onChange={(e) => setPostedOn(e.target.value)}
                title="Date posted"
                className="px-3 py-2.5 rounded-xl border border-[#E4E4E7] text-[13px] bg-white focus:outline-none focus:border-[#39A15F] text-[#18181B]"
                data-testid="ad-boost-date-input"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount (€)"
                className="px-3 py-2.5 rounded-xl border border-[#E4E4E7] text-[13px] focus:outline-none focus:border-[#39A15F] placeholder:text-[#A1A1AA]"
                data-testid="ad-boost-amount-input"
              />
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Duration (e.g. 7 days)"
                className="px-3 py-2.5 rounded-xl border border-[#E4E4E7] text-[13px] focus:outline-none focus:border-[#39A15F] placeholder:text-[#A1A1AA]"
                data-testid="ad-boost-duration-input"
              />
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="px-3 py-2.5 rounded-xl border border-[#E4E4E7] text-[13px] bg-white focus:outline-none focus:border-[#39A15F] text-[#18181B]"
                data-testid="ad-boost-audience-select"
              >
                <option value="">Audience…</option>
                {AUDIENCES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            {formError && <p className="text-[12px] text-red-500">{formError}</p>}
            <div>
              <button
                onClick={() => void handleAdd()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#18181B] text-white text-[13px] font-semibold hover:bg-[#39A15F] transition-colors disabled:opacity-50"
                data-testid="ad-boost-add-button"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add boost
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-[#71717A] py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <p className="text-[13px] text-red-500 py-4">{error}</p>
        ) : visible.length === 0 ? (
          <div className="text-center py-12 text-[#A1A1AA]">
            <Megaphone className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p className="text-[13px]">
              {filterBrandId === null
                ? "No boosted posts tracked yet. Add your first one above."
                : `No boosted posts for ${brandById.get(filterBrandId) ?? "this brand"} yet.`}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {isVfView ? (
              <>
                {/* English half */}
                <section className="rounded-2xl border border-[#E4E4E7] bg-white/60 p-4">
                  <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-[#18181B] mb-3">
                    <span className="px-1.5 py-px rounded bg-[#18181B] text-white text-[10px]">EN</span>
                    English ({englishRows.length})
                  </h2>
                  {renderGrouped(englishRows)}
                </section>
                {/* Italian half */}
                <section className="rounded-2xl border border-[#E4E4E7] bg-white/60 p-4">
                  <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.18em] text-[#18181B] mb-3">
                    <span className="px-1.5 py-px rounded bg-[#39A15F] text-white text-[10px]">IT</span>
                    Italian ({italianRows.length})
                  </h2>
                  {renderGrouped(italianRows)}
                </section>
              </>
            ) : (
              <>
            {active.length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#71717A] mb-2.5">
                  Running / To do ({active.length})
                </h2>
                <div className="space-y-2">{active.map(renderRow)}</div>
              </section>
            )}
            {completed.length > 0 && (
              <section>
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#71717A] mb-2.5">
                  Done ({completed.length})
                </h2>
                <div className="space-y-2">{completed.map(renderRow)}</div>
              </section>
            )}
              </>
            )}

            {/* Total spent */}
            <div
              className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-[#18181B] text-white"
              data-testid="ad-boost-total-spent"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A1A1AA]">
                Total spent{filterBrandId !== null ? ` — ${brandById.get(filterBrandId) ?? ""}` : ""}
              </span>
              <span className="text-[16px] font-bold">
                €{totalSpent.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
