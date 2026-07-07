import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Bell, Check, Clock, MessageSquare, ChevronRight } from "lucide-react";
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
  brand_id: number | null;
  brand_slug: string | null;
  brand_name: string | null;
  brand_primary_color: string | null;
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

const SEEN_KEY = "feedback_seen_all";
const DISMISSED_KEY = "feedback_dismissed_all";

function loadSeen(): Set<number> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function saveSeen(ids: Set<number>) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
  } catch {}
}

function loadDismissed(): Set<number> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<number>) {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {}
}

export function FeedbackBell({ compact = false }: { compact?: boolean }) {
  const [, navigate] = useLocation();
  const { activeBrand, setActiveBrandSlug } = useBrand();
  const brandSlug = activeBrand?.slug;

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [seen, setSeen] = useState<Set<number>>(() => loadSeen());
  const [dismissed, setDismissed] = useState<Set<number>>(() => loadDismissed());
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/content/feedback`);
      if (!res.ok) return;
      const data: FeedbackItem[] = await res.json();
      setItems(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchFeedback();
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchFeedback();
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(fetchFeedback, 60_000);
    // Keep in sync when NotificationsCentre amends or archives items
    const onDismissedChanged = () => setDismissed(loadDismissed());
    const onAmended = () => fetchFeedback();
    window.addEventListener("hub:feedback-dismissed-changed", onDismissedChanged);
    window.addEventListener("hub:feedback-amended", onAmended);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
      window.removeEventListener("hub:feedback-dismissed-changed", onDismissedChanged);
      window.removeEventListener("hub:feedback-amended", onAmended);
    };
  }, [fetchFeedback]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const visibleItems = items.filter((i) => !dismissed.has(i.id));
  const unreadCount = visibleItems.filter((i) => !seen.has(i.id)).length;

  function handleOpen() {
    const nowOpen = !open;
    if (nowOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelWidth = 340;
      const left = Math.min(rect.left, window.innerWidth - panelWidth - 8);
      setPanelPos({ top: rect.bottom + 8, left: Math.max(8, left) });
    }
    setOpen(nowOpen);
    if (nowOpen && unreadCount > 0) {
      const allIds = new Set([...seen, ...visibleItems.map((i) => i.id)]);
      setSeen(allIds);
      saveSeen(allIds);
    }
  }

  function handleItemClick(item: FeedbackItem) {
    setOpen(false);
    // Dismiss this item so it disappears from the list
    const next = new Set([...dismissed, item.id]);
    setDismissed(next);
    saveDismissed(next);
    if (item.brand_slug && item.brand_slug !== brandSlug) {
      setActiveBrandSlug(item.brand_slug);
    }
    const path = `/content-calendar${item.post_id ? `?post=${item.post_id}` : ""}`;
    navigate(path);
    if (item.post_id) {
      window.dispatchEvent(
        new CustomEvent("hub:open-post", { detail: { postId: item.post_id } }),
      );
    }
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        title="Client feedback"
        className={cn(
          "relative flex items-center justify-center rounded-lg transition-colors",
          compact
            ? "w-9 h-9 hover:bg-white/10 text-[#A1A1AA] hover:text-[#FAFAFA]"
            : "w-7 h-7 hover:bg-white/10 text-[#6B6B73] hover:text-[#FAFAFA]"
        )}
      >
        <Bell className={compact ? "w-5 h-5" : "w-4 h-4"} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none shadow">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && panelPos && createPortal(
        <div
          ref={panelRef}
          className="fixed bg-[#141414] border border-[#252525] rounded-xl shadow-2xl z-[9999] overflow-hidden"
          style={{ top: panelPos.top, left: panelPos.left, width: 340 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E1E]">
            <span className="text-[12px] font-semibold text-[#FAFAFA] uppercase tracking-[0.18em]">
              Client Feedback
            </span>
            {visibleItems.length > 0 && (
              <span className="text-[10px] text-[#6B6B73]">{visibleItems.length} total</span>
            )}
          </div>

          <div className="overflow-y-auto max-h-[360px]">
            {visibleItems.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="w-7 h-7 text-[#3A3A3A] mx-auto mb-2" />
                <p className="text-[12px] text-[#6B6B73]">No client feedback yet</p>
              </div>
            ) : (
              visibleItems.map((item) => {
                const isApproved = item.decision === "approved";
                const isChanges = item.decision === "changes_requested";
                const isUnread = !seen.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-[#1A1A1A] last:border-0 text-left group"
                  >
                    <div className={cn(
                      "mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                      isApproved ? "bg-emerald-500/15" : isChanges ? "bg-amber-500/15" : "bg-blue-500/15"
                    )}>
                      {isApproved
                        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                        : isChanges
                        ? <Clock className="w-3.5 h-3.5 text-amber-400" />
                        : <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn(
                          "text-[12px] font-medium truncate leading-snug",
                          isUnread ? "text-[#FAFAFA]" : "text-[#A1A1AA]"
                        )}>
                          {item.post_title ?? `Post #${item.post_id}`}
                        </span>
                        <span className="text-[10px] text-[#6B6B73] shrink-0 mt-0.5">
                          {timeAgo(item.created_at)}
                        </span>
                      </div>

                      <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {isApproved && (
                          <span className="inline-flex items-center text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Approved</span>
                        )}
                        {isChanges && (
                          <span className="inline-flex items-center text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Changes requested</span>
                        )}
                        {item.client_name && (
                          <span className="text-[10px] text-[#6B6B73]">· {item.client_name}</span>
                        )}
                        {item.brand_name && (
                          <span
                            className="inline-flex items-center text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                            style={{
                              color: item.brand_primary_color ?? "#39A15F",
                              backgroundColor: `${item.brand_primary_color ?? "#39A15F"}22`,
                            }}
                          >
                            {item.brand_name}
                          </span>
                        )}
                      </div>

                      {item.comment?.trim() && (
                        <p className="mt-1 text-[11px] text-[#8A8A92] leading-relaxed line-clamp-2">
                          {item.comment}
                        </p>
                      )}
                    </div>

                    <ChevronRight className="w-3.5 h-3.5 text-[#3A3A3A] group-hover:text-[#6B6B73] shrink-0 mt-1 transition-colors" />
                  </button>
                );
              })
            )}
          </div>

          {items.length > 0 && (
            <div className="px-4 py-2.5 border-t border-[#1E1E1E]">
              <button
                onClick={() => { setOpen(false); navigate("/content-calendar"); }}
                className="text-[11px] text-[#39A15F] hover:text-[#4DC76E] font-medium transition-colors"
              >
                Open Content Calendar →
              </button>
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}
