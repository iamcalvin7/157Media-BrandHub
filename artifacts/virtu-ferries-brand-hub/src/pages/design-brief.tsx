import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ClipboardCopy, Check, PenLine, Sparkles, BookmarkPlus, Bookmark, X as XIcon, FileDown, ImagePlus, Link2, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandContent } from "@/lib/brand-content";
import { useBrand } from "@/lib/brand";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────

type FormatKey = string; // "pubId::formatName"

type FormSnapshot = {
  brand: string;
  campaign: string;
  objective: string;
  briefOverview: string;
  offerMessages: { title: string; message: string; prices: string; schedule: string }[];
  audience: string;
  selectedFormats: string[];
  creativeDirection: string;
  visualDirection: string;
  notes: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.18em] text-[#A1A1AA] font-medium mb-1.5">
      {children}
    </p>
  );
}

function Input({
  value, onChange, placeholder, className,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "w-full text-[12px] text-[#27272A] bg-[#FFFFFF] border border-[#E4E4E7] rounded-lg px-3 py-2 focus:border-[var(--brand-primary)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]/20 placeholder:text-[#A1A1AA] transition-colors",
        className,
      )}
    />
  );
}

function Textarea({
  value, onChange, placeholder, rows = 3,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full text-[12px] text-[#27272A] bg-[#FFFFFF] border border-[#E4E4E7] rounded-lg px-3 py-2.5 focus:border-[var(--brand-primary)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]/20 placeholder:text-[#A1A1AA] transition-colors resize-y leading-relaxed"
    />
  );
}

function AutoTextarea({
  value, onChange, placeholder, minRows = 3,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; minRows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={minRows}
      className="w-full text-[12px] text-[#27272A] bg-[#FFFFFF] border border-[#E4E4E7] rounded-lg px-3 py-2.5 focus:border-[var(--brand-primary)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]/20 placeholder:text-[#A1A1AA] transition-colors resize-none leading-relaxed overflow-hidden"
    />
  );
}

// ─── Brief generator ──────────────────────────────────────────────────────────

function generateBrief({
  brand, campaign, requestedDate, deadline, objective, briefOverview, offerMessages,
  audience, selectedFormats, publications, creativeDirection, visualDirection, notes,
}: {
  brand: string; campaign: string; requestedDate: string; deadline: string;
  objective: string;
  briefOverview: string;
  offerMessages: { title: string; message: string; prices: string; schedule: string }[];
  audience: string;
  selectedFormats: Set<FormatKey>;
  publications: { id: string; name: string; globalMaxFileSizeKb?: number; formats: { name: string; width: number; height: number }[] }[];
  creativeDirection: string; visualDirection: string; notes: string;
}): string {
  const line = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
  const divider = "────────────────────────────────────────────";

  const lines: string[] = [
    "DESIGN BRIEF",
    line,
    `Brand       ${brand || "—"}`,
    `Campaign   ${campaign || "—"}`,
    `Brief date  ${requestedDate ? fmtDate(requestedDate) : "—"}`,
    `Deadline    ${deadline ? fmtDate(deadline) : "—"}`,
    "",
    ...((briefOverview ?? "").trim() ? [
      divider,
      "BRIEF",
      divider,
      briefOverview.trim(),
      "",
    ] : []),
    divider,
    "OBJECTIVE",
    divider,
    objective || "—",
    "",
    ...offerMessages.flatMap((o, i) => [
      divider,
      `OFFER ${i + 1}${o.title ? ` — ${o.title}` : ""}`,
      divider,
      o.message || "—",
      "",
      ...(o.prices.trim() ? ["Prices:", o.prices.trim(), ""] : []),
      ...(o.schedule.trim() ? ["Schedule:", o.schedule.trim(), ""] : []),
    ]),
    divider,
    "TARGET AUDIENCE",
    divider,
    audience || "—",
    "",
    divider,
    "FORMATS REQUIRED",
    divider,
  ];

  const selectedPubs = publications.filter(pub =>
    pub.formats.some(fmt => selectedFormats.has(`${pub.id}::${fmt.name}`))
  );

  if (selectedPubs.length === 0) {
    lines.push("No formats selected.");
  } else {
    for (const pub of selectedPubs) {
      const pubFmts = pub.formats.filter(fmt => selectedFormats.has(`${pub.id}::${fmt.name}`));
      const sizeNote = pub.globalMaxFileSizeKb ? ` (max file size: ${pub.globalMaxFileSizeKb} KB)` : "";
      lines.push(`${pub.name}${sizeNote}`);
      for (const fmt of pubFmts) {
        lines.push(`  ▸ ${fmt.name} — ${fmt.width} × ${fmt.height} px`);
      }
      lines.push("");
    }
  }

  lines.push(divider);
  lines.push("CREATIVE DIRECTION");
  lines.push(divider);
  lines.push(creativeDirection || "—");
  lines.push("");
  if (visualDirection.trim()) {
    lines.push(divider);
    lines.push("VISUAL DIRECTION");
    lines.push(divider);
    lines.push(visualDirection.trim());
    lines.push("");
  }
  lines.push(divider);
  lines.push("DEADLINE");
  lines.push(divider);
  lines.push(deadline ? fmtDate(deadline) : "—");
  if (notes.trim()) {
    lines.push("");
    lines.push(divider);
    lines.push("ADDITIONAL NOTES");
    lines.push(divider);
    lines.push(notes);
  }
  lines.push("");
  lines.push(line);

  return lines.join("\n");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DesignBrief() {
  const content = useBrandContent();
  const { activeBrand } = useBrand();
  const publications = content.adSpecs?.publications ?? [];

  // Pre-fill from 2026 season offers
  const offer2026 = content.offers.yearSections?.find(s => s.year === "2026");
  const offerData = offer2026?.offers ?? [];
  const defaultOfferMessages = offerData.length
    ? offerData.map(o => ({
        title: o.name,
        message: o.hook,
        prices: o.prices.map(p => `${p.label}: ${p.value}`).join("\n"),
        schedule: o.schedule?.map(s => `${s.label}: ${s.value}`).join("\n") ?? "",
      }))
    : [{ title: "", message: "", prices: "", schedule: "" }, { title: "", message: "", prices: "", schedule: "" }];

  // ─── Draft persistence ─────────────────────────────────────────────────────
  const draftKey = `brand-hub:design-brief-draft:${activeBrand?.slug ?? "default"}`;
  function readDraft(): Record<string, unknown> {
    try { const r = localStorage.getItem(draftKey); return r ? JSON.parse(r) : {}; }
    catch { return {}; }
  }

  // Form state — lazy initializers read the persisted draft on first mount
  const [brand, setBrand] = useState<string>(() => (readDraft().brand as string) ?? content.brandDisplayName ?? "Virtu Ferries");
  const [campaign, setCampaign] = useState<string>(() => (readDraft().campaign as string) ?? "2026 Summer Offer – Peak Season");
  const [requestedDate, setRequestedDate] = useState<string>(() => (readDraft().requestedDate as string) ?? today());
  const [objective, setObjective] = useState<string>(() =>
    (readDraft().objective as string) ?? "Drive awareness and bookings for the 2026 peak season offers across Malta and Sicily markets."
  );
  const [briefOverview, setBriefOverview] = useState<string>(() =>
    (readDraft().briefOverview as string) ?? ""
  );
  const [offerMessages, setOfferMessages] = useState<{ title: string; message: string; prices: string; schedule: string }[]>(() => {
    const d = readDraft().offerMessages;
    return Array.isArray(d) && d.length > 0 ? d as typeof defaultOfferMessages : defaultOfferMessages;
  });
  const [audience, setAudience] = useState<string>(() =>
    (readDraft().audience as string) ?? "Maltese and Italian market — adults and families planning summer travel between Malta and Sicily."
  );
  const [selectedFormats, setSelectedFormats] = useState<Set<FormatKey>>(() => {
    const saved = readDraft().selectedFormats;
    if (Array.isArray(saved) && saved.length > 0) return new Set(saved as string[]);
    const defaults = new Set<FormatKey>();
    for (const pub of publications) {
      for (const fmt of pub.formats) defaults.add(`${pub.id}::${fmt.name}`);
    }
    return defaults;
  });
  const [creativeDirection, setCreativeDirection] = useState<string>(() =>
    (readDraft().creativeDirection as string) ?? "Lead with summer energy and the value of the crossing. Imagery should feel aspirational — open sea, sunlit coastlines. Avoid stock-photo generic. Prices should appear but not dominate. Brand colours: Virtu Blue (#1e82b4) dominant."
  );
  const [visualDirection, setVisualDirection] = useState<string>(() =>
    (readDraft().visualDirection as string) ?? ""
  );
  const [creativeDirectionExpanded, setCreativeDirectionExpanded] = useState(false);
  const [visualDirectionExpanded, setVisualDirectionExpanded] = useState(false);
  const [deadline, setDeadline] = useState<string>(() => (readDraft().deadline as string) ?? "");
  const [notes, setNotes] = useState<string>(() => (readDraft().notes as string) ?? "");
  const [visualRefs, setVisualRefs] = useState<{ name: string; dataUrl: string }[]>([]);

  // Auto-save draft whenever any form field changes (visual refs excluded — too large)
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({
        brand, campaign, requestedDate, deadline, objective, briefOverview,
        offerMessages, audience, selectedFormats: [...selectedFormats],
        creativeDirection, visualDirection, notes,
      }));
    } catch { /* quota exceeded — ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, campaign, requestedDate, deadline, objective, briefOverview, offerMessages, audience, selectedFormats, creativeDirection, visualDirection, notes]);

  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!lightboxSrc) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxSrc(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxSrc]);

  function handleImageUpload(files: FileList) {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) setVisualRefs(prev => [...prev, { name: file.name, dataUrl }]);
      };
      reader.readAsDataURL(file);
    });
  }

  // ─── Template system ───────────────────────────────────────────────────────
  const STORAGE_KEY = "brand-hub:design-brief-templates";

  const offerTemplate: FormSnapshot = {
    brand: content.brandDisplayName || "Virtu Ferries",
    campaign: "2026 Summer Offer – Peak Season",
    objective: "Drive awareness and bookings for the 2026 peak season offers across Malta and Sicily markets.",
    briefOverview: "",
    offerMessages: defaultOfferMessages,
    audience: "Maltese and Italian market — adults and families planning summer travel between Malta and Sicily.",
    selectedFormats: publications.flatMap(p => p.formats.map(f => `${p.id}::${f.name}`)),
    creativeDirection: "Lead with summer energy and the value of the crossing. Imagery should feel aspirational — open sea, sunlit coastlines. Avoid stock-photo generic. Prices should appear but not dominate. Brand colours: Virtu Blue (#1e82b4) dominant.",
    visualDirection: "",
    notes: "",
  };

  const [savedTemplates, setSavedTemplates] = useState<{ name: string; snapshot: FormSnapshot }[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
  });
  const [saveInput, setSaveInput] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<string | null>("Offer Campaign");

  function loadTemplate(snapshot: FormSnapshot, name: string) {
    setBrand(snapshot.brand);
    setCampaign(snapshot.campaign);
    setObjective(snapshot.objective);
    setBriefOverview(snapshot.briefOverview ?? "");
    setOfferMessages(snapshot.offerMessages);
    setAudience(snapshot.audience);
    setSelectedFormats(new Set(snapshot.selectedFormats));
    setCreativeDirection(snapshot.creativeDirection);
    setVisualDirection(snapshot.visualDirection ?? "");
    setNotes(snapshot.notes);
    setActiveTemplate(name);
  }

  function saveCurrentAsTemplate(name: string) {
    const snapshot: FormSnapshot = {
      brand, campaign, objective, briefOverview, offerMessages, audience,
      selectedFormats: [...selectedFormats], creativeDirection, visualDirection, notes,
    };
    const updated = [...savedTemplates.filter(t => t.name !== name), { name, snapshot }];
    setSavedTemplates(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSaveInput("");
    setShowSaveInput(false);
    setActiveTemplate(name);
  }

  function deleteTemplate(name: string) {
    const updated = savedTemplates.filter(t => t.name !== name);
    setSavedTemplates(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (activeTemplate === name) setActiveTemplate(null);
  }

  function toggleFormat(key: FormatKey) {
    setSelectedFormats(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function togglePublication(pubId: string, fmts: { name: string }[]) {
    const keys = fmts.map(f => `${pubId}::${f.name}`);
    const allSelected = keys.every(k => selectedFormats.has(k));
    setSelectedFormats(prev => {
      const next = new Set(prev);
      if (allSelected) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
  }

  const brief = useMemo(() => generateBrief({
    brand, campaign, requestedDate, deadline, objective, briefOverview, offerMessages,
    audience, selectedFormats, publications, creativeDirection, visualDirection, notes,
  }), [brand, campaign, requestedDate, deadline, objective, briefOverview, offerMessages,
    audience, selectedFormats, publications, creativeDirection, visualDirection, notes]);

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the textarea
    }
  }

  function shareUrl(token: string): string {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    return `${window.location.origin}${base}/brief/${token}`;
  }

  async function postBrief(): Promise<string> {
    const r = await fetch(`${API}/api/design-briefs/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brandSlug: activeBrand?.slug ?? "virtu-ferries",
        brandName: activeBrand?.name ?? brand,
        briefText: brief,
        snapshot: { brand, campaign, requestedDate, deadline, objective, briefOverview, offerMessages, audience, selectedFormats: [...selectedFormats], creativeDirection, visualDirection, notes },
        visualRefs,
      }),
    });
    const body = await r.json();
    if (!r.ok) throw new Error(body?.error || `Error ${r.status}`);
    return body.token as string;
  }

  async function saveBrief() {
    if (saving) return;
    setSaving(true);
    setShareError(null);
    try {
      const token = await postBrief();
      setShareToken(token);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setShareError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function shareBrief() {
    if (sharing) return;
    setSharing(true);
    setShareError(null);
    try {
      let token = shareToken;
      if (!token) {
        token = await postBrief();
        setShareToken(token);
      }
      setShowLink(true);
      await navigator.clipboard.writeText(shareUrl(token)).catch(() => {});
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (e) {
      setShareError(e instanceof Error ? e.message : "Failed to create link.");
    } finally {
      setSharing(false);
    }
  }

  async function copyShareLink() {
    if (!shareToken) return;
    try {
      await navigator.clipboard.writeText(shareUrl(shareToken));
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch { /* ignore */ }
  }

  function downloadAsPdf() {
    const win = window.open("", "_blank");
    if (!win) return;
    const escaped = brief
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const imagesHtml = visualRefs.length > 0
      ? `<div style="margin-top:36px;padding-top:24px;border-top:2px solid #e4e4e7;">
          <p style="font-family:'Courier New',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:#a1a1aa;margin-bottom:14px;">Visual References</p>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
            ${visualRefs.map(r => `<div>
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
  <title>${(campaign || "Design Brief").replace(/</g, "&lt;")}</title>
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
    @media print {
      @page { margin: 20mm 22mm; size: A4; }
      body { padding: 0; }
    }
  </style>
</head>
<body><pre>${escaped}</pre>${imagesHtml}</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 250);
  }

  const card = "bg-[#FFFFFF] border border-[#F4F4F5] rounded-xl";

  return (
    <div className="relative min-h-screen bg-[#F5F5F5] text-[#18181B]">
      <div aria-hidden className="pointer-events-none absolute inset-0 ambient-radial opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative px-6 md:px-10 py-10 md:py-12 max-w-6xl mx-auto pb-24"
      >
        {/* ─── Hero ─────────────────────────────────────────────────── */}
        <header className="mb-10">
          <div className="flex items-center gap-2 mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[#A1A1AA]">
            <span className="h-1 w-1 rounded-full" style={{ background: "var(--brand-primary)" }} />
            Assets
          </div>
          <h1 className="text-[26px] md:text-[28px] font-semibold tracking-[-0.02em] text-[#18181B]">
            Design Brief
          </h1>
          <p className="mt-2 text-[13px] text-[#71717A] font-light max-w-xl">
            Pick a template or start from scratch. Fill in the form — the brief preview updates live on the right.
          </p>
        </header>

        {/* ─── Template bar ─────────────────────────────────────────── */}
        <div className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#A1A1AA] font-medium mb-3">Templates</p>
          <div className="flex items-center gap-2 flex-wrap">

            {/* Built-in: Offer Campaign */}
            <button
              type="button"
              onClick={() => loadTemplate(offerTemplate, "Offer Campaign")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors",
                activeTemplate === "Offer Campaign"
                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                  : "border-[#E4E4E7] bg-white text-[#52525B] hover:border-[var(--brand-primary)]/50 hover:text-[var(--brand-primary)]"
              )}
            >
              <Sparkles className="w-3 h-3" />
              Offer Campaign
            </button>

            {/* Saved templates */}
            {savedTemplates.map(t => (
              <div key={t.name} className="relative group inline-flex items-center">
                <button
                  type="button"
                  onClick={() => loadTemplate(t.snapshot, t.name)}
                  className={cn(
                    "inline-flex items-center gap-1.5 pl-3 pr-7 py-1.5 rounded-full text-[11px] font-medium border transition-colors",
                    activeTemplate === t.name
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                      : "border-[#E4E4E7] bg-white text-[#52525B] hover:border-[var(--brand-primary)]/50 hover:text-[var(--brand-primary)]"
                  )}
                >
                  <Bookmark className="w-3 h-3" />
                  {t.name}
                </button>
                <button
                  type="button"
                  onClick={() => deleteTemplate(t.name)}
                  title="Delete template"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#EF4444] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <XIcon className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}

            {/* Save current as template */}
            {showSaveInput ? (
              <form
                onSubmit={e => { e.preventDefault(); if (saveInput.trim()) saveCurrentAsTemplate(saveInput.trim()); }}
                className="inline-flex items-center gap-1.5"
              >
                <input
                  autoFocus
                  value={saveInput}
                  onChange={e => setSaveInput(e.target.value)}
                  placeholder="Template name…"
                  className="text-[11px] border border-[#E4E4E7] rounded-full px-3 py-1.5 w-36 focus:outline-none focus:border-[var(--brand-primary)]/60 bg-white"
                />
                <button type="submit" className="text-[11px] text-[var(--brand-primary)] font-medium hover:underline">Save</button>
                <button type="button" onClick={() => { setShowSaveInput(false); setSaveInput(""); }} className="text-[11px] text-[#A1A1AA] hover:text-[#52525B]">Cancel</button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setShowSaveInput(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border border-dashed border-[#D4D4D8] text-[#A1A1AA] hover:border-[var(--brand-primary)]/60 hover:text-[var(--brand-primary)] transition-colors"
              >
                <BookmarkPlus className="w-3 h-3" />
                Save current
              </button>
            )}
          </div>
        </div>

        {/* ─── Two-column layout ────────────────────────────────────── */}
        <div className="grid lg:grid-cols-[1fr_420px] gap-8 items-start">

          {/* ── LEFT: Form ─────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Campaign details */}
            <div className={`${card} p-5 space-y-4`}>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3 h-3 text-[#A1A1AA]" />
                <p className="text-[12px] font-medium text-[#27272A]">Campaign details</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Brand</Label>
                  <Input value={brand} onChange={setBrand} placeholder="Virtu Ferries" />
                </div>
                <div>
                  <Label>Campaign name</Label>
                  <Input value={campaign} onChange={setCampaign} placeholder="2026 Summer Offer" />
                </div>
                <div>
                  <Label>Brief date</Label>
                  <input
                    type="date"
                    value={requestedDate}
                    onChange={e => setRequestedDate(e.target.value)}
                    className="w-full text-[12px] text-[#27272A] bg-[#FFFFFF] border border-[#E4E4E7] rounded-lg px-3 py-2 focus:border-[var(--brand-primary)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]/20 transition-colors [color-scheme:light]"
                  />
                </div>
                <div>
                  <Label>Deadline</Label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full text-[12px] text-[#27272A] bg-[#FFFFFF] border border-[#E4E4E7] rounded-lg px-3 py-2 focus:border-[var(--brand-primary)]/60 focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]/20 transition-colors [color-scheme:light]"
                  />
                </div>
              </div>
            </div>

            {/* Brief */}
            <div className={`${card} p-5 space-y-4`}>
              <div className="flex items-center gap-2 mb-1">
                <PenLine className="w-3 h-3 text-[#A1A1AA]" />
                <p className="text-[12px] font-medium text-[#27272A]">Brief</p>
              </div>
              <div>
                <Label>Overview</Label>
                <Textarea
                  value={briefOverview}
                  onChange={setBriefOverview}
                  placeholder="Summarise what this brief is about — context, background, or any key constraints the designer should know upfront."
                  rows={4}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="mb-0">Creative direction</Label>
                  <button
                    type="button"
                    onClick={() => setCreativeDirectionExpanded(e => !e)}
                    className="text-[10px] font-semibold text-[#71717A] hover:text-[#1e82b4] hover:bg-[#1e82b4]/10 transition-colors flex items-center gap-1 px-2 py-1 rounded-md"
                  >
                    {creativeDirectionExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                    {creativeDirectionExpanded ? "Collapse" : "Expand"}
                  </button>
                </div>
                <Textarea value={creativeDirection} onChange={setCreativeDirection} placeholder="Visual style, colour usage, tone, reference images, dos and don'ts…" rows={creativeDirectionExpanded ? 12 : 4} className="transition-all duration-200" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="mb-0">Visual direction</Label>
                  <button
                    type="button"
                    onClick={() => setVisualDirectionExpanded(e => !e)}
                    className="text-[10px] font-semibold text-[#71717A] hover:text-[#1e82b4] hover:bg-[#1e82b4]/10 transition-colors flex items-center gap-1 px-2 py-1 rounded-md"
                  >
                    {visualDirectionExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                    {visualDirectionExpanded ? "Collapse" : "Expand"}
                  </button>
                </div>
                <Textarea value={visualDirection} onChange={setVisualDirection} placeholder="Mood, references, colour palette, typography hints, things to avoid visually…" rows={visualDirectionExpanded ? 12 : 4} className="transition-all duration-200" />
              </div>
              <div>
                <Label>Additional notes</Label>
                <Textarea value={notes} onChange={setNotes} placeholder="Anything else the designer should know…" rows={2} />
              </div>
            </div>

            {/* Messaging */}
            <div className={`${card} p-5 space-y-4`}>
              <div className="flex items-center gap-2 mb-1">
                <PenLine className="w-3 h-3 text-[#A1A1AA]" />
                <p className="text-[12px] font-medium text-[#27272A]">Messaging</p>
              </div>

              <div>
                <Label>Objective</Label>
                <Textarea value={objective} onChange={setObjective} placeholder="What should this campaign achieve?" rows={2} />
              </div>
              {offerMessages.map((offer, i) => {
                const data = offerData[i];
                return (
                  <div key={i} className="space-y-2 pt-1">
                    {/* Offer header */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold text-white shrink-0" style={{ background: "var(--brand-primary)" }}>
                        {i + 1}
                      </span>
                      <p className="text-[11px] font-medium text-[#27272A]">Offer {i + 1}</p>
                    </div>

                    {/* Editable name + hook */}
                    <Input
                      value={offer.title}
                      onChange={v => setOfferMessages(prev => prev.map((o, j) => j === i ? { ...o, title: v } : o))}
                      placeholder="Offer name"
                    />
                    <Textarea
                      value={offer.message}
                      onChange={v => setOfferMessages(prev => prev.map((o, j) => j === i ? { ...o, message: v } : o))}
                      placeholder='Key hook or message for this offer…'
                      rows={2}
                    />

                    {/* Prices */}
                    <div>
                      <Label>Prices</Label>
                      <Textarea
                        value={offer.prices}
                        onChange={v => setOfferMessages(prev => prev.map((o, j) => j === i ? { ...o, prices: v } : o))}
                        placeholder={"Adult return: €63.60\nChild return: €44.60"}
                        rows={4}
                      />
                    </div>

                    {/* Schedule */}
                    <div>
                      <Label>Schedule</Label>
                      <Textarea
                        value={offer.schedule}
                        onChange={v => setOfferMessages(prev => prev.map((o, j) => j === i ? { ...o, schedule: v } : o))}
                        placeholder={"MLA → POZ: Mon 07:30 & 18:00\nPOZ → MLA: Wed 19:30"}
                        rows={3}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Formats */}
            <div className={`${card} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[12px] font-medium text-[#27272A]">Formats required</p>
                <button
                  type="button"
                  onClick={() => {
                    const allKeys = publications.flatMap(p => p.formats.map(f => `${p.id}::${f.name}`));
                    const allSelected = allKeys.every(k => selectedFormats.has(k));
                    if (allSelected) setSelectedFormats(new Set());
                    else setSelectedFormats(new Set(allKeys));
                  }}
                  className="text-[10px] text-[var(--brand-primary)] hover:underline"
                >
                  {publications.flatMap(p => p.formats).every((f, _, arr) =>
                    selectedFormats.has(`${publications.find(p => p.formats.includes(f))?.id}::${f.name}`)
                  ) ? "Deselect all" : "Select all"}
                </button>
              </div>

              {publications.length === 0 ? (
                <p className="text-[12px] text-[#A1A1AA] font-light">No ad specs configured — add formats on the Ad Specs page first.</p>
              ) : (
                <div className="space-y-5">
                  {publications.map(pub => {
                    const allPubSelected = pub.formats.every(f => selectedFormats.has(`${pub.id}::${f.name}`));
                    const somePubSelected = pub.formats.some(f => selectedFormats.has(`${pub.id}::${f.name}`));
                    return (
                      <div key={pub.id}>
                        {/* Publication header */}
                        <div className="flex items-center gap-2.5 mb-2">
                          <button
                            type="button"
                            onClick={() => togglePublication(pub.id, pub.formats)}
                            className={cn(
                              "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                              allPubSelected
                                ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]"
                                : somePubSelected
                                ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/20"
                                : "border-[#D4D4D8] bg-white"
                            )}
                          >
                            {(allPubSelected || somePubSelected) && (
                              <span className="text-white text-[8px] font-bold leading-none">
                                {allPubSelected ? "✓" : "–"}
                              </span>
                            )}
                          </button>
                          <p className="text-[11px] font-semibold text-[#27272A]">{pub.name}</p>
                          {pub.globalMaxFileSizeKb && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5">
                              max {pub.globalMaxFileSizeKb} KB
                            </span>
                          )}
                        </div>

                        {/* Format checkboxes */}
                        <div className="ml-6 space-y-1.5">
                          {pub.formats.map(fmt => {
                            const key = `${pub.id}::${fmt.name}`;
                            const checked = selectedFormats.has(key);
                            return (
                              <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                                <span
                                  onClick={() => toggleFormat(key)}
                                  className={cn(
                                    "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                    checked
                                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]"
                                      : "border-[#D4D4D8] bg-white group-hover:border-[var(--brand-primary)]/50"
                                  )}
                                >
                                  {checked && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
                                </span>
                                <span className="text-[12px] text-[#52525B] group-hover:text-[#27272A] transition-colors">
                                  {fmt.name}
                                </span>
                                <span className="text-[11px] text-[#A1A1AA] num-tabular ml-auto">
                                  {fmt.width} × {fmt.height}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Visual references */}
            <div className={`${card} p-5 space-y-3`}>
              <div className="flex items-center gap-2">
                <ImagePlus className="w-3 h-3 text-[#A1A1AA]" />
                <p className="text-[12px] font-medium text-[#27272A]">Visual references</p>
                {visualRefs.length > 0 && (
                  <span className="ml-auto text-[10px] text-[#A1A1AA]">{visualRefs.length} image{visualRefs.length !== 1 ? "s" : ""}</span>
                )}
              </div>

              <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-[#E4E4E7] rounded-lg py-5 cursor-pointer hover:border-[var(--brand-primary)]/50 hover:bg-white transition-colors bg-[#FAFAFA]">
                <ImagePlus className="w-4 h-4 text-[#A1A1AA]" />
                <span className="text-[11px] text-[#71717A]">Click to upload</span>
                <span className="text-[10px] text-[#A1A1AA]">JPG, PNG, GIF, WebP</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={e => e.target.files && handleImageUpload(e.target.files)}
                />
              </label>

              {visualRefs.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {visualRefs.map((ref, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-[#E4E4E7] aspect-square bg-[#F4F4F5]">
                      <img src={ref.dataUrl} alt={ref.name} onClick={() => setLightboxSrc(ref.dataUrl)} className="w-full h-full object-cover cursor-zoom-in" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center pointer-events-none">
                        <button
                          type="button"
                          onClick={() => setVisualRefs(prev => prev.filter((_, j) => j !== i))}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-white/90 text-[#EF4444] hover:bg-white"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] px-1.5 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {ref.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Live preview ─────────────────────────────────── */}
          <div className="lg:sticky lg:top-6">
            <div className={`${card} overflow-hidden`}>
              {/* Preview header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#F4F4F5] bg-[#FAFAFA]">
                <p className="text-[11px] font-medium text-[#27272A]">Brief preview</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadAsPdf}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-[#E4E4E7] bg-white text-[#52525B] hover:border-[#A1A1AA] hover:text-[#27272A] transition-colors"
                  >
                    <FileDown className="w-3 h-3" />
                    PDF
                  </button>

                  {/* Save */}
                  <button
                    type="button"
                    onClick={saveBrief}
                    disabled={saving}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors disabled:opacity-60",
                      saved
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : "border-[#E4E4E7] bg-white text-[#52525B] hover:border-[#A1A1AA] hover:text-[#27272A]"
                    )}
                  >
                    {saving
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
                      : saved
                        ? <><Check className="w-3 h-3" /> Saved!</>
                        : "Save"}
                  </button>

                  {/* Share */}
                  <button
                    type="button"
                    onClick={showLink ? copyShareLink : shareBrief}
                    disabled={sharing}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors disabled:opacity-60",
                      linkCopied
                        ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                        : showLink
                          ? "border-[var(--brand-primary)]/40 bg-[var(--brand-primary)]/5 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10"
                          : "border-[#E4E4E7] bg-white text-[#52525B] hover:border-[#A1A1AA] hover:text-[#27272A]"
                    )}
                  >
                    {sharing
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Sharing…</>
                      : linkCopied
                        ? <><Check className="w-3 h-3" /> Copied!</>
                        : showLink
                          ? <><Link2 className="w-3 h-3" /> Copy link</>
                          : <><Link2 className="w-3 h-3" /> Share</>}
                  </button>

                  <button
                    type="button"
                    onClick={copyBrief}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors",
                      copied
                        ? "bg-emerald-500 text-white"
                        : "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white"
                    )}
                  >
                    {copied
                      ? <><Check className="w-3 h-3" /> Copied!</>
                      : <><ClipboardCopy className="w-3 h-3" /> Copy brief</>}
                  </button>
                </div>
              </div>

              {/* Share link strip */}
              {showLink && shareToken && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--brand-primary)]/5 border-b border-[var(--brand-primary)]/10">
                  <Link2 className="w-3 h-3 text-[var(--brand-primary)] shrink-0" />
                  <a
                    href={shareUrl(shareToken)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-[10.5px] text-[var(--brand-primary)] truncate hover:underline"
                  >
                    {shareUrl(shareToken)}
                  </a>
                  <button
                    type="button"
                    onClick={() => { setShareToken(null); setShowLink(false); setShareError(null); setSaved(false); }}
                    className="shrink-0 text-[10px] text-[#A1A1AA] hover:text-[#52525B] transition-colors"
                  >
                    Reset
                  </button>
                </div>
              )}
              {shareError && (
                <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                  <p className="text-[10.5px] text-red-600">{shareError}</p>
                </div>
              )}

              {/* Monospace brief output */}
              <div className="px-4 py-4 overflow-auto max-h-[70vh]">
                <pre className="text-[10.5px] leading-relaxed text-[#3F3F46] whitespace-pre-wrap font-mono">
                  {brief}
                </pre>

                {/* Visual references thumbnails */}
                {visualRefs.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#F4F4F5]">
                    <p className="text-[9.5px] uppercase tracking-[0.16em] text-[#A1A1AA] font-medium mb-2">
                      Visual References ({visualRefs.length})
                    </p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {visualRefs.map((ref, i) => (
                        <img
                          key={i}
                          src={ref.dataUrl}
                          alt={ref.name}
                          title={ref.name}
                          onClick={() => setLightboxSrc(ref.dataUrl)}
                          className="w-full aspect-square object-cover rounded border border-[#F4F4F5] cursor-zoom-in"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </motion.div>

      {lightboxSrc && (
        <div
          onClick={() => setLightboxSrc(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <button
            type="button"
            onClick={() => setLightboxSrc(null)}
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
