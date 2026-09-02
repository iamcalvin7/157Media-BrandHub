import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag, Clock, ArrowLeftRight, Users, Car, Bike, Truck,
  RefreshCw, CalendarDays, ChevronDown, Repeat, Sparkles,
  Plus, Pencil, Trash2, Save, X, Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";
import { useBrand } from "@/lib/brand";
import type { Offer, OffersContent } from "@/lib/brand-content";

// ─── Constants ────────────────────────────────────────────────────────────────

const PRICE_ICONS = { Users, Car, Bike, Truck } as const;

const card = "bg-[#FFFFFF] border border-[#F4F4F5] rounded-xl";
const cardHover = "bg-[#FFFFFF] border border-[#F4F4F5] hover:border-[#E4E4E7] rounded-xl transition-colors";

// ─── Section heading (matches Social Media / Strategy pages) ──────────────────

type SectionDef = { id: string; num: string; title: string; Icon: LucideIcon };

function SectionHead({ id, num, title, Icon }: SectionDef) {
  return (
    <header className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-medium tracking-[0.18em] text-[#A1A1AA] num-tabular">{num}</span>
      <span className="h-px w-6 bg-[#E4E4E7]" />
      <Icon className="w-3 h-3 text-[#A1A1AA]" />
      <h2 className="text-[13px] font-medium text-[#27272A] tracking-[-0.005em]">{title}</h2>
      <span className="sr-only" id={id} />
    </header>
  );
}

// ─── Stat pill (header strip) ─────────────────────────────────────────────────

function StatPill({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[15px] font-semibold text-[#18181B] num-tabular tracking-[-0.01em]">{value}</span>
      <span className="text-[11px] text-[#71717A] font-light">{label}</span>
    </div>
  );
}

// ─── Offer Card ───────────────────────────────────────────────────────────────

function OfferCard({
  offer,
  onEdit,
  onDelete,
}: {
  offer: Offer;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className={`${card} overflow-hidden`}>
      {/* colour stripe */}
      <div className="h-[3px]" style={{ backgroundColor: offer.badgeColor }} />

      <div className="p-4 space-y-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <span
              className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1.5"
              style={{ backgroundColor: `${offer.badgeColor}15`, color: offer.badgeColor }}
            >
              {offer.badge}
            </span>
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-semibold text-[#18181B] tracking-[-0.01em]">{offer.name}</p>
              {onEdit && (
                <div className="flex items-center gap-1">
                  <button type="button" onClick={onEdit} className="p-1 rounded-md text-[#A1A1AA] hover:text-[#1e82b4] hover:bg-[#F4F4F5]" title="Edit offer">
                    <Pencil className="w-3 h-3" />
                  </button>
                  <button type="button" onClick={onDelete} className="p-1 rounded-md text-[#A1A1AA] hover:text-red-500 hover:bg-[#F4F4F5]" title="Delete offer">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-[12px] text-[#71717A] font-light mt-0.5 leading-snug">{offer.description}</p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#A1A1AA] bg-[#F5F5F5] border border-[#F4F4F5] px-2.5 py-1.5 rounded-lg shrink-0">
            <Clock className="w-3 h-3" />
            {offer.validity}
          </div>
        </div>

        {/* Hook */}
        <div
          className="rounded-lg px-3.5 py-3 border-l-[3px]"
          style={{ borderColor: offer.badgeColor, backgroundColor: `${offer.badgeColor}08` }}
        >
          <p className="text-[12px] font-medium text-[#27272A] italic">"{offer.hook}"</p>
          <p className="text-[10px] text-[#A1A1AA] mt-0.5 uppercase tracking-[0.16em]">Content hook</p>
        </div>

        {/* Prices + Schedule grid */}
        <div className={cn("grid gap-4", offer.schedule ? "md:grid-cols-2" : "")}>
          {/* Prices */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#A1A1AA] font-medium mb-2">Prices</p>
            <div className={`${card} overflow-hidden divide-y divide-[#FAFAFA]`}>
              {offer.prices.map((p) => {
                const Icon = PRICE_ICONS[p.iconName] ?? Users;
                return (
                  <div key={p.label} className="flex items-center justify-between px-3.5 py-2.5 hover:bg-[#FAFAFA] transition-colors">
                    <div className="flex items-center gap-2 text-[12px] text-[#52525B]">
                      <Icon className="w-3 h-3 text-[#A1A1AA]" />
                      {p.label}
                    </div>
                    <span className="text-[13px] font-semibold text-[#18181B] num-tabular">{p.value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Schedule */}
          {offer.schedule && (
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#A1A1AA] font-medium mb-2">Schedule</p>
              <div className={`${card} overflow-hidden divide-y divide-[#FAFAFA]`}>
                {offer.schedule.map((s) => (
                  <div key={s.label} className="flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-[#FAFAFA] transition-colors">
                    <ArrowLeftRight className="w-3 h-3 text-[#A1A1AA] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] text-[#A1A1AA] uppercase tracking-[0.14em]">{s.label}</p>
                      <p className="text-[12px] font-medium text-[#18181B]">{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Conditions */}
        {offer.notes.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#A1A1AA] font-medium mb-1.5">Conditions</p>
            <ul className="space-y-1">
              {offer.notes.map((note) => (
                <li key={note} className="flex items-start gap-2 text-[11px] text-[#71717A] font-light">
                  <span className="mt-1.5 w-1 h-1 rounded-full bg-[#D4D4D8] shrink-0" />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

type OfferForm = {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  validity: string;
  hook: string;
  prices: string;
  schedule: string;
  notes: string;
};

const DEFAULT_OFFER_FORM: OfferForm = {
  id: "",
  name: "",
  badge: "New offer",
  badgeColor: "#1E82B4",
  description: "",
  validity: "",
  hook: "",
  prices: "Adult return | €0 | Users",
  schedule: "",
  notes: "",
};

function offerToForm(offer: Offer): OfferForm {
  return {
    id: offer.id,
    name: offer.name,
    badge: offer.badge,
    badgeColor: offer.badgeColor,
    description: offer.description,
    validity: offer.validity,
    hook: offer.hook,
    prices: offer.prices.map((price) => `${price.label} | ${price.value} | ${price.iconName}`).join("\n"),
    schedule: offer.schedule?.map((item) => `${item.label} | ${item.value}`).join("\n") ?? "",
    notes: offer.notes.join("\n"),
  };
}

function lines(value: string) {
  return value.split("\n").map((line) => line.trim()).filter(Boolean);
}

function parsePrices(value: string): Offer["prices"] {
  return lines(value).map((line) => {
    const [label = "", price = "", icon = "Users"] = line.split("|").map((part) => part.trim());
    const iconName: Offer["prices"][number]["iconName"] = icon === "Car" || icon === "Bike" || icon === "Truck" ? icon : "Users";
    return { label, value: price, iconName };
  }).filter((price) => price.label && price.value);
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "offer";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Offers() {
  const { offers } = useBrandContent();
  const { activeBrandSlug } = useBrand();
  const API = import.meta.env.BASE_URL.replace(/\/$/, "");
  const [savedOffers, setSavedOffers] = useState<OffersContent | null>(null);
  const [editorContent, setEditorContent] = useState<OffersContent | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<"always" | string>("always");
  const [offerForm, setOfferForm] = useState<OfferForm>(DEFAULT_OFFER_FORM);
  const [offerFormOpen, setOfferFormOpen] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [strategyOpen, setStrategyOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingSaved(true);
    fetch(`${API}/api/offers`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load offers (${response.status})`);
        return response.json() as Promise<OffersContent | null>;
      })
      .then((content) => {
        if (!cancelled) setSavedOffers(content);
      })
      .catch(() => {
        if (!cancelled) setSavedOffers(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingSaved(false);
      });
    return () => { cancelled = true; };
  }, [API, activeBrandSlug]);

  const displayOffers = editorOpen && editorContent ? editorContent : savedOffers ?? offers;
  const totalGeneral = displayOffers.offers.length;
  const totalSeasonal = displayOffers.yearSections?.reduce((acc, s) => acc + s.offers.length, 0) ?? 0;
  const totalOffers = totalGeneral + totalSeasonal;
  const hasAnyOffers = totalOffers > 0;

  // Build section list dynamically
  const sections: SectionDef[] = [];
  if (totalGeneral > 0) sections.push({ id: "always-on", num: "01", title: "Always-on", Icon: Repeat });
  if ((displayOffers.yearSections?.length ?? 0) > 0) {
    displayOffers.yearSections!.forEach((ys, i) => {
      sections.push({
        id: `year-${ys.year}`,
        num: String(sections.length + 1).padStart(2, "0"),
        title: `${ys.year} Season`,
        Icon: CalendarDays,
      });
    });
  }
  if (displayOffers.notes.length > 0) {
    sections.push({ id: "strategy", num: String(sections.length + 1).padStart(2, "0"), title: "Strategy", Icon: Sparkles });
  }

  // Active section tracking
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [sections.length]);

  const scrollTo = (id: string) => {
    const el = sectionRefs.current[id];
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const cloneContent = (content: OffersContent): OffersContent =>
    JSON.parse(JSON.stringify(content)) as OffersContent;

  const openEditor = () => {
    setEditorContent(cloneContent(displayOffers));
    setEditorOpen(true);
    setSaveError(null);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditorContent(null);
    setOfferFormOpen(false);
    setSaveError(null);
  };

  const openNewOffer = (section: "always" | string) => {
    setEditingSection(section);
    setOfferForm({ ...DEFAULT_OFFER_FORM });
    setOfferFormOpen(true);
  };

  const openExistingOffer = (offer: Offer, section: "always" | string) => {
    setEditingSection(section);
    setOfferForm(offerToForm(offer));
    setOfferFormOpen(true);
  };

  const saveOfferToDraft = () => {
    if (!editorContent) return;
    const name = offerForm.name.trim();
    const prices = parsePrices(offerForm.prices);
    if (!name || !offerForm.badge.trim() || !offerForm.hook.trim() || prices.length === 0) {
      setSaveError("Add a name, badge, hook, and at least one price before saving the offer.");
      return;
    }
    const offer: Offer = {
      id: offerForm.id || `${slugify(name)}-${Date.now()}`,
      name,
      badge: offerForm.badge.trim(),
      badgeColor: offerForm.badgeColor.trim() || "#1E82B4",
      description: offerForm.description.trim(),
      validity: offerForm.validity.trim(),
      hook: offerForm.hook.trim(),
      prices,
      ...(lines(offerForm.schedule).length > 0
        ? { schedule: lines(offerForm.schedule).map((line) => {
          const [label = "", value = ""] = line.split("|").map((part) => part.trim());
          return { label, value };
        }).filter((item) => item.label && item.value) }
        : {}),
      notes: lines(offerForm.notes),
    };
    const next = cloneContent(editorContent);
    if (editingSection === "always") {
      const index = next.offers.findIndex((item) => item.id === offer.id);
      if (index >= 0) next.offers[index] = offer;
      else next.offers.push(offer);
    } else {
      const section = next.yearSections?.find((item) => item.year === editingSection);
      if (section) {
        const index = section.offers.findIndex((item) => item.id === offer.id);
        if (index >= 0) section.offers[index] = offer;
        else section.offers.push(offer);
      } else {
        next.yearSections = [...(next.yearSections ?? []), { year: editingSection, offers: [offer] }];
      }
    }
    setEditorContent(next);
    setOfferFormOpen(false);
    setSaveError(null);
  };

  const deleteOffer = (offer: Offer, section: "always" | string) => {
    if (!window.confirm(`Delete "${offer.name}"?`)) return;
    if (!editorContent) return;
    const next = cloneContent(editorContent);
    if (section === "always") {
      next.offers = next.offers.filter((item) => item.id !== offer.id);
    } else {
      const yearSection = next.yearSections?.find((item) => item.year === section);
      if (yearSection) yearSection.offers = yearSection.offers.filter((item) => item.id !== offer.id);
    }
    setEditorContent(next);
  };

  const saveAllOffers = async () => {
    if (!editorContent) return;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(`${API}/api/offers`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editorContent }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not save offers");
      setSavedOffers(data as OffersContent);
      closeEditor();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save offers");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#F5F5F5] text-[#18181B]">
      <div aria-hidden className="pointer-events-none absolute inset-0 ambient-radial opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative px-6 md:px-10 py-10 md:py-12 max-w-4xl mx-auto pb-24"
      >
        {/* ─── Hero ─────────────────────────────────────────────────── */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[#A1A1AA]">
            <span className="h-1 w-1 rounded-full" style={{ background: "var(--brand-primary)" }} />
            Pricing &amp; Offers
          </div>
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-[26px] md:text-[28px] font-semibold tracking-[-0.02em] text-[#18181B]">Offers</h1>
            <button
              type="button"
              onClick={editorOpen ? closeEditor : openEditor}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E4E7] bg-white px-3 py-2 text-[12px] font-semibold text-[#27272A] shadow-sm hover:border-[#1e82b4] hover:text-[#1e82b4] transition-colors"
            >
              {editorOpen ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
              {editorOpen ? "Cancel editing" : "Edit offers"}
            </button>
          </div>
          <p className="mt-2 text-[13px] text-[#71717A] font-light max-w-xl">
            {displayOffers.headerSubtitle}
          </p>

          {/* Stat strip */}
          {hasAnyOffers && (
            <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2">
              {totalOffers > 0 && <StatPill value={totalOffers} label={totalOffers === 1 ? "offer" : "offers"} />}
              {totalSeasonal > 0 && <StatPill value={totalSeasonal} label="seasonal" />}
              {(displayOffers.yearSections?.length ?? 0) > 0 && (
                <StatPill value={displayOffers.yearSections!.map(s => s.year).join(", ")} label="season" />
              )}
            </div>
          )}

          {/* Freshness reminder */}
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-amber-600">
            <RefreshCw className="w-3 h-3 shrink-0" />
            Update this page at the start of each month
            {loadingSaved && <span className="text-[#A1A1AA]">· Loading saved updates…</span>}
          </div>
        </header>

        {editorOpen && editorContent && (
          <section className={`${card} p-5 mb-8 border-[#1e82b4]/25 shadow-sm`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1e82b4]">Content editor</p>
                <h2 className="text-[16px] font-semibold text-[#18181B] mt-1">Update offers</h2>
                <p className="text-[11px] text-[#71717A] mt-1">Changes stay in draft until you click Save changes.</p>
              </div>
              <button
                type="button"
                onClick={() => void saveAllOffers()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e82b4] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#18181B] disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save changes
              </button>
            </div>
            <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#71717A]">
              Page subtitle
              <textarea
                value={editorContent.headerSubtitle}
                onChange={(event) => setEditorContent({ ...editorContent, headerSubtitle: event.target.value })}
                rows={2}
                className="mt-1.5 block w-full rounded-xl border border-[#E4E4E7] px-3 py-2.5 text-[13px] font-normal normal-case tracking-normal text-[#18181B] focus:outline-none focus:border-[#1e82b4] resize-y"
              />
            </label>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A1A1AA]">Always-on offers</p>
                <button type="button" onClick={() => openNewOffer("always")} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1e82b4] hover:text-[#18181B]">
                  <Plus className="w-3 h-3" /> Add offer
                </button>
              </div>
              {editorContent.offers.length === 0 && <p className="text-[12px] text-[#A1A1AA]">No always-on offers yet.</p>}
              <div className="grid gap-2">
                {editorContent.offers.map((offer) => (
                  <div key={offer.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#F4F4F5] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-[#18181B]">{offer.name}</p>
                      <p className="truncate text-[11px] text-[#71717A]">{offer.badge}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => openExistingOffer(offer, "always")} className="p-1.5 rounded-md text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#1e82b4]" title="Edit offer"><Pencil className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => deleteOffer(offer, "always")} className="p-1.5 rounded-md text-[#71717A] hover:bg-[#F4F4F5] hover:text-red-500" title="Delete offer"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>

              {editorContent.yearSections?.map((section) => (
                <div key={section.year}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#A1A1AA]">{section.year} seasonal offers</p>
                    <button type="button" onClick={() => openNewOffer(section.year)} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1e82b4] hover:text-[#18181B]">
                      <Plus className="w-3 h-3" /> Add offer
                    </button>
                  </div>
                  <div className="grid gap-2">
                    {section.offers.map((offer) => (
                      <div key={offer.id} className="flex items-center justify-between gap-3 rounded-xl border border-[#F4F4F5] px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-semibold text-[#18181B]">{offer.name}</p>
                          <p className="truncate text-[11px] text-[#71717A]">{offer.badge}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button" onClick={() => openExistingOffer(offer, section.year)} className="p-1.5 rounded-md text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#1e82b4]" title="Edit offer"><Pencil className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => deleteOffer(offer, section.year)} className="p-1.5 rounded-md text-[#71717A] hover:bg-[#F4F4F5] hover:text-red-500" title="Delete offer"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => openNewOffer(String(new Date().getFullYear()))}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#71717A] hover:text-[#1e82b4]"
              >
                <Plus className="w-3 h-3" /> Add seasonal offer for {new Date().getFullYear()}
              </button>
            </div>
            {saveError && <p className="text-[12px] text-red-500 mt-3">{saveError}</p>}
          </section>
        )}

        {offerFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18181B]/35 p-4">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-[#E4E4E7]">
              <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[#F4F4F5] bg-white px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1e82b4]">
                    {offerForm.id ? "Edit offer" : editingSection === "always" ? "New always-on offer" : `New ${editingSection} offer`}
                  </p>
                  <p className="text-[11px] text-[#71717A] mt-1">Use one line per price, schedule item, or condition.</p>
                </div>
                <button type="button" onClick={() => setOfferFormOpen(false)} className="rounded-lg p-1.5 text-[#71717A] hover:bg-[#F4F4F5] hover:text-[#18181B]" title="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid gap-4 p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    ["name", "Offer name", "e.g. Summer return offer"],
                    ["badge", "Badge", "e.g. Limited time"],
                    ["validity", "Validity", "e.g. 1 Jun – 30 Sep 2026"],
                    ["hook", "Content hook", "e.g. Stay longer for the same price"],
                  ] as const).map(([key, label, placeholder]) => (
                    <label key={key} className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#71717A]">
                      {label}
                      <input
                        value={offerForm[key]}
                        onChange={(event) => setOfferForm({ ...offerForm, [key]: event.target.value })}
                        placeholder={placeholder}
                        className="mt-1.5 block w-full rounded-xl border border-[#E4E4E7] px-3 py-2.5 text-[13px] font-normal normal-case tracking-normal text-[#18181B] focus:outline-none focus:border-[#1e82b4]"
                      />
                    </label>
                  ))}
                </div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#71717A]">
                  Badge colour
                  <div className="mt-1.5 flex items-center gap-2">
                    <input type="color" value={offerForm.badgeColor} onChange={(event) => setOfferForm({ ...offerForm, badgeColor: event.target.value })} className="h-10 w-12 rounded-lg border border-[#E4E4E7] bg-white p-1" />
                    <input value={offerForm.badgeColor} onChange={(event) => setOfferForm({ ...offerForm, badgeColor: event.target.value })} className="flex-1 rounded-xl border border-[#E4E4E7] px-3 py-2.5 text-[13px] font-normal normal-case tracking-normal text-[#18181B] focus:outline-none focus:border-[#1e82b4]" />
                  </div>
                </label>
                <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#71717A]">
                  Description
                  <textarea value={offerForm.description} onChange={(event) => setOfferForm({ ...offerForm, description: event.target.value })} rows={2} className="mt-1.5 block w-full rounded-xl border border-[#E4E4E7] px-3 py-2.5 text-[13px] font-normal normal-case tracking-normal text-[#18181B] focus:outline-none focus:border-[#1e82b4] resize-y" />
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#71717A]">
                    Prices
                    <textarea value={offerForm.prices} onChange={(event) => setOfferForm({ ...offerForm, prices: event.target.value })} rows={5} className="mt-1.5 block w-full rounded-xl border border-[#E4E4E7] px-3 py-2.5 text-[13px] font-normal normal-case tracking-normal text-[#18181B] focus:outline-none focus:border-[#1e82b4] resize-y" />
                    <span className="block mt-1 text-[10px] font-normal normal-case tracking-normal text-[#A1A1AA]">Format: label | value | icon. Icons: Users, Car, Bike, Truck.</span>
                  </label>
                  <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#71717A]">
                    Schedule
                    <textarea value={offerForm.schedule} onChange={(event) => setOfferForm({ ...offerForm, schedule: event.target.value })} rows={5} placeholder="Departs | Saturday 20:30" className="mt-1.5 block w-full rounded-xl border border-[#E4E4E7] px-3 py-2.5 text-[13px] font-normal normal-case tracking-normal text-[#18181B] focus:outline-none focus:border-[#1e82b4] resize-y" />
                    <span className="block mt-1 text-[10px] font-normal normal-case tracking-normal text-[#A1A1AA]">Format: label | value.</span>
                  </label>
                </div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#71717A]">
                  Conditions
                  <textarea value={offerForm.notes} onChange={(event) => setOfferForm({ ...offerForm, notes: event.target.value })} rows={3} placeholder="One condition per line" className="mt-1.5 block w-full rounded-xl border border-[#E4E4E7] px-3 py-2.5 text-[13px] font-normal normal-case tracking-normal text-[#18181B] focus:outline-none focus:border-[#1e82b4] resize-y" />
                </label>
                <div className="flex items-center justify-end gap-2 border-t border-[#F4F4F5] pt-4">
                  <button type="button" onClick={() => setOfferFormOpen(false)} className="rounded-lg border border-[#E4E4E7] px-3 py-2 text-[12px] font-semibold text-[#71717A] hover:text-[#18181B]">Cancel</button>
                  <button type="button" onClick={saveOfferToDraft} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1e82b4] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#18181B]">
                    <Save className="w-3.5 h-3.5" /> Save offer to draft
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Sticky section nav ────────────────────────────────────── */}
        {sections.length > 1 && (
          <nav className="sticky top-0 z-20 -mx-6 md:-mx-10 px-6 md:px-10 py-3 mb-10 bg-[#F5F5F5]/80 backdrop-blur-md border-b border-[#FAFAFA]">
            <ul className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {sections.map((s) => {
                const active = activeId === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => scrollTo(s.id)}
                      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium tracking-[-0.005em] transition-colors whitespace-nowrap ${
                        active
                          ? "text-[#18181B] bg-[#FFFFFF] border border-[#E4E4E7]"
                          : "text-[#71717A] hover:text-[#27272A] border border-transparent"
                      }`}
                    >
                      <span className={`text-[10px] num-tabular ${active ? "text-[var(--brand-primary)]" : "text-[#3F3F46]"}`}>
                        {s.num}
                      </span>
                      {s.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {!hasAnyOffers && displayOffers.notes.length === 0 ? (
          <div className={`${card} p-6`}>
            <EmptySection
              title="Offers not configured yet"
              message="Add current offer cards (price, validity, hook, schedule, notes) for this brand and they will appear here."
            />
          </div>
        ) : (
          <div className="space-y-14">

            {/* ─── Always-on offers ────────────────────────────────── */}
            {totalGeneral > 0 && (
              <section ref={(el) => { sectionRefs.current["always-on"] = el; }} id="always-on">
                <SectionHead id="always-on-h" num="01" title="Always-on" Icon={Repeat} />
                <div className="space-y-3">
                  {displayOffers.offers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      onEdit={editorOpen ? () => openExistingOffer(offer, "always") : undefined}
                      onDelete={editorOpen ? () => deleteOffer(offer, "always") : undefined}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ─── Year-grouped seasonal offers ────────────────────── */}
            {displayOffers.yearSections?.map((ys, i) => {
              const sectionId = `year-${ys.year}`;
              const num = String((totalGeneral > 0 ? 1 : 0) + i + 1).padStart(2, "0");
              return (
                <section key={ys.year} ref={(el) => { sectionRefs.current[sectionId] = el; }} id={sectionId}>
                  <SectionHead id={`${sectionId}-h`} num={num} title={`${ys.year} Season`} Icon={CalendarDays} />
                  <div className="space-y-3">
                    {ys.offers.map((offer) => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        onEdit={editorOpen ? () => openExistingOffer(offer, ys.year) : undefined}
                        onDelete={editorOpen ? () => deleteOffer(offer, ys.year) : undefined}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            {/* ─── Writing strategy ────────────────────────────────── */}
            {displayOffers.notes.length > 0 && (() => {
              const sectionId = "strategy";
              const num = String(sections.find(s => s.id === "strategy")?.num ?? "").padStart(2, "0");
              return (
                <section ref={(el) => { sectionRefs.current[sectionId] = el; }} id={sectionId}>
                  <SectionHead id="strategy-h" num={num} title="Strategy" Icon={Sparkles} />

                  {/* Collapsible accordion */}
                  <div className={`${card} overflow-hidden`}>
                    <button
                      onClick={() => setStrategyOpen((o) => !o)}
                      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[#FAFAFA] transition-colors text-left"
                    >
                      <span className="text-[12px] font-medium text-[#27272A]">Writing offer content</span>
                      <ChevronDown
                        className={cn("w-3.5 h-3.5 text-[#A1A1AA] transition-transform duration-200", strategyOpen && "rotate-180")}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {strategyOpen && (
                        <motion.div
                          key="strategy-body"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          {(() => {
                            // Group notes by their `group` field; ungrouped notes first
                            const ungrouped = displayOffers.notes.filter(n => !n.group);
                            const groups = displayOffers.notes.reduce<Record<string, typeof displayOffers.notes>>((acc, n) => {
                              if (!n.group) return acc;
                              acc[n.group] = acc[n.group] ?? [];
                              acc[n.group].push(n);
                              return acc;
                            }, {});
                            return (
                              <div className="px-4 pb-4 pt-1 border-t border-[#F4F4F5] space-y-4">
                                {ungrouped.length > 0 && (
                                  <div className="grid sm:grid-cols-2 gap-2 pt-3">
                                    {ungrouped.map((note) => (
                                      <div key={note.title} className={`${cardHover} p-3.5`}>
                                        <div className="flex items-center gap-2 mb-1">
                                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: note.color }} />
                                          <p className="text-[12px] font-medium text-[#27272A]">{note.title}</p>
                                        </div>
                                        <p className="text-[12px] text-[#71717A] font-light leading-relaxed">{note.body}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {Object.entries(groups).map(([groupName, groupNotes]) => (
                                  <div key={groupName}>
                                    <div className="flex items-center gap-3 my-2">
                                      <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A1A1AA]">{groupName}</span>
                                      <span className="flex-1 h-px bg-[#E4E4E7]" />
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-2">
                                      {groupNotes.map((note) => (
                                        <div key={note.title} className={`${cardHover} p-3.5`}>
                                          <div className="flex items-center gap-2 mb-1">
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: note.color }} />
                                            <p className="text-[12px] font-medium text-[#27272A]">{note.title}</p>
                                          </div>
                                          <p className="text-[12px] text-[#71717A] font-light leading-relaxed">{note.body}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </section>
              );
            })()}

          </div>
        )}
      </motion.div>
    </div>
  );
}
