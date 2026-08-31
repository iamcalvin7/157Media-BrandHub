import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Megaphone, Plus, Trash2, ExternalLink, Check, Loader2, ArrowLeft, LockKeyhole } from "lucide-react";
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
  content_post_id: number | null;
  spend_month: string | null;
  page: "GHS" | "VF-EN" | "VF-IT" | null;
  source: "manual" | "calendar";
  done: boolean;
  created_at: string;
};

const REPORTING_PAGES = ["GHS", "VF-EN", "VF-IT"] as const;
type ReportingPage = typeof REPORTING_PAGES[number];
const PAGE_LABELS: Record<ReportingPage, string> = {
  GHS: "GHS",
  "VF-EN": "VF – EN",
  "VF-IT": "VF IT",
};

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
  const [manualPage, setManualPage] = useState<ReportingPage | "">("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [filterPage, setFilterPage] = useState<ReportingPage | "ALL">("ALL");
  const [filterMonth, setFilterMonth] = useState<string>("ALL");

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
    if (manualPage === "") {
      setFormError("Please choose a page.");
      return;
    }
    const selectedBrand = manualPage === "GHS"
      ? brands.find((brand) => brand.slug === "gozo-highspeed")
      : brands.find((brand) => brand.slug === "virtu-ferries");
    if (!selectedBrand) {
      setFormError("The selected page is not available.");
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
          brand_id: selectedBrand.id,
          boost_amount: amount.trim() ? Number(amount) : null,
          boost_duration: duration.trim() || null,
          target_audience: manualPage === "VF-IT" ? "IT" : manualPage === "VF-EN" ? "EN" : null,
          spend_month: postedOn ? postedOn.slice(0, 7) : new Date().toISOString().slice(0, 7),
          page: manualPage,
        }),
      });
      if (!resp.ok) throw new Error("Failed to save");
      const row = (await resp.json()) as AdBoost;
      setRows((prev) => [row, ...prev]);
      setPostUrl(""); setPostName(""); setPostedOn(""); setAmount(""); setDuration("");
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

  const ghsBrandId = brands.find((b) => b.slug === "gozo-highspeed")?.id;
  const rowPage = (row: AdBoost): ReportingPage => row.page
    ?? (row.brand_id === ghsBrandId ? "GHS" : (row.target_audience ?? "").includes("IT") ? "VF-IT" : "VF-EN");
  const rowMonth = (row: AdBoost): string => row.spend_month
    ?? row.posted_on?.slice(0, 7)
    ?? row.created_at.slice(0, 7);
  const availableMonths = Array.from(new Set(rows.map(rowMonth))).sort().reverse();
  const visible = rows.filter((row) =>
    (filterPage === "ALL" || rowPage(row) === filterPage)
    && (filterMonth === "ALL" || rowMonth(row) === filterMonth)
  );
  const totalSpent = visible.reduce((sum, row) => sum + (row.done ? (row.boost_amount ?? 0) : 0), 0);
  const pageTotals = Object.fromEntries(REPORTING_PAGES.map((page) => [
    page,
    visible
      .filter((row) => rowPage(row) === page && row.done)
      .reduce((sum, row) => sum + (row.boost_amount ?? 0), 0),
  ])) as Record<ReportingPage, number>;
  const groupedMonths = Array.from(new Set(visible.map(rowMonth))).sort().reverse();

  const renderRow = (row: AdBoost) => (
    <div
      key={row.id}
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl border bg-white transition-colors ${
        row.source === "calendar"
          ? "border-violet-200"
          : row.done ? "border-[#E4E4E7] opacity-60" : "border-[#E4E4E7] hover:border-[#D4D4D8]"
      }`}
      data-testid={`ad-boost-row-${row.id}`}
    >
      {row.source === "calendar" ? (
        <span className="shrink-0 h-5 w-5 rounded-md grid place-items-center bg-violet-100 text-violet-700" title="Synced from the content calendar">
          <LockKeyhole className="w-3 h-3" />
        </span>
      ) : (
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
      )}

      <div className="min-w-0 flex-1">
        <a
          href={row.post_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium truncate max-w-full text-[#2563EB] hover:underline"
        >
          <span className="truncate">{row.post_name || row.post_url.replace(/^https?:\/\//, "")}</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-[#71717A]">
          <span className="font-semibold text-[#18181B]">{PAGE_LABELS[rowPage(row)]}</span>
          {row.boost_amount != null && <span>€{row.boost_amount.toFixed(2)}</span>}
          {row.boost_duration && <span>{row.boost_duration}</span>}
          {row.source === "calendar" && (
            <span className="px-1.5 py-px rounded bg-violet-100 text-violet-700 font-medium">Calendar</span>
          )}
          <span className="text-[#A1A1AA]">
            Posted {new Date(row.posted_on ?? row.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>
      </div>

      {row.source !== "calendar" && (
        <button
          onClick={() => void handleDelete(row.id)}
          className="shrink-0 opacity-0 group-hover:opacity-100 text-[#A1A1AA] hover:text-red-500 transition-all p-1"
          title="Delete"
          data-testid={`ad-boost-delete-${row.id}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
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

        {/* Page and month filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-5">
          <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#E9E9EB] overflow-x-auto" data-testid="ad-boost-page-switch">
            {(["ALL", ...REPORTING_PAGES] as const).map((page) => (
              <button
                key={page}
                onClick={() => setFilterPage(page)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                  filterPage === page ? "bg-white text-[#18181B] shadow-sm" : "text-[#71717A] hover:text-[#18181B]"
                }`}
              >
                {page === "ALL" ? "All pages" : PAGE_LABELS[page]}
              </button>
            ))}
          </div>
          <select
            value={filterMonth}
            onChange={(event) => setFilterMonth(event.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E4E4E7] text-[12px] font-semibold bg-white text-[#18181B]"
            aria-label="Filter by spend month"
          >
            <option value="ALL">All months</option>
            {availableMonths.map((month) => (
              <option key={month} value={month}>
                {new Date(`${month}-01T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
              </option>
            ))}
          </select>
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select
                value={manualPage}
                onChange={(e) => setManualPage(e.target.value as ReportingPage | "")}
                className="px-3 py-2.5 rounded-xl border border-[#E4E4E7] text-[13px] bg-white focus:outline-none focus:border-[#39A15F] text-[#18181B]"
                data-testid="ad-boost-page-select"
              >
                <option value="">Page…</option>
                {REPORTING_PAGES.map((page) => (
                  <option key={page} value={page}>{PAGE_LABELS[page]}</option>
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
            <p className="text-[13px]">No boosted posts match these page and month filters.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {REPORTING_PAGES.map((page) => (
                <div key={page} className="rounded-xl border border-[#E4E4E7] bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#71717A]">{PAGE_LABELS[page]}</p>
                  <p className="text-[18px] font-bold text-[#18181B] mt-1">€{pageTotals[page].toFixed(2)}</p>
                </div>
              ))}
            </div>

            {groupedMonths.map((month) => (
              <section key={month} className="rounded-2xl border border-[#E4E4E7] bg-white/60 p-4">
                <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#18181B] mb-3">
                  {new Date(`${month}-01T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                </h2>
                <div className="space-y-4">
                  {REPORTING_PAGES.map((page) => {
                    const pageRows = visible.filter((row) => rowMonth(row) === month && rowPage(row) === page);
                    if (pageRows.length === 0) return null;
                    const subtotal = pageRows.reduce((sum, row) => sum + (row.done ? row.boost_amount ?? 0 : 0), 0);
                    return (
                      <div key={page}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#71717A]">{PAGE_LABELS[page]}</h3>
                          <span className="text-[11px] font-bold text-[#18181B]">€{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="space-y-2">{pageRows.map(renderRow)}</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* Total spent */}
            <div
              className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-[#18181B] text-white"
              data-testid="ad-boost-total-spent"
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#A1A1AA]">
                Total spent{filterMonth !== "ALL" ? ` — ${filterMonth}` : ""}
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
