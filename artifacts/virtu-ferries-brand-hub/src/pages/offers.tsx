import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Tag, Clock, ArrowLeftRight, Users, Car, Bike, Truck,
  RefreshCw, CalendarDays, ChevronDown, Repeat, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";
import type { Offer } from "@/lib/brand-content";

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

function OfferCard({ offer }: { offer: Offer }) {
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
            <p className="text-[14px] font-semibold text-[#18181B] tracking-[-0.01em]">{offer.name}</p>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Offers() {
  const { offers } = useBrandContent();
  const [strategyOpen, setStrategyOpen] = useState(false);

  const totalGeneral = offers.offers.length;
  const totalSeasonal = offers.yearSections?.reduce((acc, s) => acc + s.offers.length, 0) ?? 0;
  const totalOffers = totalGeneral + totalSeasonal;
  const hasAnyOffers = totalOffers > 0;

  // Build section list dynamically
  const sections: SectionDef[] = [];
  if (totalGeneral > 0) sections.push({ id: "always-on", num: "01", title: "Always-on", Icon: Repeat });
  if ((offers.yearSections?.length ?? 0) > 0) {
    offers.yearSections!.forEach((ys, i) => {
      sections.push({
        id: `year-${ys.year}`,
        num: String(sections.length + 1).padStart(2, "0"),
        title: `${ys.year} Season`,
        Icon: CalendarDays,
      });
    });
  }
  if (offers.notes.length > 0) {
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
          <h1 className="text-[26px] md:text-[28px] font-semibold tracking-[-0.02em] text-[#18181B]">
            Offers
          </h1>
          <p className="mt-2 text-[13px] text-[#71717A] font-light max-w-xl">
            {offers.headerSubtitle}
          </p>

          {/* Stat strip */}
          {hasAnyOffers && (
            <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2">
              {totalOffers > 0 && <StatPill value={totalOffers} label={totalOffers === 1 ? "offer" : "offers"} />}
              {totalSeasonal > 0 && <StatPill value={totalSeasonal} label="seasonal" />}
              {(offers.yearSections?.length ?? 0) > 0 && (
                <StatPill value={offers.yearSections!.map(s => s.year).join(", ")} label="season" />
              )}
            </div>
          )}

          {/* Freshness reminder */}
          <div className="mt-4 flex items-center gap-1.5 text-[11px] text-amber-600">
            <RefreshCw className="w-3 h-3 shrink-0" />
            Update this page at the start of each month
          </div>
        </header>

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

        {!hasAnyOffers && offers.notes.length === 0 ? (
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
                  {offers.offers.map((offer) => (
                    <OfferCard key={offer.id} offer={offer} />
                  ))}
                </div>
              </section>
            )}

            {/* ─── Year-grouped seasonal offers ────────────────────── */}
            {offers.yearSections?.map((ys, i) => {
              const sectionId = `year-${ys.year}`;
              const num = String((totalGeneral > 0 ? 1 : 0) + i + 1).padStart(2, "0");
              return (
                <section key={ys.year} ref={(el) => { sectionRefs.current[sectionId] = el; }} id={sectionId}>
                  <SectionHead id={`${sectionId}-h`} num={num} title={`${ys.year} Season`} Icon={CalendarDays} />
                  <div className="space-y-3">
                    {ys.offers.map((offer) => (
                      <OfferCard key={offer.id} offer={offer} />
                    ))}
                  </div>
                </section>
              );
            })}

            {/* ─── Writing strategy ────────────────────────────────── */}
            {offers.notes.length > 0 && (() => {
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
                          <div className="grid sm:grid-cols-2 gap-2 px-4 pb-4 pt-1 border-t border-[#F4F4F5]">
                            {offers.notes.map((note) => (
                              <div key={note.title} className={`${cardHover} p-3.5`}>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: note.color }} />
                                  <p className="text-[12px] font-medium text-[#27272A]">{note.title}</p>
                                </div>
                                <p className="text-[12px] text-[#71717A] font-light leading-relaxed">{note.body}</p>
                              </div>
                            ))}
                          </div>
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
