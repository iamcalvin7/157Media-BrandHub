import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi, Crown, Coffee, Tv, Wind, Anchor, Sparkles, Armchair, Utensils,
  ChevronDown, Ship, UtensilsCrossed, Leaf, CheckCircle2, Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";
import type { OnboardSection, MenuCategory } from "@workspace/brand-knowledge";

const ICON_MAP: Record<OnboardSection["iconName"], LucideIcon> = {
  Wifi, Crown, Coffee, Tv, Wind, Anchor, Sparkles, Armchair, Utensils,
};

const card = "bg-[#FFFFFF] border border-[#F4F4F5] rounded-xl";
const AMBER = "#f6a610";

// ─── Section nav heading ───────────────────────────────────────────────────────

function SectionHead({ num, title, Icon }: { num: string; title: string; Icon: LucideIcon }) {
  return (
    <header className="flex items-center gap-3 mb-4">
      <span className="text-[10px] font-medium tracking-[0.18em] text-[#A1A1AA] num-tabular">{num}</span>
      <span className="h-px w-6 bg-[#E4E4E7]" />
      <Icon className="w-3 h-3 text-[#A1A1AA]" />
      <h2 className="text-[13px] font-medium text-[#27272A] tracking-[-0.005em]">{title}</h2>
    </header>
  );
}

// ─── Group divider ─────────────────────────────────────────────────────────────

function GroupLabel({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Icon className="w-3.5 h-3.5 text-[#A1A1AA]" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#A1A1AA]">{label}</span>
      <span className="flex-1 h-px bg-[#E4E4E7]" />
    </div>
  );
}

// ─── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[15px] font-semibold text-[#18181B] num-tabular tracking-[-0.01em]">{value}</span>
      <span className="text-[11px] text-[#71717A] font-light">{label}</span>
    </div>
  );
}

// ─── Club Class premium section ────────────────────────────────────────────────

function ClubClassSection({ section }: { section: OnboardSection }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl overflow-hidden border border-[#f6a61030]"
      style={{ background: "linear-gradient(145deg, #fffdf5 0%, #ffffff 60%)" }}
    >
      {/* Top accent bar */}
      <div className="h-[4px]" style={{ background: `linear-gradient(90deg, ${AMBER}, #fcd97a)` }} />

      <div className="p-6 md:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${AMBER}18`, color: AMBER }}
            >
              <Crown className="w-5 h-5" />
            </span>
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-0.5"
                style={{ color: AMBER }}
              >
                Premium Class
              </p>
              <h2 className="text-[18px] font-bold text-[#18181B] tracking-[-0.02em]">Club Class</h2>
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full shrink-0"
            style={{ backgroundColor: `${AMBER}12`, color: AMBER }}
          >
            <Zap className="w-3 h-3" />
            Upgrade available on board
          </span>
        </div>

        {/* Intro */}
        {section.intro && (
          <p className="text-[13px] text-[#3F3F46] leading-relaxed font-light border-l-2 pl-4" style={{ borderColor: AMBER }}>
            {section.intro}
          </p>
        )}

        {/* Benefits grid */}
        {section.bullets && section.bullets.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#A1A1AA] mb-3">What's included</p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {section.bullets.map((b, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="flex items-start gap-3 rounded-xl p-3.5 border border-[#F4F4F5] bg-white hover:border-[#f6a61030] hover:bg-[#fffdf5] transition-colors"
                >
                  <CheckCircle2
                    className="w-4 h-4 shrink-0 mt-0.5"
                    style={{ color: AMBER }}
                  />
                  <span className="text-[12px] text-[#27272A] leading-snug">{b}</span>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {section.notes && section.notes.length > 0 && (
          <div className="space-y-2.5 pt-1">
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#A1A1AA]">Copywriting notes</p>
            {section.notes.map((n, i) => (
              <div
                key={i}
                className="rounded-xl px-4 py-3 border-l-[3px]"
                style={{ borderColor: AMBER, backgroundColor: `${AMBER}08` }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] mb-1" style={{ color: AMBER }}>
                  {n.label}
                </p>
                <p className="text-[12px] text-[#3F3F46] font-light leading-relaxed">{n.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Standard section card ─────────────────────────────────────────────────────

function SectionCard({ section, index }: { section: OnboardSection; index: number }) {
  const Icon = ICON_MAP[section.iconName] ?? Anchor;
  const [notesOpen, setNotesOpen] = useState(false);
  const hasBullets = (section.bullets?.length ?? 0) > 0;
  const hasNotes = (section.notes?.length ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      className={`${card} overflow-hidden`}
    >
      <div className="h-[3px]" style={{ backgroundColor: section.accent }} />
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-2.5">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${section.accent}12`, color: section.accent }}
          >
            <Icon className="w-3.5 h-3.5" />
          </span>
          <p className="text-[14px] font-semibold text-[#18181B] tracking-[-0.01em]">{section.title}</p>
        </div>

        {section.intro && (
          <p className="text-[12px] text-[#71717A] font-light leading-relaxed">{section.intro}</p>
        )}

        {hasBullets && (
          <ul className="space-y-1.5">
            {section.bullets!.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-[#52525B] font-light leading-relaxed">
                <span className="mt-[5px] w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: section.accent }} />
                {b}
              </li>
            ))}
          </ul>
        )}

        {hasNotes && (
          <div className={`${card} overflow-hidden`}>
            <button
              type="button"
              onClick={() => setNotesOpen(o => !o)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-[#FAFAFA] transition-colors text-left"
            >
              <span className="text-[11px] font-medium text-[#27272A]">
                Notes &amp; details
                <span className="ml-1.5 text-[10px] text-[#A1A1AA] num-tabular font-normal">{section.notes!.length}</span>
              </span>
              <ChevronDown className={cn("w-3.5 h-3.5 text-[#A1A1AA] transition-transform duration-200", notesOpen && "rotate-180")} />
            </button>
            <AnimatePresence initial={false}>
              {notesOpen && (
                <motion.div
                  key="notes-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="divide-y divide-[#FAFAFA] border-t border-[#F4F4F5]">
                    {section.notes!.map((n, i) => (
                      <div key={i} className="px-3.5 py-2.5 hover:bg-[#FAFAFA] transition-colors">
                        <p className="text-[10px] uppercase tracking-[0.16em] font-medium mb-0.5" style={{ color: section.accent }}>
                          {n.label}
                        </p>
                        <p className="text-[12px] text-[#52525B] font-light leading-relaxed">{n.body}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Menu category card ────────────────────────────────────────────────────────

function MenuCategoryCard({ category, index }: { category: MenuCategory; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.25, delay: index * 0.03 }}
      className={`${card} overflow-hidden`}
    >
      <div className="px-4 py-2.5 border-b border-[#F4F4F5]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#52525B]">{category.name}</p>
      </div>
      <div className="divide-y divide-[#FAFAFA]">
        {category.items.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-[#FAFAFA] transition-colors">
            <span className="text-[12px] text-[#3F3F46] font-light flex items-center gap-1.5">
              {item.name}
              {item.veg && <Leaf className="w-3 h-3 text-emerald-500 shrink-0" />}
            </span>
            <span className="text-[12px] font-semibold text-[#18181B] num-tabular shrink-0">{item.price}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function OnboardExperience() {
  const { onboardExperience } = useBrandContent();
  const { headerKicker, headerSubtitle, sections, menu, footer } = onboardExperience;

  const clubClassSection = sections.find(s => s.id === "club-class");
  const amenitySections  = sections.filter(s => (s.group ?? "amenity") === "amenity" && s.id !== "club-class");
  const vesselSections   = sections.filter(s => s.group === "vessel");
  const totalBullets     = sections.reduce((acc, s) => acc + (s.bullets?.length ?? 0), 0);

  // Sticky nav — Club Class first, then other amenities, then vessel
  const navSections = [
    ...(clubClassSection ? [clubClassSection] : []),
    ...amenitySections,
    ...vesselSections,
  ];
  const [activeId, setActiveId] = useState<string>(navSections[0]?.id ?? "");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    if (navSections.length <= 1) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [navSections.length]);

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
            {headerKicker}
          </div>
          <h1 className="text-[26px] md:text-[28px] font-semibold tracking-[-0.02em] text-[#18181B]">
            Onboard Experience
          </h1>
          <p className="mt-2 text-[13px] text-[#71717A] font-light max-w-xl">{headerSubtitle}</p>
          {sections.length > 0 && (
            <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2">
              {amenitySections.length > 0 && (
                <StatPill value={amenitySections.length} label="amenities" />
              )}
              {vesselSections.length > 0 && (
                <StatPill value={vesselSections.length} label="boarding section" />
              )}
              {totalBullets > 0 && <StatPill value={totalBullets} label="features" />}
            </div>
          )}
        </header>

        {/* ─── Sticky section nav ────────────────────────────────────── */}
        {navSections.length > 1 && (
          <nav className="sticky top-0 z-20 -mx-6 md:-mx-10 px-6 md:px-10 py-3 mb-10 bg-[#F5F5F5]/80 backdrop-blur-md border-b border-[#FAFAFA]">
            <ul className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {navSections.map((s, i) => {
                const Icon = ICON_MAP[s.iconName] ?? Anchor;
                const active = activeId === s.id;
                const num = String(i + 1).padStart(2, "0");
                const isClub = s.id === "club-class";
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => scrollTo(s.id)}
                      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium tracking-[-0.005em] transition-colors whitespace-nowrap ${
                        active
                          ? isClub
                            ? "text-[#18181B] bg-[#fffdf5] border border-[#f6a61040]"
                            : "text-[#18181B] bg-[#FFFFFF] border border-[#E4E4E7]"
                          : "text-[#71717A] hover:text-[#27272A] border border-transparent"
                      }`}
                    >
                      <span className={`text-[10px] num-tabular ${active ? (isClub ? "text-[#f6a610]" : "text-[var(--brand-primary)]") : "text-[#A1A1AA]"}`}>
                        {num}
                      </span>
                      {isClub && <Crown className="w-3 h-3 text-[#f6a610]" />}
                      {s.title.split(" — ")[0]}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        {/* ─── Content ──────────────────────────────────────────────── */}
        {sections.length === 0 ? (
          <div className={`${card} p-6`}>
            <EmptySection
              title="Onboard experience not configured yet"
              message="Add the brand's connectivity, premium tiers, comfort, and food & drink amenities and they will appear here."
            />
          </div>
        ) : (
          <div className="space-y-16">

            {/* ── Club Class — featured ─────────────────────────────── */}
            {clubClassSection && (
              <div>
                <GroupLabel icon={Crown} label="Premium Class" />
                <section
                  id={clubClassSection.id}
                  ref={(el) => { sectionRefs.current[clubClassSection.id] = el; }}
                >
                  <ClubClassSection section={clubClassSection} />
                </section>
              </div>
            )}

            {/* ── Onboard Amenities ─────────────────────────────────── */}
            {amenitySections.length > 0 && (
              <div>
                <GroupLabel icon={Sparkles} label="Onboard Amenities" />
                <div className="space-y-14">
                  {amenitySections.map((section, i) => {
                    const Icon = ICON_MAP[section.iconName] ?? Anchor;
                    const num = String((clubClassSection ? 1 : 0) + i + 1).padStart(2, "0");
                    return (
                      <section
                        key={section.id}
                        id={section.id}
                        ref={(el) => { sectionRefs.current[section.id] = el; }}
                      >
                        <SectionHead num={num} title={section.title} Icon={Icon} />
                        <SectionCard section={section} index={i} />

                        {section.id === "cafeterias-bars" && menu && menu.categories.length > 0 && (
                          <div className="mt-6">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-[#A1A1AA] font-medium mb-3">Full Menu — {menu.vesselName}</p>
                            <div className="grid sm:grid-cols-2 gap-3">
                              {menu.categories.map((cat, ci) => (
                                <MenuCategoryCard key={cat.name} category={cat} index={ci} />
                              ))}
                            </div>
                            <p className="mt-3 text-[10px] text-[#A1A1AA] font-light">
                              Source: <a href="https://www.virtuferries.com/snacks-and-drinks/27" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#71717A] transition-colors">virtuferries.com/snacks-and-drinks</a> — verify before publishing prices.
                            </p>
                          </div>
                        )}
                      </section>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Boarding & Vessel ─────────────────────────────────── */}
            {vesselSections.length > 0 && (
              <div>
                <GroupLabel icon={Ship} label="Boarding & Vessel" />
                <div className="space-y-14">
                  {vesselSections.map((section, i) => {
                    const Icon = ICON_MAP[section.iconName] ?? Anchor;
                    const num = String((clubClassSection ? 1 : 0) + amenitySections.length + i + 1).padStart(2, "0");
                    return (
                      <section
                        key={section.id}
                        id={section.id}
                        ref={(el) => { sectionRefs.current[section.id] = el; }}
                      >
                        <SectionHead num={num} title={section.title} Icon={Icon} />
                        <SectionCard section={section} index={amenitySections.length + i} />
                      </section>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        )}

        {footer && (
          <p className="mt-10 text-[11px] text-[#A1A1AA] font-light border-t border-[#E4E4E7] pt-4 leading-relaxed italic">
            {footer}
          </p>
        )}
      </motion.div>
    </div>
  );
}
