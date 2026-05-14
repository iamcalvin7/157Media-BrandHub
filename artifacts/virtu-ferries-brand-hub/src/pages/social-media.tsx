import { motion } from "framer-motion";
import { Facebook, Instagram, Hash, Share2, Users, Clock, Compass, Mic2, Repeat, CalendarClock, CalendarDays, Flower2, Sun, Leaf, Snowflake } from "lucide-react";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";
import type { LucideIcon } from "lucide-react";

const PLATFORM_ICONS = { Facebook, Instagram, Tiktok: Share2, Linkedin: Share2 } as const;

function SectionHeader({ eyebrow, title, Icon }: { eyebrow: string; title: string; Icon: LucideIcon }) {
  return (
    <header className="flex items-center gap-3 mb-5">
      <Icon className="w-3 h-3 text-[#52525B]" />
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#52525B]">{eyebrow}</span>
      <span className="text-[#27272A]">·</span>
      <h2 className="text-[13px] font-medium text-[#E4E4E7] tracking-[-0.005em]">{title}</h2>
    </header>
  );
}

const card = "bg-[#0E0E0E] border border-[#1A1A1A] rounded-xl";
const cardHover = "bg-[#0E0E0E] border border-[#1A1A1A] hover:border-[#262626] rounded-xl transition-colors";

export default function SocialMedia() {
  const { socialMedia } = useBrandContent();
  const hasAnyContent =
    socialMedia.markets.length || socialMedia.pillars.length || socialMedia.registers.length;

  return (
    <div className="relative min-h-screen bg-[#070707] text-[#FAFAFA]">
      <div aria-hidden className="pointer-events-none absolute inset-0 ambient-radial opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative px-6 md:px-10 py-10 md:py-14 max-w-4xl mx-auto pb-24"
      >
        {/* ─── Hero — restrained ─────────────────────────────────────── */}
        <header className="mb-14">
          <div className="flex items-center gap-2 mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[#52525B]">
            <span
              className="h-1 w-1 rounded-full"
              style={{ background: "var(--brand-primary)" }}
            />
            Strategy
          </div>
          <h1 className="text-[26px] md:text-[28px] font-semibold tracking-[-0.02em] text-[#FAFAFA]">
            Social media
          </h1>
          <p className="mt-2 text-[13px] text-[#71717A] font-light max-w-xl">
            Where we publish, how often, and how we sound.
          </p>
        </header>

        {!hasAnyContent && (
          <div className={`${card} p-6`}>
            <EmptySection
              title="Not configured yet"
              message="Add markets, platforms, pillars, and tone registers."
            />
          </div>
        )}

        <div className="space-y-12">
          {/* ─── Platforms ──────────────────────────────────────────── */}
          {socialMedia.markets.length > 0 && (
            <section>
              <SectionHeader eyebrow="01" title="Platforms" Icon={Share2} />
              <div className="grid md:grid-cols-2 gap-3">
                {socialMedia.markets.map((mkt) => (
                  <div key={mkt.market} className={`${cardHover} p-4`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Users className="w-2.5 h-2.5 text-[#52525B]" />
                      <p className="text-[10px] text-[#71717A] uppercase tracking-[0.18em] font-medium">{mkt.market}</p>
                    </div>
                    <p className="text-[13px] text-[#D4D4D8] font-light leading-snug">{mkt.audience}</p>
                    <p className="text-[12px] text-[#52525B] font-light mt-0.5">{mkt.frame}</p>
                    {mkt.note && (
                      <p
                        className="text-[11px] mt-2.5 leading-relaxed"
                        style={{ color: "var(--brand-primary)" }}
                      >
                        {mkt.note}
                      </p>
                    )}
                    <div className="space-y-1.5 mt-3 pt-3 border-t border-[#1A1A1A]">
                      {mkt.platforms.map((platform) => {
                        const Icon = PLATFORM_ICONS[platform.iconName] ?? Share2;
                        return (
                          <div key={platform.name} className="flex items-center gap-2.5">
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${platform.colorClass}`} />
                            <p className="text-[12px] font-medium text-[#E4E4E7] min-w-[68px]">{platform.name}</p>
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

          {/* ─── Cadence ────────────────────────────────────────────── */}
          {socialMedia.markets.length > 0 && socialMedia.markets.some(m => m.platforms.some(p => p.cadence)) && (() => {
            const byChannel = new Map<string, { iconName: keyof typeof PLATFORM_ICONS; colorClass: string; entries: { market: string; handle: string; cadence: string }[] }>();
            for (const mkt of socialMedia.markets) {
              for (const p of mkt.platforms) {
                if (!p.cadence) continue;
                const slot = byChannel.get(p.name) ?? { iconName: p.iconName, colorClass: p.colorClass, entries: [] };
                slot.entries.push({ market: mkt.market, handle: p.handle, cadence: p.cadence });
                byChannel.set(p.name, slot);
              }
            }
            const channels = Array.from(byChannel.entries());
            return (
              <section>
                <SectionHeader eyebrow="02" title="Cadence" Icon={Clock} />
                <div className={`${card} divide-y divide-[#141414]`}>
                  {channels.map(([channelName, info]) => {
                    const Icon = PLATFORM_ICONS[info.iconName] ?? Share2;
                    return (
                      <div key={channelName} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-3.5 h-3.5 ${info.colorClass}`} />
                          <h3 className="text-[12px] font-medium text-[#FAFAFA] tracking-[-0.005em]">{channelName}</h3>
                        </div>
                        <ul className="space-y-1 pl-5">
                          {info.entries.map((e) => (
                            <li key={e.market} className="flex items-center justify-between gap-3 text-[12px]">
                              <span className="text-[#A1A1AA] font-light">{e.market}</span>
                              <span className="text-[#71717A] font-light num-tabular text-right">{e.cadence}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}

          {/* ─── Content Pillars ────────────────────────────────────── */}
          {socialMedia.pillars.length > 0 && (
            <section>
              <SectionHeader eyebrow="03" title="Pillars" Icon={Compass} />
              <div className="grid sm:grid-cols-2 gap-2">
                {socialMedia.pillars.map((pillar) => (
                  <div key={pillar.number} className={`${cardHover} p-3.5 flex items-start gap-3`}>
                    <span
                      className="text-[11px] font-medium leading-none pt-0.5 num-tabular shrink-0 w-5"
                      style={{ color: "var(--brand-primary)" }}
                    >
                      {String(pillar.number).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="text-[13px] font-medium text-[#E4E4E7] tracking-[-0.005em] mb-0.5">{pillar.title}</p>
                      <p className="text-[12px] text-[#71717A] font-light leading-relaxed">{pillar.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── Tone Registers ─────────────────────────────────────── */}
          {socialMedia.registers.length > 0 && (
            <section>
              <SectionHeader eyebrow="04" title="Tone" Icon={Mic2} />
              <div className={`${card} divide-y divide-[#141414]`}>
                {socialMedia.registers.map((reg) => (
                  <div key={reg.label} className="flex flex-col sm:flex-row gap-3 px-4 py-3">
                    <div className="sm:w-32 shrink-0 flex items-center gap-2">
                      <span
                        className="block w-[3px] h-3 rounded-full"
                        style={{ background: reg.color }}
                      />
                      <p className="text-[12px] font-medium text-[#E4E4E7]">{reg.label}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-[12px] text-[#A1A1AA] font-light leading-relaxed">{reg.desc}</p>
                      <p className="text-[12px] text-[#52525B] font-light italic mt-0.5">{reg.example}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ─── Recurring ──────────────────────────────────────────── */}
          {socialMedia.recurringPosts && socialMedia.recurringPosts.length > 0 && (
            <section>
              <SectionHeader eyebrow="05" title="Recurring" Icon={CalendarClock} />
              <div className={`${card} divide-y divide-[#141414]`}>
                {socialMedia.recurringPosts.map((r, i) => (
                  <div key={`${r.title}-${i}`} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <CalendarClock className="w-3 h-3 shrink-0" style={{ color: "var(--brand-primary)" }} />
                        <h3 className="text-[12px] font-medium text-[#E4E4E7] truncate">{r.title}</h3>
                      </div>
                      <span className="text-[10px] text-[#52525B] uppercase tracking-[0.14em] shrink-0">
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
                          <span className="text-[10px] text-[#52525B] font-light">{r.notes}</span>
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
            <section>
              <SectionHeader eyebrow="06" title="Seasonal" Icon={CalendarDays} />
              <div className="grid sm:grid-cols-2 gap-2">
                {socialMedia.seasonalThemes.map((s) => {
                  const Icon = ({ Flower2, Sun, Leaf, Snowflake } as const)[s.iconName];
                  return (
                    <div key={s.season} className={`${cardHover} p-3.5`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-3 h-3" style={{ color: "var(--brand-primary)" }} />
                        <h3 className="text-[12px] font-medium text-[#E4E4E7]">{s.season}</h3>
                        <span className="text-[10px] text-[#52525B] uppercase tracking-[0.14em] ml-auto">{s.months}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {s.themes.map((t) => (
                          <span key={t} className="text-[11px] text-[#A1A1AA] bg-[#141414] border border-[#1F1F1F] rounded-md px-1.5 py-0.5 font-light">
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
            <section>
              <SectionHeader eyebrow="07" title="Cross-posting" Icon={Repeat} />
              <div className="grid sm:grid-cols-2 gap-2">
                <div className={`${card} p-3.5`}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Hash className="w-3 h-3" style={{ color: "var(--brand-primary)" }} />
                    <p className="text-[11px] font-medium text-[#E4E4E7]">Cross-post when</p>
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
                    <p className="text-[11px] font-medium text-[#E4E4E7]">Platform-specific</p>
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
