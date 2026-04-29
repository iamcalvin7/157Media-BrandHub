import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { Loader2, Calendar, Facebook, Instagram, Globe, Circle, ExternalLink, FileText } from "lucide-react";
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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
            {data.title || "Content for review"}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {data.posts.length} {data.posts.length === 1 ? "post" : "posts"} · Shared {formatDate(data.created_at)}
          </p>
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
