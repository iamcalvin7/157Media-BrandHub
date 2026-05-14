import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import { Facebook, Instagram, Hash, Share2, Users, Clock, Compass, Mic2, Repeat, CalendarClock, CalendarDays, Flower2, Sun, Leaf, Snowflake } from "lucide-react";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";
import type { LucideIcon } from "lucide-react";

const PLATFORM_ICONS = { Facebook, Instagram, Tiktok: Share2, Linkedin: Share2 } as const;

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

function StatPill({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[15px] font-semibold text-[#18181B] num-tabular tracking-[-0.01em]">{value}</span>
      <span className="text-[11px] text-[#71717A] font-light">{label}</span>
    </div>
  );
}

const card = "bg-[#FFFFFF] border border-[#F4F4F5] rounded-xl";
const cardHover = "bg-[#FFFFFF] border border-[#F4F4F5] hover:border-[#E4E4E7] rounded-xl transition-colors";

export default function SocialMedia() {
  const { socialMedia } = useBrandContent();
  const hasAnyContent =
    socialMedia.markets.length || socialMedia.pillars.length || socialMedia.registers.length;

  // Build the section list dynamically based on what content exists
  const sections: SectionDef[] = [];
  if (socialMedia.markets.length > 0) sections.push({ id: "platforms", num: "01", title: "Platforms", Icon: Share2 });
  if (socialMedia.markets.some(m => m.platforms.some(p => p.cadence))) sections.push({ id: "cadence", num: "02", title: "Cadence", Icon: Clock });
  if (socialMedia.pillars.length > 0) sections.push({ id: "pillars", num: "03", title: "Pillars", Icon: Compass });
  if (socialMedia.registers.length > 0) sections.push({ id: "tone", num: "04", title: "Tone", Icon: Mic2 });
  if (socialMedia.recurringPosts && socialMedia.recurringPosts.length > 0) sections.push({ id: "recurring", num: "05", title: "Recurring", Icon: CalendarClock });
  if (socialMedia.seasonalThemes && socialMedia.seasonalThemes.length > 0) sections.push({ id: "seasonal", num: "06", title: "Seasonal", Icon: CalendarDays });
  if (socialMedia.crossPosting) sections.push({ id: "cross", num: "07", title: "Cross-posting", Icon: Repeat });

  const totalPlatforms = socialMedia.markets.reduce((acc, m) => acc + m.platforms.length, 0);

  // Active-section tracking via IntersectionObserver
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
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
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
        {/* ─── Hero ──────────────────────────────────────────────────── */}
        <header className="mb-8">
          <div className="flex items-center gap-2 mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[#A1A1AA]">
            <span className="h-1 w-1 rounded-full" style={{ background: "var(--brand-primary)" }} />
            Strategy
          </div>
          <h1 className="text-[26px] md:text-[28px] font-semibold tracking-[-0.02em] text-[#18181B]">
            Social media
          </h1>
          <p className="mt-2 text-[13px] text-[#71717A] font-light max-w-xl">
            Where we publish, how often, and how we sound.
          </p>

          {/* Stat strip — instant orientation */}
          {hasAnyContent && (
            <div className="mt-5 flex flex-wrap items-baseline gap-x-5 gap-y-2">
              {socialMedia.markets.length > 0 && <StatPill value={socialMedia.markets.length} label={socialMedia.markets.length === 1 ? "market" : "markets"} />}
              {totalPlatforms > 0 && <StatPill value={totalPlatforms} label="accounts" />}
              {socialMedia.pillars.length > 0 && <StatPill value={socialMedia.pillars.length} label="pillars" />}
              {socialMedia.registers.length > 0 && <StatPill value={socialMedia.registers.length} label="tone registers" />}
              {socialMedia.recurringPosts && socialMedia.recurringPosts.length > 0 && <StatPill value={socialMedia.recurringPosts.length} label="recurring slots" />}
            </div>
          )}
        </header>

        {/* ─── Sticky section nav ────────────────────────────────────── */}
        {sections.length > 0 && (
          <nav className="sticky top-0 z-20 -mx-6 md:-mx-10 px-6 md:px-10 py-3 mb-10 bg-[#F5F5F5]/80 backdrop-blur-md border-b border-[#FAFAFA]">
            <ul className="flex items-center gap-1 overflow-x-auto scrollbar-none">
              {sections.map((s) => {
                const active = activeId === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => scrollTo(s.id)}
                      className={`group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium tracking-[-0.005em] transition-colors whitespace-nowrap ${
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

        {!hasAnyContent && (
          <div className={`${card} p-6`}>
            <EmptySection
              title="Not configured yet"
              message="Add markets, platforms, pillars, and tone registers."
            />
          </div>
        )}

        <div className="space-y-14">
          {/* ─── Platforms ──────────────────────────────────────────── */}
          {socialMedia.markets.length > 0 && (
            <section ref={(el) => { sectionRefs.current.platforms = el; }} id="platforms">
              <SectionHead id="platforms-h" num="01" title="Platforms" Icon={Share2} />
              <div className="grid md:grid-cols-2 gap-3">
                {socialMedia.markets.map((mkt) => (
                  <div key={mkt.market} className={`${cardHover} p-4`}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-2.5 h-2.5 text-[#A1A1AA]" />
                        <p className="text-[10px] text-[#71717A] uppercase tracking-[0.18em] font-medium">{mkt.market}</p>
                      </div>
                      <span className="text-[10px] text-[#3F3F46] num-tabular">{mkt.platforms.length} ch</span>
                    </div>
                    <p className="text-[13px] text-[#71717A] font-light leading-snug">{mkt.audience}</p>
                    <p className="text-[12px] text-[#A1A1AA] font-light mt-0.5">{mkt.frame}</p>
                    {mkt.note && (
                      <p
                        className="text-[11px] mt-2.5 leading-relaxed pl-2 border-l"
                        style={{ color: "var(--brand-primary)", borderColor: "color-mix(in srgb, var(--brand-primary) 30%, transparent)" }}
                      >
                        {mkt.note}
                      </p>
                    )}
                    <div className="space-y-1.5 mt-3 pt-3 border-t border-[#F4F4F5]">
                      {mkt.platforms.map((platform) => {
                        const Icon = PLATFORM_ICONS[platform.iconName] ?? Share2;
                        return (
                          <div key={platform.name} className="flex items-center gap-2.5">
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${platform.colorClass}`} />
                            <p className="text-[12px] font-medium text-[#27272A] min-w-[68px]">{platform.name}</p>
                            <p className="text-[11px] truncate font-light" style={{ color: "var(--brand-primary)" }}>{platform.handle}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── Cadence — proper 3-col data grid ──────────────────── */}
          {sections.find(s => s.id === "cadence") && (() => {
            const rows: { channel: string; iconName: keyof typeof PLATFORM_ICONS; colorClass: string; market: string; handle: string; cadence: string; isFirstOfChannel: boolean }[] = [];
            const byChannel = new Map<string, { iconName: keyof typeof PLATFORM_ICONS; colorClass: string; entries: { market: string; handle: string; cadence: string }[] }>();
            for (const mkt of socialMedia.markets) {
              for (const p of mkt.platforms) {
                if (!p.cadence) continue;
                const slot = byChannel.get(p.name) ?? { iconName: p.iconName, colorClass: p.colorClass, entries: [] };
                slot.entries.push({ market: mkt.market, handle: p.handle, cadence: p.cadence });
                byChannel.set(p.name, slot);
              }
            }
            for (const [channel, info] of byChannel.entries()) {
              info.entries.forEach((e, i) => {
                rows.push({ channel, iconName: info.iconName, colorClass: info.colorClass, market: e.market, handle: e.handle, cadence: e.cadence, isFirstOfChannel: i === 0 });
              });
            }
            return (
              <section ref={(el) => { sectionRefs.current.cadence = el; }} id="cadence">
                <SectionHead id="cadence-h" num="02" title="Cadence" Icon={Clock} />
                <div className={`${card} overflow-hidden`}>
                  {/* Column header */}
                  <div className="grid grid-cols-[120px_1fr_auto] gap-4 px-4 py-2 border-b border-[#F4F4F5] bg-[#F5F5F5]">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#A1A1AA] font-medium">Channel</span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#A1A1AA] font-medium">Market</span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#A1A1AA] font-medium text-right">Cadence</span>
                  </div>
                  <div className="divide-y divide-[#FAFAFA]">
                    {rows.map((r, i) => {
                      const Icon = PLATFORM_ICONS[r.iconName] ?? Share2;
                      return (
                        <div key={`${r.channel}-${r.market}-${i}`} className={`grid grid-cols-[120px_1fr_auto] gap-4 px-4 py-2.5 items-center hover:bg-[#F4F4F5] transition-colors ${r.isFirstOfChannel ? "" : ""}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            {r.isFirstOfChannel ? (
                              <>
                                <Icon className={`w-3.5 h-3.5 shrink-0 ${r.colorClass}`} />
                                <span className="text-[12px] font-medium text-[#27272A] truncate">{r.channel}</span>
                              </>
                            ) : (
                              <span className="text-[12px] text-[#3F3F46] pl-5">↳</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] text-[#A1A1AA] font-light truncate">{r.market}</p>
                            <p className="text-[10px] truncate font-light" style={{ color: "var(--brand-primary)" }}>{r.handle}</p>
                          </div>
                          <span className="text-[12px] text-[#27272A] font-medium num-tabular text-right whitespace-nowrap">{r.cadence}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            );
          })()}

          {/* ─── Pillars ────────────────────────────────────────────── */}
          {socialMedia.pillars.length > 0 && (
            <section ref={(el) => { sectionRefs.current.pillars = el; }} id="pillars">
              <SectionHead id="pillars-h" num="03" title="Pillars" Icon={Compass} />
              <div className="grid sm:grid-cols-2 gap-2">
                {socialMedia.pillars.map((pillar) => (
                  <div key={pillar.number} className={`${cardHover} group p-3.5 flex items-start gap-3 relative overflow-hidden`}>
                    <span
                      className="absolute left-0 top-0 bottom-0 w-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "var(--brand-primary)" }}
                    />
                    <span
                      className="text-[11px] font-medium leading-none pt-0.5 num-tabular shrink-0 w-5"
                      style={{ color: "var(--brand-primary)" }}
                    >
                      {String(pillar.number).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-[13px] font-medium text-[#27272A] tracking-[-0.005em] mb-0.5">{pillar.title}</p>
                      <p className="text-[12px] text-[#71717A] font-light leading-relaxed">{pillar.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── Tone Registers ─────────────────────────────────────── */}
          {socialMedia.registers.length > 0 && (
            <section ref={(el) => { sectionRefs.current.tone = el; }} id="tone">
              <SectionHead id="tone-h" num="04" title="Tone" Icon={Mic2} />
              <div className={`${card} divide-y divide-[#FAFAFA]`}>
                {socialMedia.registers.map((reg) => (
                  <div key={reg.label} className="flex flex-col sm:flex-row gap-3 px-4 py-3 hover:bg-[#F4F4F5] transition-colors">
                    <div className="sm:w-36 shrink-0 flex items-center gap-2">
                      <span
                        className="block w-2 h-2 rounded-full shrink-0"
                        style={{ background: reg.color, boxShadow: `0 0 8px ${reg.color}80` }}
                      />
                      <p className="text-[12px] font-medium text-[#27272A]">{reg.label}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-[12px] text-[#A1A1AA] font-light leading-relaxed">{reg.desc}</p>
                      <p className="text-[12px] text-[#A1A1AA] font-light italic mt-0.5">"{reg.example}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── Recurring ──────────────────────────────────────────── */}
          {socialMedia.recurringPosts && socialMedia.recurringPosts.length > 0 && (
            <section ref={(el) => { sectionRefs.current.recurring = el; }} id="recurring">
              <SectionHead id="recurring-h" num="05" title="Recurring" Icon={CalendarClock} />
              <div className={`${card} divide-y divide-[#FAFAFA]`}>
                {socialMedia.recurringPosts.map((r, i) => (
                  <div key={`${r.title}-${i}`} className="px-4 py-3 hover:bg-[#F4F4F5] transition-colors">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <CalendarClock className="w-3 h-3 shrink-0" style={{ color: "var(--brand-primary)" }} />
                        <h3 className="text-[12px] font-medium text-[#27272A] truncate">{r.title}</h3>
                      </div>
                      <span className="text-[10px] text-[#A1A1AA] uppercase tracking-[0.14em] shrink-0 num-tabular">
                        {r.cadence}{r.day ? ` · ${r.day}` : ""}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#71717A] font-light leading-relaxed pl-5">{r.what}</p>
                    {(r.market || r.channel || r.notes) && (
                      <div className="pl-5 mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                        {(r.market || r.channel) && (
                          <span className="text-[10px] font-light" style={{ color: "var(--brand-primary)" }}>
                            {[r.market, r.channel].filter(Boolean).join(" · ")}
                          </span>
                        )}
                        {r.notes && (
                          <span className="text-[10px] text-[#A1A1AA] font-light">{r.notes}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── Seasonal ───────────────────────────────────────────── */}
          {socialMedia.seasonalThemes && socialMedia.seasonalThemes.length > 0 && (
            <section ref={(el) => { sectionRefs.current.seasonal = el; }} id="seasonal">
              <SectionHead id="seasonal-h" num="06" title="Seasonal" Icon={CalendarDays} />
              <div className="grid sm:grid-cols-2 gap-2">
                {socialMedia.seasonalThemes.map((s) => {
                  const Icon = ({ Flower2, Sun, Leaf, Snowflake } as const)[s.iconName];
                  return (
                    <div key={s.season} className={`${cardHover} p-3.5`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-3 h-3" style={{ color: "var(--brand-primary)" }} />
                        <h3 className="text-[12px] font-medium text-[#27272A]">{s.season}</h3>
                        <span className="text-[10px] text-[#A1A1AA] uppercase tracking-[0.14em] ml-auto num-tabular">{s.months}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {s.themes.map((t) => (
                          <span key={t} className="text-[11px] text-[#A1A1AA] bg-[#FAFAFA] border border-[#E4E4E7] rounded-md px-1.5 py-0.5 font-light">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ─── Cross-Posting ──────────────────────────────────────── */}
          {socialMedia.crossPosting && (
            <section ref={(el) => { sectionRefs.current.cross = el; }} id="cross">
              <SectionHead id="cross-h" num="07" title="Cross-posting" Icon={Repeat} />
              <div className="grid sm:grid-cols-2 gap-2">
                <div className={`${card} p-3.5`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Hash className="w-3 h-3" style={{ color: "var(--brand-primary)" }} />
                    <p className="text-[11px] font-medium text-[#27272A]">Cross-post when</p>
                  </div>
                  <ul className="space-y-1 text-[12px] text-[#A1A1AA] font-light list-disc pl-4 marker:text-[var(--brand-primary)]">
                    {socialMedia.crossPosting.when.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className={`${card} p-3.5`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Hash className="w-3 h-3" style={{ color: "var(--brand-alert)" }} />
                    <p className="text-[11px] font-medium text-[#27272A]">Platform-specific</p>
                  </div>
                  <ul className="space-y-1 text-[12px] text-[#A1A1AA] font-light list-disc pl-4 marker:text-[var(--brand-alert)]">
                    {socialMedia.crossPosting.platformSpecific.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}
        </div>
      </motion.div>
    </div>
  );
}
