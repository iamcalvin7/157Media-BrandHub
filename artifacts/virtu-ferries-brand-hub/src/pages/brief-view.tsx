import { useEffect, useState, useCallback } from "react";
import { useParams } from "wouter";
import { Loader2, FileDown, Copy, Check, AlertCircle, Calendar, Target, Users, Lightbulb, MessageSquare, StickyNote } from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface OfferMessage {
  title: string;
  message: string;
  prices: string;
  schedule: string;
}

interface BriefSnapshot {
  brand?: string;
  campaign?: string;
  requestedDate?: string;
  deadline?: string;
  objective?: string;
  briefOverview?: string;
  offerMessages?: OfferMessage[];
  audience?: string;
  creativeDirection?: string;
  visualDirection?: string;
  notes?: string;
}

interface BriefPayload {
  token: string;
  brandSlug: string;
  brandName: string | null;
  briefText: string;
  snapshot: BriefSnapshot | null;
  visualRefs: { name: string; dataUrl: string }[];
  createdAt: string;
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch {
    return iso;
  }
}

function brandColors(slug: string) {
  if (slug === "gozo-highspeed") return { primary: "#f6a610", dark: "#1a1400", light: "#fff9ec" };
  return { primary: "#1e82b4", dark: "#0a2e42", light: "#eef6fb" };
}

function SectionLabel({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: color + "18" }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color }}>{label}</span>
    </div>
  );
}

function Block({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-[#F0F0F0] p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function BodyText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[13.5px] leading-[1.75] text-[#374151] whitespace-pre-wrap">{children}</p>
  );
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
    const colors = brandColors(data.brandSlug);
    const snap = data.snapshot;

    const sectionHtml = (label: string, content: string) =>
      content.trim()
        ? `<div style="margin-bottom:28px;">
            <p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:${colors.primary};margin-bottom:8px;">${label}</p>
            <p style="font-size:11px;line-height:1.75;color:#374151;white-space:pre-wrap;">${content.replace(/</g, "&lt;")}</p>
           </div>`
        : "";

    const offersHtml = snap?.offerMessages?.filter(o => o.message || o.title)
      .map((o, i) => `
        <div style="margin-bottom:24px;padding:16px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">
          <p style="font-size:10px;font-weight:700;color:${colors.primary};margin-bottom:10px;">Offer ${i + 1}${o.title ? ` — ${o.title}` : ""}</p>
          ${o.message ? `<p style="font-size:11px;line-height:1.75;color:#374151;margin-bottom:8px;white-space:pre-wrap;">${o.message.replace(/</g, "&lt;")}</p>` : ""}
          ${o.prices ? `<p style="font-size:9px;font-weight:600;text-transform:uppercase;color:#6b7280;margin-bottom:4px;">Prices</p><p style="font-size:11px;line-height:1.7;color:#374151;white-space:pre-wrap;">${o.prices.replace(/</g, "&lt;")}</p>` : ""}
          ${o.schedule ? `<p style="font-size:9px;font-weight:600;text-transform:uppercase;color:#6b7280;margin-top:8px;margin-bottom:4px;">Schedule</p><p style="font-size:11px;line-height:1.7;color:#374151;white-space:pre-wrap;">${o.schedule.replace(/</g, "&lt;")}</p>` : ""}
        </div>
      `).join("") ?? "";

    const imagesHtml = data.visualRefs.length > 0
      ? `<div style="margin-top:32px;padding-top:24px;border-top:1px solid #e5e7eb;">
          <p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:${colors.primary};margin-bottom:14px;">Visual References</p>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
            ${data.visualRefs.map(r => `<div>
              <img src="${r.dataUrl}" alt="" style="width:100%;height:150px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;display:block;" />
              <p style="font-size:9px;color:#9ca3af;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.name.replace(/</g, "&lt;")}</p>
            </div>`).join("")}
          </div>
        </div>`
      : "";

    const mainContent = snap
      ? `${sectionHtml("Brief overview", snap.briefOverview ?? "")}
         ${sectionHtml("Objective", snap.objective ?? "")}
         ${offersHtml ? `<div style="margin-bottom:8px;"><p style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:${colors.primary};margin-bottom:12px;">Offers</p>${offersHtml}</div>` : ""}
         ${sectionHtml("Target audience", snap.audience ?? "")}
         ${sectionHtml("Creative direction", snap.creativeDirection ?? "")}
         ${sectionHtml("Additional notes", snap.notes ?? "")}`
      : `<pre style="font-family:'Courier New',monospace;font-size:10px;white-space:pre-wrap;">${data.briefText.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</pre>`;

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${(snap?.campaign || data.brandName || "Design Brief").replace(/</g, "&lt;")}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; font-size: 11px; line-height: 1.6; color: #111827; }
    .header { background: ${colors.primary}; color: #fff; padding: 32px 48px; }
    .header-eyebrow { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.16em; opacity: 0.75; margin-bottom: 6px; }
    .header-title { font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
    .header-meta { display: flex; gap: 24px; margin-top: 12px; font-size: 10px; opacity: 0.75; }
    .content { padding: 40px 48px; }
    @media print {
      @page { margin: 15mm 18mm; size: A4; }
      .header { margin: -15mm -18mm 0; padding: 24px 18mm; }
      .content { padding: 28px 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <p class="header-eyebrow">Design Brief</p>
    <p class="header-title">${(snap?.campaign || data.brandName || "Design Brief").replace(/</g, "&lt;")}</p>
    <div class="header-meta">
      <span>${data.brandName || data.brandSlug}</span>
      ${snap?.requestedDate ? `<span>Date: ${fmtDate(snap.requestedDate)}</span>` : ""}
      ${snap?.deadline ? `<span>Deadline: ${fmtDate(snap.deadline)}</span>` : ""}
    </div>
  </div>
  <div class="content">
    ${mainContent}
    ${imagesHtml}
  </div>
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 250);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#A1A1AA]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center px-4">
        <div className="bg-white border border-[#F4F4F5] rounded-2xl p-8 max-w-sm w-full text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-[#EF4444] mx-auto" />
          <p className="text-[14px] font-semibold text-[#18181B]">Brief not found</p>
          <p className="text-[12px] text-[#71717A]">{error || "This link may have expired or been removed."}</p>
        </div>
      </div>
    );
  }

  const colors = brandColors(data.brandSlug);
  const snap = data.snapshot;
  const hasSnapshot = !!snap && (snap.campaign || snap.objective || snap.briefOverview);

  const offers = snap?.offerMessages?.filter(o => o.message?.trim() || o.title?.trim()) ?? [];

  return (
    <div className="min-h-screen bg-[#F3F4F6]">

      {/* ─── Hero header ─────────────────────────────────────────────── */}
      <div style={{ background: `linear-gradient(135deg, ${colors.dark} 0%, ${colors.primary} 100%)` }} className="relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10" style={{ background: "white" }} />
        <div className="absolute -bottom-10 right-32 w-44 h-44 rounded-full opacity-5" style={{ background: "white" }} />

        <div className="relative max-w-4xl mx-auto px-6 md:px-10 py-10 md:py-14">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50 mb-3">
            Design Brief
          </p>
          <h1 className="text-[26px] md:text-[32px] font-bold tracking-[-0.02em] text-white leading-tight mb-1">
            {snap?.campaign || data.brandName || "Design Brief"}
          </h1>
          <p className="text-white/60 text-[13px] mb-6">{data.brandName || data.brandSlug}</p>

          {/* Meta pills */}
          <div className="flex flex-wrap gap-2">
            {snap?.requestedDate && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-white/10 text-white/80 backdrop-blur-sm border border-white/10">
                <Calendar className="w-3 h-3" />
                Brief date: {fmtDate(snap.requestedDate)}
              </span>
            )}
            {snap?.deadline && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-white/15 text-white border border-white/20 backdrop-blur-sm">
                <Calendar className="w-3 h-3" />
                Deadline: {fmtDate(snap.deadline)}
              </span>
            )}
            {!snap?.requestedDate && !snap?.deadline && (
              <span className="text-white/40 text-[11px]">Shared {fmtDate(data.createdAt)}</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── Action bar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-[#E5E7EB]">
        <div className="max-w-4xl mx-auto px-6 md:px-10 py-3 flex items-center justify-between gap-3">
          <span className="text-[11px] text-[#9CA3AF] hidden sm:block">
            Shared {fmtDate(data.createdAt)}
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={downloadAsPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-medium border border-[#E5E7EB] bg-white text-[#52525B] hover:border-[#A1A1AA] hover:text-[#18181B] transition-colors shadow-sm"
            >
              <FileDown className="w-3.5 h-3.5" /> Export PDF
            </button>
            <button
              type="button"
              onClick={copyText}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-all shadow-sm"
              style={{ backgroundColor: copied ? "#22c55e" : colors.primary }}
            >
              {copied
                ? <><Check className="w-3.5 h-3.5" /> Copied!</>
                : <><Copy className="w-3.5 h-3.5" /> Copy text</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ─── Content ─────────────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-5">

        {hasSnapshot ? (
          <>
            {/* Brief overview */}
            {snap?.briefOverview?.trim() && (
              <Block>
                <SectionLabel icon={StickyNote} label="Brief" color={colors.primary} />
                <BodyText>{snap.briefOverview}</BodyText>
              </Block>
            )}

            {/* Objective */}
            {snap?.objective?.trim() && (
              <Block>
                <SectionLabel icon={Target} label="Objective" color={colors.primary} />
                <BodyText>{snap.objective}</BodyText>
              </Block>
            )}

            {/* Offers */}
            {offers.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <MessageSquare className="w-3.5 h-3.5" style={{ color: colors.primary }} />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: colors.primary }}>
                    Offers
                  </span>
                  <span className="ml-auto text-[10px] text-[#9CA3AF]">{offers.length} offer{offers.length !== 1 ? "s" : ""}</span>
                </div>
                {offers.map((offer, i) => (
                  <Block key={i} className="overflow-hidden !p-0">
                    {/* Offer header strip */}
                    <div className="px-6 py-3.5 border-b border-[#F3F4F6] flex items-center gap-3" style={{ backgroundColor: colors.light }}>
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: colors.primary }}
                      >
                        {i + 1}
                      </span>
                      <p className="text-[13px] font-semibold text-[#111827]">
                        {offer.title || `Offer ${i + 1}`}
                      </p>
                    </div>

                    <div className="px-6 py-5 space-y-4">
                      {offer.message?.trim() && (
                        <BodyText>{offer.message}</BodyText>
                      )}

                      {(offer.prices?.trim() || offer.schedule?.trim()) && (
                        <div className="grid sm:grid-cols-2 gap-4 pt-1">
                          {offer.prices?.trim() && (
                            <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#F0F0F0]">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF] mb-2">Prices</p>
                              <p className="text-[12.5px] leading-[1.75] text-[#374151] whitespace-pre-wrap font-mono">{offer.prices}</p>
                            </div>
                          )}
                          {offer.schedule?.trim() && (
                            <div className="bg-[#F9FAFB] rounded-xl p-4 border border-[#F0F0F0]">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#9CA3AF] mb-2">Schedule</p>
                              <p className="text-[12.5px] leading-[1.75] text-[#374151] whitespace-pre-wrap font-mono">{offer.schedule}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Block>
                ))}
              </div>
            )}

            {/* Audience */}
            {snap?.audience?.trim() && (
              <Block>
                <SectionLabel icon={Users} label="Target audience" color={colors.primary} />
                <BodyText>{snap.audience}</BodyText>
              </Block>
            )}

            {/* Creative direction */}
            {snap?.creativeDirection?.trim() && (
              <Block>
                <SectionLabel icon={Lightbulb} label="Creative direction" color={colors.primary} />
                <BodyText>{snap.creativeDirection}</BodyText>
              </Block>
            )}

            {/* Visual direction */}
            {snap?.visualDirection?.trim() && (
              <Block>
                <SectionLabel icon={Lightbulb} label="Visual direction" color={colors.primary} />
                <BodyText>{snap.visualDirection}</BodyText>
              </Block>
            )}

            {/* Additional notes */}
            {snap?.notes?.trim() && (
              <Block>
                <SectionLabel icon={StickyNote} label="Additional notes" color={colors.primary} />
                <BodyText>{snap.notes}</BodyText>
              </Block>
            )}
          </>
        ) : (
          /* Fallback: raw text for old briefs */
          <Block>
            <pre className="text-[11px] leading-relaxed text-[#374151] whitespace-pre-wrap font-mono">
              {data.briefText}
            </pre>
          </Block>
        )}

        {/* Visual references */}
        {data.visualRefs.length > 0 && (
          <Block>
            <SectionLabel icon={Lightbulb} label={`Visual references (${data.visualRefs.length})`} color={colors.primary} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {data.visualRefs.map((ref, i) => (
                <div key={i} className="group relative">
                  <div className="aspect-square rounded-xl overflow-hidden border border-[#F0F0F0] bg-[#F9FAFB] cursor-zoom-in" onClick={() => setLightboxSrc(ref.dataUrl)}>
                    <img
                      src={ref.dataUrl}
                      alt={ref.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-[#9CA3AF] truncate px-0.5">{ref.name}</p>
                </div>
              ))}
            </div>
          </Block>
        )}

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colors.primary }} />
          <p className="text-[11px] text-[#9CA3AF]">
            {data.brandName || data.brandSlug} · Brand Hub
          </p>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxSrc && (
        <div
          onClick={closeLightbox}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 transition-colors text-sm"
          >
            ✕
          </button>
          <img
            src={lightboxSrc}
            alt="Visual reference"
            onClick={e => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
