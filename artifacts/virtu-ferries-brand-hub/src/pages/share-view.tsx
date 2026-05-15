import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Loader2, Calendar, Facebook, Instagram, Globe, Circle, ExternalLink, FileText, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import { cn } from "@/lib/utils";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface SharedPost {
  id: number;
  market: string;
  platform: string;
  pillar: string;
  title: string | null;
  format: string;
  caption: string;
  visual_direction: string;
  cta: string | null;
  media_url: string | null;
  link_url: string | null;
  drive_url: string | null;
  cross_post: boolean | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
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

function safeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
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
    const safeMedia = safeUrl(p.media_url);
    const safeDrive = safeUrl(p.drive_url);
    const safeLink = safeUrl(p.link_url);
    if (safeMedia || safeDrive || safeLink) {
      writeLabel(safeMedia && isVideo(safeMedia) ? "Video" : "Visual / links");
      if (safeMedia) {
        const label = isVideo(safeMedia) ? "Watch video" : "View visual";
        writeLine(`${label}: ${safeMedia}`, { size: 10, color: accent, gap: 2, linkUrl: safeMedia });
      }
      if (safeDrive) {
        writeLine(`Drive folder: ${safeDrive}`, { size: 10, color: accent, gap: 2, linkUrl: safeDrive });
      }
      if (safeLink) {
        writeLine(`Linked URL: ${safeLink}`, { size: 10, color: accent, gap: 2, linkUrl: safeLink });
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

export default function ShareView() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [data, setData] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

              {/* Media */}
              {p.media_url && (
                <div className="bg-gray-50 border-b border-gray-50">
                  {isVideo(p.media_url) ? (
                    <video
                      src={p.media_url}
                      controls
                      className="w-full max-h-[480px] object-contain bg-black"
                    />
                  ) : (
                    <img
                      src={p.media_url}
                      alt={p.title || "Post media"}
                      className="w-full max-h-[480px] object-contain"
                    />
                  )}
                </div>
              )}

              {/* Body */}
              <div className="px-5 sm:px-6 py-5 space-y-4">
                {p.caption && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Caption</div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{p.caption}</p>
                  </div>
                )}
                {p.visual_direction && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Visual direction</div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{p.visual_direction}</p>
                  </div>
                )}
                {p.cta && (
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Call to action</div>
                    <p className="text-sm text-gray-800 leading-relaxed">{p.cta}</p>
                  </div>
                )}
                {(p.link_url || p.drive_url) && (
                  <div className="flex items-center gap-3 flex-wrap pt-1">
                    {p.link_url && (
                      <a
                        href={p.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Linked URL
                      </a>
                    )}
                    {p.drive_url && (
                      <a
                        href={p.drive_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Drive folder
                      </a>
                    )}
                  </div>
                )}
              </div>
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
