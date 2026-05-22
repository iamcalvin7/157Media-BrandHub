import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ClipboardCopy, Check, PenLine, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandContent } from "@/lib/brand-content";

// ─── Types ────────────────────────────────────────────────────────────────────

type FormatKey = string; // "pubId::formatName"

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

// ─── Brief generator ──────────────────────────────────────────────────────────

function generateBrief({
  brand, campaign, requestedDate, deadline, objective, offerMessages,
  audience, selectedFormats, publications, creativeDirection, notes,
}: {
  brand: string; campaign: string; requestedDate: string; deadline: string;
  objective: string;
  offerMessages: { title: string; message: string; prices: string; schedule: string }[];
  audience: string;
  selectedFormats: Set<FormatKey>;
  publications: { id: string; name: string; globalMaxFileSizeKb?: number; formats: { name: string; width: number; height: number }[] }[];
  creativeDirection: string; notes: string;
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

  // Form state
  const [brand, setBrand] = useState(content.brandDisplayName || "Virtu Ferries");
  const [campaign, setCampaign] = useState("2026 Summer Offer – Peak Season");
  const [requestedDate, setRequestedDate] = useState(today());
  const [objective, setObjective] = useState(
    "Drive awareness and bookings for the 2026 peak season offers across Malta and Sicily markets."
  );
  const [offerMessages, setOfferMessages] = useState<{ title: string; message: string; prices: string; schedule: string }[]>(defaultOfferMessages);
  const [audience, setAudience] = useState(
    "Maltese and Italian market — adults and families planning summer travel between Malta and Sicily."
  );
  const [selectedFormats, setSelectedFormats] = useState<Set<FormatKey>>(() => {
    const defaults = new Set<FormatKey>();
    for (const pub of publications) {
      for (const fmt of pub.formats) {
        defaults.add(`${pub.id}::${fmt.name}`);
      }
    }
    return defaults;
  });
  const [creativeDirection, setCreativeDirection] = useState(
    "Lead with summer energy and the value of the crossing. Imagery should feel aspirational — open sea, sunlit coastlines. Avoid stock-photo generic. Prices should appear but not dominate. Brand colours: Virtu Blue (#1e82b4) dominant."
  );
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");

  const [copied, setCopied] = useState(false);

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
    brand, campaign, requestedDate, deadline, objective, offerMessages,
    audience, selectedFormats, publications, creativeDirection, notes,
  }), [brand, campaign, requestedDate, deadline, objective, offerMessages,
    audience, selectedFormats, publications, creativeDirection, notes]);

  async function copyBrief() {
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the textarea
    }
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
            Fill in the form to generate a formatted brief. Pre-filled for the 2026 summer offer — adjust as needed and copy.
          </p>
        </header>

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
              <div>
                <Label>Target audience</Label>
                <Textarea value={audience} onChange={setAudience} placeholder="Who are we talking to?" rows={2} />
              </div>
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

            {/* Creative direction + notes */}
            <div className={`${card} p-5 space-y-4`}>
              <p className="text-[12px] font-medium text-[#27272A]">Creative & delivery</p>

              <div>
                <Label>Creative direction</Label>
                <Textarea value={creativeDirection} onChange={setCreativeDirection} placeholder="Visual style, colour usage, tone, reference images, dos and don'ts…" rows={4} />
              </div>
              <div>
                <Label>Additional notes</Label>
                <Textarea value={notes} onChange={setNotes} placeholder="Anything else the designer should know…" rows={2} />
              </div>
            </div>
          </div>

          {/* ── RIGHT: Live preview ─────────────────────────────────── */}
          <div className="lg:sticky lg:top-6">
            <div className={`${card} overflow-hidden`}>
              {/* Preview header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#F4F4F5] bg-[#FAFAFA]">
                <p className="text-[11px] font-medium text-[#27272A]">Brief preview</p>
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

              {/* Monospace brief output */}
              <div className="px-4 py-4 overflow-auto max-h-[70vh]">
                <pre className="text-[10.5px] leading-relaxed text-[#3F3F46] whitespace-pre-wrap font-mono">
                  {brief}
                </pre>
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
