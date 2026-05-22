import { useEffect, useState, useCallback } from "react";
import { useParams } from "wouter";
import { Loader2, FileDown, Copy, Check, AlertCircle } from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface BriefPayload {
  token: string;
  brandSlug: string;
  brandName: string | null;
  briefText: string;
  visualRefs: { name: string; dataUrl: string }[];
  createdAt: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return iso;
  }
}

function brandColors(slug: string): { primary: string; accent: string } {
  if (slug === "gozo-highspeed") return { primary: "#f6a610", accent: "#18181b" };
  return { primary: "#1e82b4", accent: "#f6a610" };
}

export default function BriefView() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [data, setData] = useState<BriefPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const closeLightbox = useCallback(() => setLightboxSrc(null), []);
  useEffect(() => {
    if (!lightboxSrc) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") closeLightbox(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxSrc, closeLightbox]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API}/api/design-briefs/share/${encodeURIComponent(token)}`)
      .then(async r => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error || `Error ${r.status}`);
        }
        return r.json() as Promise<BriefPayload>;
      })
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : "Failed to load brief"))
      .finally(() => setLoading(false));
  }, [token]);

  async function copyText() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.briefText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  function downloadAsPdf() {
    if (!data) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const escaped = data.briefText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const colors = brandColors(data.brandSlug);
    const imagesHtml = data.visualRefs.length > 0
      ? `<div style="margin-top:36px;padding-top:24px;border-top:2px solid #e4e4e7;">
          <p style="font-family:'Courier New',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:#a1a1aa;margin-bottom:14px;">Visual References</p>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
            ${data.visualRefs.map(r => `<div>
              <img src="${r.dataUrl}" alt="" style="width:100%;height:150px;object-fit:cover;border-radius:6px;border:1px solid #e4e4e7;display:block;" />
              <p style="font-family:'Courier New',monospace;font-size:9px;color:#71717a;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.name.replace(/</g, "&lt;")}</p>
            </div>`).join("")}
          </div>
        </div>`
      : "";

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${(data.brandName || "Design Brief").replace(/</g, "&lt;")}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Courier New", Courier, monospace;
      font-size: 10.5px;
      line-height: 1.7;
      color: #18181b;
      padding: 48px 56px;
    }
    pre { white-space: pre-wrap; word-break: break-word; }
    .header { background: ${colors.primary}; color: #fff; padding: 20px 32px; margin: -48px -56px 36px; }
    .header h1 { font-size: 16px; font-weight: 700; letter-spacing: 0.04em; }
    .header p { font-size: 10px; opacity: 0.8; margin-top: 4px; }
    @media print {
      @page { margin: 20mm 22mm; size: A4; }
      body { padding: 0; }
      .header { margin: 0 0 36px; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${(data.brandName || "Design Brief").replace(/</g, "&lt;")}</h1>
    <p>Shared ${formatDate(data.createdAt)}</p>
  </div>
  <pre>${escaped}</pre>${imagesHtml}
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 250);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#A1A1AA]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4">
        <div className="bg-white border border-[#F4F4F5] rounded-2xl p-8 max-w-sm w-full text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-[#EF4444] mx-auto" />
          <p className="text-[14px] font-semibold text-[#18181B]">Brief not found</p>
          <p className="text-[12px] text-[#71717A]">{error || "This link may have expired or been removed."}</p>
        </div>
      </div>
    );
  }

  const colors = brandColors(data.brandSlug);

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      {/* Brand header */}
      <div style={{ backgroundColor: colors.primary }} className="px-6 py-5">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-white/70 text-[10px] uppercase tracking-[0.18em] font-medium">Design Brief</p>
            <p className="text-white font-bold text-[16px] mt-0.5">{data.brandName || data.brandSlug}</p>
          </div>
          <p className="text-white/60 text-[11px] shrink-0">Shared {formatDate(data.createdAt)}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Action bar */}
        <div className="flex items-center gap-2 justify-end">
          <button
            type="button"
            onClick={downloadAsPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-[#E4E4E7] bg-white text-[#52525B] hover:border-[#A1A1AA] hover:text-[#27272A] transition-colors"
          >
            <FileDown className="w-3 h-3" /> PDF
          </button>
          <button
            type="button"
            onClick={copyText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white transition-colors"
            style={{ backgroundColor: copied ? "#22c55e" : colors.primary }}
          >
            {copied ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy brief</>}
          </button>
        </div>

        {/* Brief text */}
        <div className="bg-white border border-[#F4F4F5] rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-[#F4F4F5] bg-[#FAFAFA]">
            <p className="text-[11px] font-medium text-[#27272A]">Brief content</p>
          </div>
          <div className="px-6 py-5">
            <pre className="text-[10.5px] leading-relaxed text-[#3F3F46] whitespace-pre-wrap font-mono">
              {data.briefText}
            </pre>

            {data.visualRefs.length > 0 && (
              <div className="mt-6 pt-6 border-t border-[#F4F4F5]">
                <p className="text-[9.5px] uppercase tracking-[0.16em] text-[#A1A1AA] font-medium mb-3">
                  Visual References ({data.visualRefs.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {data.visualRefs.map((ref, i) => (
                    <div key={i} className="space-y-1">
                      <img
                        src={ref.dataUrl}
                        alt={ref.name}
                        onClick={() => setLightboxSrc(ref.dataUrl)}
                        className="w-full aspect-square object-cover rounded-lg border border-[#F4F4F5] cursor-zoom-in"
                      />
                      <p className="text-[9px] text-[#A1A1AA] truncate">{ref.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-[10px] text-[#A1A1AA]">
          {data.brandName || data.brandSlug} · Brand Hub
        </p>
      </div>

      {lightboxSrc && (
        <div
          onClick={closeLightbox}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            ✕
          </button>
          <img
            src={lightboxSrc}
            alt="Visual reference"
            onClick={e => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
