import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Bell, Check, Clock, MessageSquare, CheckCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrand } from "@/lib/brand";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface FeedbackItem {
  id: number;
  post_id: number;
  post_title: string | null;
  post_month: string | null;
  decision: string | null;
  comment: string | null;
  client_name: string | null;
  created_at: string;
  amended_at: string | null;
  brand_id: number | null;
  brand_slug: string | null;
  brand_name: string | null;
  brand_primary_color: string | null;
}

type Tab = "active" | "done";

const DISMISSED_KEY = "feedback_dismissed_all";

function loadDismissed(): Set<number> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
  } catch { return new Set(); }
}

function saveDismissed(ids: Set<number>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
    window.dispatchEvent(new Event("hub:feedback-dismissed-changed"));
  } catch {}
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function NotificationsCentre() {
  const [, navigate] = useLocation();
  const { activeBrand, setActiveBrandSlug } = useBrand();
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(() => loadDismissed());
  const [tab, setTab] = useState<Tab>("active");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<number | null>(null);

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/content/feedback`, { credentials: "include" });
      if (!res.ok) return;
      setItems(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeedback();
    const interval = setInterval(fetchFeedback, 60_000);
    const onVisible = () => { if (document.visibilityState === "visible") fetchFeedback(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [fetchFeedback]);

  function dismiss(id: number) {
    const next = new Set([...dismissed, id]);
    setDismissed(next);
    saveDismissed(next);
  }

  function unarchive(id: number) {
    const next = new Set([...dismissed]);
    next.delete(id);
    setDismissed(next);
    saveDismissed(next);
  }

  async function handleAmend(item: FeedbackItem) {
    if (!item.brand_id) return;
    setActing(item.id);
    try {
      const res = await fetch(`${API}/api/content/feedback/${item.id}/amend`, {
        method: "PATCH",
        headers: { "x-brand-id": String(item.brand_id) },
        credentials: "include",
      });
      if (res.ok) {
        const updated = await res.json();
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, amended_at: updated.amended_at } : i));
        window.dispatchEvent(new Event("hub:feedback-amended"));
      }
    } finally { setActing(null); }
  }

  function handleNavigate(item: FeedbackItem) {
    if (item.brand_slug && item.brand_slug !== activeBrand?.slug) {
      setActiveBrandSlug(item.brand_slug);
    }
    navigate(`/content-calendar${item.post_id ? `?post=${item.post_id}` : ""}`);
    if (item.post_id) {
      window.dispatchEvent(new CustomEvent("hub:open-post", { detail: { postId: item.post_id } }));
    }
  }

  const isResolved = (i: FeedbackItem) => !!i.amended_at || i.decision === "approved";
  const isDone = (i: FeedbackItem) => isResolved(i) || dismissed.has(i.id);

  const activeItems = items.filter(i => !isDone(i));
  const doneItems   = items.filter(i => isDone(i));

  const displayed = tab === "active" ? activeItems : doneItems;
  const activeCount = activeItems.length;

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: "active", label: "Active", count: activeCount },
    { id: "done",   label: "Done",   count: doneItems.length },
  ];

  return (
    <div className="rounded-2xl bg-[#141414] border border-[#252525] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1E1E1E]">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-[#39A15F]" />
          <span className="text-[11px] font-semibold text-[#FAFAFA] uppercase tracking-[0.18em]">Notifications</span>
          {activeCount > 0 && (
            <span className="min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
              {activeCount > 9 ? "9+" : activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "text-[10px] font-medium px-2 py-1 rounded-lg transition-colors flex items-center gap-1",
                tab === t.id ? "bg-white/10 text-[#FAFAFA]" : "text-[#6B6B73] hover:text-[#A1A1AA]"
              )}
            >
              {t.label}
              {(t.count ?? 0) > 0 && (
                <span className={cn("text-[9px] font-bold", tab === t.id ? "text-[#A1A1AA]" : "text-[#4A4A52]")}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto max-h-[200px]">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-5 text-[11px] text-[#6B6B73]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
          </div>
        ) : displayed.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <CheckCheck className="w-5 h-5 text-[#3A3A3A] mx-auto mb-1.5" />
            <p className="text-[11px] text-[#6B6B73]">
              {tab === "active" ? "All caught up" : "Nothing done yet"}
            </p>
          </div>
        ) : displayed.map(item => {
          const isApproved = item.decision === "approved";
          const isChanges  = item.decision === "changes_requested";
          const isItemDone = isResolved(item);
          const isActing   = acting === item.id;
          const canReopen  = tab === "done" && dismissed.has(item.id) && !isResolved(item);
          const color      = item.brand_primary_color ?? "#39A15F";

          return (
            <div key={item.id} className="flex items-start gap-3 px-4 py-3 border-b border-[#1A1A1A] last:border-0 hover:bg-white/[0.02] transition-colors group">
              <div className={cn(
                "mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                isItemDone ? "bg-emerald-500/15" : isChanges ? "bg-amber-500/15" : "bg-blue-500/15"
              )}>
                {isItemDone
                  ? <Check className="w-3 h-3 text-emerald-400" />
                  : isChanges
                  ? <Clock className="w-3 h-3 text-amber-400" />
                  : <MessageSquare className="w-3 h-3 text-blue-400" />
                }
              </div>

              <button onClick={() => handleNavigate(item)} className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[12px] font-medium text-[#FAFAFA] truncate max-w-[200px]">
                    {item.post_title ?? `Post #${item.post_id}`}
                  </span>
                  {item.brand_name && (
                    <span
                      className="inline-flex items-center text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
                      style={{ color, backgroundColor: `${color}22` }}
                    >
                      {item.brand_name}
                    </span>
                  )}
                </div>

                <div className="mt-0.5 flex items-center gap-1 flex-wrap">
                  {isApproved && <span className="text-[10px] font-semibold text-emerald-400">Approved</span>}
                  {isChanges && !item.amended_at && <span className="text-[10px] font-semibold text-amber-400">Changes requested</span>}
                  {isChanges && item.amended_at  && <span className="text-[10px] font-semibold text-emerald-400">Addressed ✓</span>}
                  {!item.decision && <span className="text-[10px] text-[#6B6B73]">Comment</span>}
                  {item.client_name && <span className="text-[10px] text-[#6B6B73]">· {item.client_name}</span>}
                  <span className="text-[10px] text-[#4A4A52]">· {timeAgo(item.created_at)}</span>
                </div>

                {item.comment?.trim() && (
                  <p className="mt-0.5 text-[11px] text-[#8A8A92] line-clamp-1 italic">
                    "{item.comment}"
                  </p>
                )}
              </button>

              <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                {isChanges && !item.amended_at && !dismissed.has(item.id) && (
                  <button
                    onClick={() => handleAmend(item)}
                    disabled={isActing}
                    title="Mark as addressed"
                    className="w-6 h-6 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    {isActing ? <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" /> : <Check className="w-3 h-3 text-emerald-400" />}
                  </button>
                )}
                {canReopen ? (
                  <button
                    onClick={() => unarchive(item.id)}
                    title="Move back to active"
                    className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-[#6B6B73] hover:text-[#A1A1AA] text-[9px] font-bold"
                  >
                    ↩
                  </button>
                ) : tab === "active" ? (
                  <button
                    onClick={() => dismiss(item.id)}
                    title="Mark done"
                    className="w-6 h-6 rounded-lg bg-white/5 hover:bg-emerald-500/15 flex items-center justify-center transition-colors"
                  >
                    <Check className="w-3 h-3 text-[#6B6B73] group-hover:text-emerald-400" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
