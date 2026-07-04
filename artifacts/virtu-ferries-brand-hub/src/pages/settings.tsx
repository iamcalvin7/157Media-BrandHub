import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useListChangelogEntries } from "@workspace/api-client-react";
import {
  Loader2, Plus, Sparkles, FileText, CheckCircle2,
  Settings as SettingsIcon, Facebook, Link2, Trash2, AlertCircle, ExternalLink, Instagram,
} from "lucide-react";
import { format } from "date-fns";
import { useBrandContent } from "@/lib/brand-content";
import { useBrand } from "@/lib/brand";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type FbPage = { id: number; page_id: string; page_name: string; market_hint: string | null; instagram_account_id: string | null; created_at: string };

const MARKET_OPTIONS = [
  { value: "", label: "Any market" },
  { value: "Maltese Market", label: "Maltese Market (EN-FB)" },
  { value: "Italian Market", label: "Italian Market (EN-IT)" },
];

function getCategoryIcon(cat: string) {
  if (cat.toLowerCase().includes("brand")) return <Sparkles className="w-4 h-4 text-[#39A15F]" />;
  if (cat.toLowerCase().includes("asset") || cat.toLowerCase().includes("guideline")) return <FileText className="w-4 h-4 text-[#39A15F]" />;
  return <CheckCircle2 className="w-4 h-4 text-[#71717A]" />;
}

function ConnectedAccountsSection() {
  const { brandId } = useBrand();
  const [pages, setPages] = useState<FbPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [updatingMarket, setUpdatingMarket] = useState<string | null>(null);
  const [editingIg, setEditingIg] = useState<string | null>(null);
  const [igDraft, setIgDraft] = useState<string>("");
  const [savingIg, setSavingIg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);
  const [location] = useLocation();

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }

  async function loadPages() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/facebook/pages`, {
        headers: { "x-brand-id": String(brandId) },
        credentials: "include",
      });
      if (res.ok) setPages(await res.json());
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPages(); }, [brandId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("fb_connected") === "1") {
      window.history.replaceState({}, "", window.location.pathname);
      // If opened as a popup, notify the opener and close
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: "fb_connected" }, "*");
        window.close();
        return;
      }
      showToast("success", "Facebook page connected successfully!");
      loadPages();
    } else if (params.get("fb_error")) {
      const err = params.get("fb_error");
      window.history.replaceState({}, "", window.location.pathname);
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: "fb_error", error: err }, "*");
        window.close();
        return;
      }
      const messages: Record<string, string> = {
        invalid_state: "Connection failed — invalid state. Please try again.",
        no_pages: "No Facebook Pages found on your account. Make sure you have a Page (not just a personal profile).",
        no_page_token: "Pages were found but no page token was returned. Try reconnecting and make sure to grant all requested permissions.",
        token_exchange_failed: "Could not complete Facebook login. Please try again.",
        server_error: "A server error occurred. Please try again.",
        access_denied: "Connection cancelled.",
      };
      showToast("error", messages[err ?? ""] ?? `Facebook error: ${err}`);
    }
  }, [location]);

  // Listen for postMessage from the OAuth popup
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (e.data?.type === "fb_connected") {
        showToast("success", "Facebook page connected successfully!");
        loadPages();
      } else if (e.data?.type === "fb_error") {
        const messages: Record<string, string> = {
          no_pages: "No Facebook Pages found. Make sure you have a Page (not just a personal profile).",
          token_exchange_failed: "Could not complete Facebook login. Please try again.",
          server_error: "A server error occurred. Please try again.",
          access_denied: "Connection cancelled.",
        };
        showToast("error", messages[e.data.error ?? ""] ?? `Facebook error: ${e.data.error}`);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function saveIgAccountId(pageId: string) {
    setSavingIg(pageId);
    try {
      const res = await fetch(`${API_BASE}/api/facebook/pages/${pageId}/ig-account`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-brand-id": String(brandId) },
        credentials: "include",
        body: JSON.stringify({ instagram_account_id: igDraft.trim() || null }),
      });
      if (res.ok) {
        setPages(prev => prev.map(p => p.page_id === pageId ? { ...p, instagram_account_id: igDraft.trim() || null } : p));
        setEditingIg(null);
        showToast("success", igDraft.trim() ? "Instagram account linked ✓" : "Instagram account removed");
      } else {
        showToast("error", "Failed to save — please try again.");
      }
    } catch {
      showToast("error", "Network error — please try again.");
    } finally {
      setSavingIg(null);
    }
  }

  async function connectFacebook() {
    try {
      setConnecting(true);
      const res = await fetch(`${API_BASE}/api/facebook/auth-url`, {
        headers: { "x-brand-id": String(brandId) },
        credentials: "include",
      });
      if (!res.ok) { showToast("error", "Could not start Facebook login."); setConnecting(false); return; }
      const { url, callback_url } = await res.json();
      setCallbackUrl(callback_url);

      // Open as popup to avoid iframe restrictions (Facebook blocks loading in iframes)
      const w = 620, h = 700;
      const left = window.screenX + (window.outerWidth - w) / 2;
      const top = window.screenY + (window.outerHeight - h) / 2;
      const popup = window.open(url, "fb_oauth", `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`);

      if (!popup) {
        // Popup blocked — fall back to top-level navigation
        window.top ? (window.top.location.href = url) : (window.location.href = url);
        return;
      }

      // Poll until popup closes, then refresh pages
      const poll = setInterval(() => {
        if (popup.closed) {
          clearInterval(poll);
          setConnecting(false);
          loadPages();
        }
      }, 500);
    } catch {
      showToast("error", "Could not start Facebook login.");
      setConnecting(false);
    }
  }

  async function updateMarketHint(pageId: string, marketHint: string) {
    setUpdatingMarket(pageId);
    try {
      await fetch(`${API_BASE}/api/facebook/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-brand-id": String(brandId) },
        credentials: "include",
        body: JSON.stringify({ market_hint: marketHint || null }),
      });
      setPages((p) => p.map((x) => x.page_id === pageId ? { ...x, market_hint: marketHint || null } : x));
    } catch { /* silent */ } finally {
      setUpdatingMarket(null);
    }
  }

  async function disconnectPage(pageId: string, pageName: string) {
    if (!confirm(`Disconnect "${pageName}"? You won't be able to publish to this page until you reconnect.`)) return;
    setDisconnecting(pageId);
    try {
      const res = await fetch(`${API_BASE}/api/facebook/pages/${pageId}`, {
        method: "DELETE",
        headers: { "x-brand-id": String(brandId) },
        credentials: "include",
      });
      if (res.ok) {
        setPages((p) => p.filter((x) => x.page_id !== pageId));
        showToast("success", `"${pageName}" disconnected.`);
      } else {
        showToast("error", "Failed to disconnect page.");
      }
    } catch {
      showToast("error", "Failed to disconnect page.");
    } finally {
      setDisconnecting(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="border-b border-[#E4E4E7] pb-4">
        <h2 className="text-xl font-extrabold text-[#18181B]">Connected Accounts</h2>
        <p className="text-sm text-[#71717A] font-light mt-1">
          Connect your Facebook Pages to publish posts directly from the hub. Instagram accounts linked to each page are picked up automatically.
        </p>
      </div>

      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={cn(
            "flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border",
            toast.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-700",
          )}
        >
          {toast.type === "success"
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.message}
        </motion.div>
      )}

      <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1877F2] flex items-center justify-center">
              <Facebook className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-[#18181B] text-sm">Facebook Pages</p>
              <p className="text-xs text-[#71717A]">
                {pages.length === 0 ? "No pages connected" : `${pages.length} page${pages.length > 1 ? "s" : ""} connected`}
              </p>
            </div>
          </div>
          <button
            onClick={connectFacebook}
            disabled={connecting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#1877F2] text-white hover:bg-[#1666D8] disabled:opacity-60 transition-colors"
          >
            {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {pages.length === 0 ? "Connect a Page" : "Add another"}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-[#71717A] py-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </div>
        ) : pages.length > 0 ? (
          <div className="divide-y divide-[#E4E4E7]">
            {pages.map((page) => (
              <div key={page.page_id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 shrink-0 rounded-full bg-[#1877F2]/10 flex items-center justify-center">
                    <Facebook className="w-3.5 h-3.5 text-[#1877F2]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#18181B] truncate">{page.page_name}</p>
                    <p className="text-xs text-[#A1A1AA] mb-1">Connected {format(new Date(page.created_at), "MMM d, yyyy")}</p>
                    {editingIg === page.page_id ? (
                      <div className="flex items-center gap-1.5">
                        <Instagram className="w-3 h-3 text-[#E1306C] shrink-0" />
                        <input
                          type="text"
                          value={igDraft}
                          onChange={e => setIgDraft(e.target.value)}
                          placeholder="Instagram account ID (e.g. 17841400008460056)"
                          className="text-xs border border-[#E1306C]/40 rounded px-2 py-1 w-56 focus:outline-none focus:ring-2 focus:ring-[#E1306C]/30"
                          onKeyDown={e => { if (e.key === "Enter") saveIgAccountId(page.page_id); if (e.key === "Escape") setEditingIg(null); }}
                          autoFocus
                        />
                        <button onClick={() => saveIgAccountId(page.page_id)} disabled={savingIg === page.page_id} className="text-xs font-semibold text-white bg-[#E1306C] hover:bg-[#c01052] px-2 py-1 rounded disabled:opacity-50">
                          {savingIg === page.page_id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                        </button>
                        <button onClick={() => setEditingIg(null)} className="text-xs text-[#71717A] hover:text-[#27272A]">Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingIg(page.page_id); setIgDraft(page.instagram_account_id ?? ""); }}
                        className="inline-flex items-center gap-1 text-[10px] font-medium hover:opacity-80 transition-opacity"
                      >
                        {page.instagram_account_id
                          ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#E1306C] bg-pink-50 border border-pink-200 rounded px-1.5 py-0.5"><Instagram className="w-2.5 h-2.5" /> IG linked · edit</span>
                          : <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#1877F2] bg-blue-50 border border-blue-200 rounded px-1.5 py-0.5"><Instagram className="w-2.5 h-2.5" /> Link Instagram account</span>
                        }
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={page.market_hint ?? ""}
                    onChange={e => updateMarketHint(page.page_id, e.target.value)}
                    disabled={updatingMarket === page.page_id}
                    className="text-xs border border-[#E4E4E7] rounded-lg px-2 py-1 text-[#27272A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30 disabled:opacity-50"
                    title="Which market should this page receive posts from?"
                  >
                    {MARKET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <button
                    onClick={() => disconnectPage(page.page_id, page.page_name)}
                    disabled={disconnecting === page.page_id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 disabled:opacity-50 transition-colors"
                  >
                    {disconnecting === page.page_id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Trash2 className="w-3 h-3" />}
                    Disconnect
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {callbackUrl && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">One-time setup required</p>
            <p className="text-xs text-amber-700">
              Add this URL to your Facebook App's <strong>Valid OAuth Redirect URIs</strong> (App Settings → Facebook Login → Settings):
            </p>
            <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2">
              <code className="text-xs text-[#18181B] flex-1 break-all">{callbackUrl}</code>
              <button
                onClick={() => navigator.clipboard.writeText(callbackUrl)}
                className="text-xs text-amber-700 font-semibold hover:text-amber-900 shrink-0"
              >Copy</button>
            </div>
            <a
              href="https://developers.facebook.com/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium"
            >
              Open Facebook Developer Console <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Settings() {
  const { data: entries, isLoading } = useListChangelogEntries();
  const { brandShortLabel, hubLabel } = useBrandContent();
  const brandPrefix = brandShortLabel ? `${brandShortLabel} ` : "";

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 md:p-10 max-w-4xl mx-auto space-y-12 pb-24"
      >
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-[#39A15F]" />
            <h1 className="font-extrabold text-4xl md:text-5xl text-[#18181B] tracking-tight">Settings</h1>
          </div>
          <p className="text-lg text-[#A1A1AA] font-light max-w-2xl">
            Platform settings and knowledge history for the {brandPrefix}{hubLabel}.
          </p>
        </header>

        <ConnectedAccountsSection />

        <section className="space-y-6">
          <div className="border-b border-[#E4E4E7] pb-4">
            <h2 className="text-xl font-extrabold text-[#18181B]">Knowledge Changelog</h2>
            <p className="text-sm text-[#71717A] font-light mt-1">
              A running history of updates to the {brandPrefix}brand guidelines and AI agent capabilities.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#39A15F] animate-spin" />
            </div>
          ) : !entries || entries.length === 0 ? (
            <div className="text-center py-16 bg-[#FAFAFA] border border-[#E4E4E7] rounded-2xl">
              <p className="text-[#71717A]">No changelog entries found.</p>
            </div>
          ) : (
            <div className="relative border-l border-[#E4E4E7] ml-4 md:ml-6 space-y-12 pb-12">
              {entries.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.07 }}
                  className="relative pl-8 md:pl-10"
                >
                  <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-[#39A15F] ring-4 ring-[#F5F5F5]" />
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm text-[#71717A] font-mono">
                        {format(new Date(entry.date), "MMM dd, yyyy")}
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-[#F4F4F5] border border-[#E4E4E7] text-xs font-medium text-[#18181B] flex items-center gap-1.5">
                        {getCategoryIcon(entry.category)}
                        {entry.category}
                      </span>
                    </div>
                    <div className="bg-[#FAFAFA] border border-[#E4E4E7] rounded-2xl p-6 space-y-4 hover:border-[#A1A1AA] transition-colors">
                      <p className="text-lg text-[#18181B] font-medium">{entry.summary}</p>
                      {entry.capabilities && entry.capabilities.length > 0 && (
                        <div className="pt-4 border-t border-[#E4E4E7]">
                          <p className="text-xs text-[#71717A] uppercase tracking-widest font-semibold mb-3">Updated Capabilities</p>
                          <ul className="space-y-2">
                            {entry.capabilities.map((cap, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-[#A1A1AA] font-light">
                                <Plus className="w-4 h-4 text-[#39A15F] shrink-0 mt-0.5" />
                                {cap}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </motion.div>
    </div>
  );
}
