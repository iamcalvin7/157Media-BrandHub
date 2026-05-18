import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { Loader2, Calendar, Facebook, Instagram, Globe, Circle, ExternalLink, FileText, Download, Check, MessageSquare, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { jsPDF } from "jspdf";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ClientFeedback {
  id: number;
  decision: string | null;
  comment: string | null;
  client_name: string | null;
  created_at: string;
}

interface SharedPost {
  id: number;
  market: string;
  platform: string;
  pillar: string;
  title: string | null;
  format: string;
  caption: string;
  visual_direction?: string;
  cta: string | null;
  media_url: string | null;
  media_urls: string[];
  link_url: string | null;
  drive_url: string | null;
  posted_url: string | null;
  posted_url_ig: string | null;
  cross_post: boolean | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  feedback: ClientFeedback[];
}

interface SharePayload {
  token: string;
  title: string | null;
  created_at: string;
  brand: {
    id: number;
    slug: string;
    name: string;
    shortName: string | null;
    tagline: string | null;
    primaryColor: string;
    accentColor: string;
  } | null;
  posts: SharedPost[];
}

function formatDate(d: string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function platformIcons(platform: string, format: string) {
  const lc = (platform ?? "").toLowerCase();
  const fmtLc = (format ?? "").toLowerCase();
  const out: Array<{ Icon: typeof Facebook; color: string; key: string; label: string }> = [];
  if (lc === "both" || lc.includes("facebook")) out.push({ Icon: Facebook, color: "text-[#1877F2]", key: "fb", label: "Facebook" });
  if (lc === "both" || lc.includes("instagram")) out.push({ Icon: Instagram, color: "text-[#E1306C]", key: "ig", label: "Instagram" });
  if (lc.includes("story") || fmtLc.includes("story")) out.push({ Icon: Circle, color: "text-[#A855F7]", key: "story", label: "Story" });
  if (out.length === 0) out.push({ Icon: Globe, color: "text-gray-400", key: "globe", label: platform || "Platform" });
  return out;
}

function isVideo(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

function isImage(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?|$)/i.test(url);
}

// Decide whether a URL is directly embeddable (img/video). External social
// share URLs (facebook.com/share/r/..., instagram.com/p/...) are NOT
// embeddable — they'll be rendered as a link chip instead.
function isEmbeddableMedia(url: string): boolean {
  return isImage(url) || isVideo(url);
}

// Pretty domain label for link chips: "facebook.com", "drive.google.com" etc.
function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Object-storage paths (`/objects/...`) are served by the API server at
  // `/api/storage/objects/...` — rewrite them so the browser hits a real
  // route. Mirrors `resolveSrc` in MediaLibrary / content-calendar.
  if (trimmed.startsWith("/objects/")) return `/api/storage${trimmed}`;
  // Other same-origin relative paths pass through as-is. Reject protocol-
  // relative `//host` URLs for safety.
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const u = new URL(trimmed);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
    return null;
  } catch {
    return null;
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return [30, 130, 180];
  return [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)];
}

function downloadAsPdf(data: SharePayload): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const contentWidth = pageWidth - marginX * 2;
  const accent = hexToRgb(data.brand?.primaryColor || "#1e82b4");

  let y = 0;

  // Branded header band
  doc.setFillColor(accent[0], accent[1], accent[2]);
  doc.rect(0, 0, pageWidth, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text((data.brand?.name || "Brand").toUpperCase(), marginX, 38);
  doc.setFontSize(20);
  doc.text(data.title || "Content for review", marginX, 64, { maxWidth: contentWidth });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const subtitle = `${data.posts.length} ${data.posts.length === 1 ? "post" : "posts"} · Shared ${formatDate(data.created_at)}`;
  doc.text(subtitle, marginX, 82);

  y = 120;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - 48) {
      doc.addPage();
      y = 56;
    }
  };

  const writeLine = (text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number; maxWidth?: number; linkUrl?: string } = {}) => {
    const size = opts.size ?? 10;
    const bold = opts.bold ?? false;
    const color = opts.color ?? [40, 40, 40];
    const gap = opts.gap ?? 4;
    const maxWidth = opts.maxWidth ?? contentWidth;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    const lineHeight = size * 1.35;
    // Per-line page-break check so long captions/URLs don't get clipped.
    for (const line of lines) {
      ensureSpace(lineHeight);
      if (opts.linkUrl) {
        doc.textWithLink(line, marginX, y, { url: opts.linkUrl });
      } else {
        doc.text(line, marginX, y);
      }
      y += lineHeight;
    }
    y += gap;
  };

  const writeLabel = (label: string) => {
    writeLine(label.toUpperCase(), { size: 7.5, bold: true, color: [140, 140, 140], gap: 2 });
  };

  data.posts.forEach((p, idx) => {
    ensureSpace(70);

    // Card background
    const cardTop = y - 16;
    const cardLeft = marginX - 12;
    const cardWidth = contentWidth + 24;

    // Title
    if (p.title) {
      writeLine(p.title, { size: 13, bold: true, color: [20, 20, 20], gap: 6 });
    } else {
      writeLine(`Post ${idx + 1}`, { size: 13, bold: true, color: [20, 20, 20], gap: 6 });
    }

    // Day + time + platform inline
    const meta: string[] = [];
    if (p.scheduled_date) meta.push(formatDate(p.scheduled_date));
    if (p.scheduled_time) meta.push(p.scheduled_time);
    if (p.platform) meta.push(p.platform);
    if (p.format) meta.push(p.format);
    if (meta.length > 0) {
      writeLine(meta.join("  ·  "), { size: 9, color: accent, bold: true, gap: 10 });
    }

    // Caption (copy)
    if (p.caption) {
      writeLabel("Copy");
      writeLine(p.caption, { size: 10, color: [30, 30, 30], gap: 10 });
    }

    // CTA
    if (p.cta) {
      writeLabel("Call to action");
      writeLine(p.cta, { size: 10, color: [30, 30, 30], gap: 10 });
    }

    // Visual / video link — sanitize every URL to http(s) only before
    // embedding as a clickable PDF action (defense against javascript: etc).
    const safeMediaList = (p.media_urls && p.media_urls.length > 0
      ? p.media_urls
      : (p.media_url ? [p.media_url] : [])
    )
      .map(safeUrl)
      .filter((u): u is string => !!u);
    const safeDrive = safeUrl(p.drive_url);
    const safeLink = safeUrl(p.link_url);
    const safePosted = safeUrl(p.posted_url);
    const safePostedIg = safeUrl(p.posted_url_ig);
    if (safeMediaList.length > 0 || safeDrive || safeLink || safePosted || safePostedIg) {
      const firstIsVideo = safeMediaList.length > 0 && isVideo(safeMediaList[0]!);
      writeLabel(firstIsVideo && safeMediaList.length === 1 ? "Video" : "Visual / links");
      safeMediaList.forEach((u, i) => {
        const label = isVideo(u)
          ? safeMediaList.length > 1 ? `Watch video ${i + 1}` : "Watch video"
          : safeMediaList.length > 1 ? `View visual ${i + 1}` : "View visual";
        writeLine(`${label}: ${u}`, { size: 10, color: accent, gap: 2, linkUrl: u });
      });
      if (safeDrive) {
        writeLine(`Drive folder: ${safeDrive}`, { size: 10, color: accent, gap: 2, linkUrl: safeDrive });
      }
      if (safeLink) {
        writeLine(`Linked URL: ${safeLink}`, { size: 10, color: accent, gap: 2, linkUrl: safeLink });
      }
      if (safePosted) {
        writeLine(`Live post: ${safePosted}`, { size: 10, color: accent, gap: 2, linkUrl: safePosted });
      }
      if (safePostedIg) {
        writeLine(`Instagram post: ${safePostedIg}`, { size: 10, color: accent, gap: 2, linkUrl: safePostedIg });
      }
      y += 6;
    }

    // Divider between posts
    if (idx < data.posts.length - 1) {
      ensureSpace(20);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(marginX, y, marginX + contentWidth, y);
      y += 20;
    }

    // unused but keeps signature obvious
    void cardTop;
    void cardLeft;
    void cardWidth;
  });

  // Footer on every page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    const footer = `${data.brand?.name || "Brand"} · ${data.title || "Content for review"} · Page ${i} of ${pageCount}`;
    doc.text(footer, pageWidth / 2, pageHeight - 24, { align: "center" });
  }

  const safeTitle = (data.title || "content-plan").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "content-plan";
  doc.save(`${safeTitle}.pdf`);
}

function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

interface FeedbackPanelProps {
  post: SharedPost;
  token: string;
  accent: string;
  defaultName: string;
  onNameChange: (name: string) => void;
  onSubmitted: (entry: ClientFeedback) => void;
}

function FeedbackPanel({ post, token, accent, defaultName, onNameChange, onSubmitted }: FeedbackPanelProps) {
  const feedbackList: ClientFeedback[] = post.feedback ?? [];
  const [decision, setDecision] = useState<"approved" | "changes_requested" | null>(null);
  const [comment, setComment] = useState("");
  const [name, setName] = useState(defaultName);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep input synced with the latest stored default whenever it changes
  // (e.g. another panel just saved a name).
  useEffect(() => {
    if (!name && defaultName) setName(defaultName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultName]);

  const canSubmit = (decision !== null || comment.trim().length > 0) && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch(`${API}/api/shares/${encodeURIComponent(token)}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          decision,
          comment: comment.trim() || null,
          clientName: name.trim() || null,
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.error || `Failed to submit (${r.status})`);
      }
      const entry: ClientFeedback = await r.json();
      onSubmitted(entry);
      if (name.trim()) onNameChange(name.trim());
      setDecision(null);
      setComment("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border-t border-gray-100 bg-gray-50/60 px-5 sm:px-6 py-5 space-y-4">
      {feedbackList.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Feedback timeline</div>
          <div className="space-y-2">
            {feedbackList.map((f) => {
              const isApproved = f.decision === "approved";
              const isChanges = f.decision === "changes_requested";
              return (
                <div
                  key={f.id}
                  className={cn(
                    "rounded-xl px-3 py-2.5 border text-sm",
                    isApproved && "bg-emerald-50 border-emerald-100",
                    isChanges && "bg-amber-50 border-amber-100",
                    !isApproved && !isChanges && "bg-white border-gray-100",
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {isApproved && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <Check className="w-3 h-3" /> Approved
                      </span>
                    )}
                    {isChanges && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700">
                        <AlertCircle className="w-3 h-3" /> Changes requested
                      </span>
                    )}
                    {!isApproved && !isChanges && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500">
                        <MessageSquare className="w-3 h-3" /> Comment
                      </span>
                    )}
                    <span className="text-[11px] text-gray-500">
                      {f.client_name || "Anonymous"} · {relativeTime(f.created_at)}
                    </span>
                  </div>
                  {f.comment && (
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{f.comment}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div className="space-y-2.5">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Leave feedback</div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setDecision(decision === "approved" ? null : "approved")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
              decision === "approved"
                ? "bg-emerald-500 text-white border-emerald-500"
                : "bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50",
            )}
            data-testid={`button-approve-${post.id}`}
          >
            <Check className="w-3.5 h-3.5" /> Approve
          </button>
          <button
            type="button"
            onClick={() => setDecision(decision === "changes_requested" ? null : "changes_requested")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
              decision === "changes_requested"
                ? "bg-amber-500 text-white border-amber-500"
                : "bg-white text-gray-700 border-gray-200 hover:border-amber-300 hover:bg-amber-50",
            )}
            data-testid={`button-changes-${post.id}`}
          >
            <AlertCircle className="w-3.5 h-3.5" /> Request changes
          </button>
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 2000))}
          placeholder="Comment (optional)"
          rows={3}
          className="w-full text-sm rounded-xl border border-gray-200 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent resize-y"
          style={{ ['--tw-ring-color' as string]: `${accent}55` }}
          data-testid={`input-comment-${post.id}`}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 100))}
            placeholder="Your name (optional)"
            className="flex-1 min-w-[180px] text-sm rounded-xl border border-gray-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent"
            style={{ ['--tw-ring-color' as string]: `${accent}55` }}
            data-testid={`input-name-${post.id}`}
          />
          <button
            type="button"
            disabled={!canSubmit}
            onClick={submit}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: accent }}
            data-testid={`button-submit-feedback-${post.id}`}
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Send feedback"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}

const NAME_STORAGE_KEY = "vfh.shareClientName";

interface MediaCarouselProps {
  items: Array<{ url: string; key: string }>;
  title: string | null;
}

function MediaCarousel({ items, title }: MediaCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const total = items.length;

  // Update active index as the user scrolls/swipes so the dots and counter
  // stay in sync with what they're actually looking at.
  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    if (idx !== activeIdx) setActiveIdx(Math.max(0, Math.min(total - 1, idx)));
  }

  function scrollToIdx(idx: number) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: "smooth" });
  }

  const goPrev = () => scrollToIdx(Math.max(0, activeIdx - 1));
  const goNext = () => scrollToIdx(Math.min(total - 1, activeIdx + 1));

  return (
    <div className="bg-gray-50 border-b border-gray-50">
      {/* Hint banner — disappears after the user has actually scrolled past
          the first slide so it doesn't keep nagging once they get it. */}
      {activeIdx === 0 && (
        <div className="px-3 py-1.5 bg-gray-900/90 text-white text-[11px] font-semibold tracking-wide flex items-center justify-center gap-1.5">
          <ChevronLeft className="w-3.5 h-3.5" />
          Swipe to see all {total} photos
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      )}

      <div className="relative group">
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-thin"
          style={{ scrollbarWidth: "thin" }}
        >
          {items.map(({ url, key }, idx) => (
            <div
              key={key}
              className="relative shrink-0 w-full snap-center flex items-center justify-center bg-black"
              style={{ height: 480 }}
            >
              {isVideo(url) ? (
                <video src={url} controls className="max-h-[480px] max-w-full object-contain" />
              ) : (
                <img
                  src={url}
                  alt={title ? `${title} (${idx + 1}/${total})` : `Post media ${idx + 1}`}
                  className="max-h-[480px] max-w-full object-contain"
                  loading="lazy"
                />
              )}
              <span className="absolute top-3 right-3 text-[11px] font-bold text-white bg-black/65 px-2.5 py-1 rounded-full backdrop-blur-sm">
                {idx + 1} / {total}
              </span>
            </div>
          ))}
        </div>

        {/* Floating prev/next chevrons (hidden at the boundaries) */}
        {activeIdx > 0 && (
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous photo"
            className="hidden sm:flex absolute top-1/2 left-3 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/95 text-gray-900 shadow-lg hover:bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {activeIdx < total - 1 && (
          <button
            type="button"
            onClick={goNext}
            aria-label="Next photo"
            className="hidden sm:flex absolute top-1/2 right-3 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/95 text-gray-900 shadow-lg hover:bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Dot pagination — clickable, large enough to tap on mobile */}
      <div className="flex items-center justify-center gap-1.5 py-3 bg-white">
        {items.map((_, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => scrollToIdx(idx)}
            aria-label={`Go to photo ${idx + 1}`}
            className={cn(
              "h-2 rounded-full transition-all",
              idx === activeIdx ? "w-6 bg-gray-900" : "w-2 bg-gray-300 hover:bg-gray-500",
            )}
          />
        ))}
      </div>
    </div>
  );
}

export default function ShareView() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(NAME_STORAGE_KEY) || "";
  });
  const persistName = (name: string) => {
    setClientName(name);
    try { window.localStorage.setItem(NAME_STORAGE_KEY, name); } catch { /* ignore */ }
  };
  const appendFeedback = (postId: number, entry: ClientFeedback) => {
    setData((prev) => prev ? {
      ...prev,
      posts: prev.posts.map((p) => p.id === postId
        ? { ...p, feedback: [...(p.feedback ?? []), entry] }
        : p),
    } : prev);
  };
  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API}/api/shares/${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body?.error || `Failed to load (${r.status})`);
        }
        return r.json();
      })
      .then((d: SharePayload) => {
        setData(d);
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-5 h-5 text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900 mb-1.5">This link is no longer available</h1>
          <p className="text-sm text-gray-500">{error || "The shared collection could not be found."}</p>
        </div>
      </div>
    );
  }

  const accent = data.brand?.primaryColor || "#1e82b4";
  const accentSoft = `${accent}15`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Branded header */}
      <div
        className="border-b border-gray-100"
        style={{ background: `linear-gradient(180deg, ${accentSoft} 0%, transparent 100%)` }}
      >
        <div className="max-w-4xl mx-auto px-6 py-10">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm"
              style={{ backgroundColor: accent }}
            >
              {(data.brand?.shortName || data.brand?.name || "?").slice(0, 2).toUpperCase()}
            </div>
            <div className="text-sm font-semibold text-gray-900">{data.brand?.name || "Brand"}</div>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {data.title || "Content for review"}
              </h1>
              <p className="text-sm text-gray-500 mt-2">
                {data.posts.length} {data.posts.length === 1 ? "post" : "posts"} · Shared {formatDate(data.created_at)}
              </p>
            </div>
            {data.posts.length > 0 && (
              <button
                type="button"
                onClick={() => downloadAsPdf(data)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity shrink-0"
                style={{ backgroundColor: accent }}
                data-testid="button-download-pdf"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">
        {data.posts.length === 0 && (
          <div className="text-center py-16 text-sm text-gray-400">No posts in this collection.</div>
        )}
        {data.posts.map((p) => {
          const icons = platformIcons(p.platform, p.format);
          return (
            <article key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Post header */}
              <header className="px-5 sm:px-6 pt-5 pb-3 border-b border-gray-50 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    {icons.map(({ Icon: PI, color, key, label }) => (
                      <div key={key} className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                        <PI className={cn("w-3.5 h-3.5", color)} />
                        <span>{label}</span>
                      </div>
                    ))}
                    {p.format && (
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide ml-1">
                        · {p.format}
                      </span>
                    )}
                  </div>
                  {p.title && <h2 className="text-base font-semibold text-gray-900 leading-snug">{p.title}</h2>}
                </div>
                {p.scheduled_date && (
                  <div className="shrink-0 text-right">
                    <div className="flex items-center gap-1 text-xs font-semibold text-gray-700 justify-end">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      {formatDate(p.scheduled_date)}
                    </div>
                    {p.scheduled_time && (
                      <div className="text-[11px] text-gray-400 mt-0.5">{p.scheduled_time}</div>
                    )}
                  </div>
                )}
              </header>

              {/* Media — render every uploaded photo/video on the post,
                  plus a Drive direct-asset URL if applicable. Multi-photo
                  posts stack vertically. External social share links and
                  Drive folder URLs flow into the link chips below. */}
              {(() => {
                const candidates: Array<{ url: string; key: string }> = [];
                const seen = new Set<string>();
                const push = (raw: string | null, key: string) => {
                  const u = safeUrl(raw);
                  if (!u || !isEmbeddableMedia(u) || seen.has(u)) return;
                  seen.add(u);
                  candidates.push({ url: u, key });
                };
                const all = p.media_urls && p.media_urls.length > 0
                  ? p.media_urls
                  : (p.media_url ? [p.media_url] : []);
                all.forEach((u, i) => push(u, `media-${i}`));
                push(p.drive_url, "drive");
                if (candidates.length === 0) return null;
                // Single item → fill the card width. Multiple items → horizontal
                // swipe carousel (Instagram-style) so reviewers can flick through
                // the attached photos/videos without scrolling past the post.
                if (candidates.length === 1) {
                  const { url, key } = candidates[0]!;
                  return (
                    <div className="bg-gray-50 border-b border-gray-50">
                      <div key={key}>
                        {isVideo(url) ? (
                          <video src={url} controls className="w-full max-h-[480px] object-contain bg-black" />
                        ) : (
                          <img src={url} alt={p.title || "Post media"} className="w-full max-h-[480px] object-contain" loading="lazy" />
                        )}
                      </div>
                    </div>
                  );
                }
                return <MediaCarousel items={candidates} title={p.title} />;
              })()}

              {/* Body */}
              <div className="px-5 sm:px-6 py-5 space-y-4">
                {p.caption && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Caption</div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{p.caption}</p>
                  </div>
                )}
                {p.cta && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Call to action</div>
                    <p className="text-sm text-gray-800 leading-relaxed">{p.cta}</p>
                  </div>
                )}
                {(() => {
                  // Build the list of link chips. Each chip is shown only if
                  // its URL is a safe http(s) URL AND not already embedded
                  // as media above (so a direct .jpg in media_url doesn't
                  // also show up as a "Linked URL" chip).
                  const embedded = new Set<string>();
                  const allMedia = p.media_urls && p.media_urls.length > 0
                    ? p.media_urls
                    : (p.media_url ? [p.media_url] : []);
                  [...allMedia, p.drive_url].forEach(raw => {
                    const u = safeUrl(raw);
                    if (u && isEmbeddableMedia(u)) embedded.add(u);
                  });
                  type Chip = { url: string; label: string; key: string };
                  const chips: Chip[] = [];
                  const add = (raw: string | null, label: string, key: string) => {
                    const u = safeUrl(raw);
                    if (!u || embedded.has(u)) return;
                    chips.push({ url: u, label, key });
                  };
                  add(p.link_url, "Linked URL", "link");
                  add(p.drive_url, "Drive folder", "drive");
                  add(p.posted_url, "View live post", "posted");
                  add(p.posted_url_ig, "View on Instagram", "posted_ig");
                  if (chips.length === 0) return null;
                  return (
                    <div className="flex items-center gap-2 flex-wrap pt-1">
                      {chips.map(({ url, label, key }) => (
                        <a
                          key={key}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={url}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors max-w-full"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{label}</span>
                          <span className="text-[10px] font-normal text-gray-400 truncate">· {domainOf(url)}</span>
                        </a>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <FeedbackPanel
                post={p}
                token={data.token}
                accent={accent}
                defaultName={clientName}
                onNameChange={persistName}
                onSubmitted={(entry) => appendFeedback(p.id, entry)}
              />
            </article>
          );
        })}
      </div>

      <footer className="max-w-4xl mx-auto px-6 pb-12 pt-4 text-center text-[11px] text-gray-400">
        Shared from the {data.brand?.name || "Brand"} content calendar.
      </footer>
    </div>
  );
}
