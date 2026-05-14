import { motion } from "framer-motion";
import { Facebook, Instagram, Hash, Share2, Users, Clock, Compass, Mic2, Repeat, CalendarClock, CalendarDays, Flower2, Sun, Leaf, Snowflake } from "lucide-react";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";
import type { LucideIcon } from "lucide-react";

const PLATFORM_ICONS = { Facebook, Instagram, Tiktok: Share2, Linkedin: Share2 } as const;

function SectionHeader({ eyebrow, title, subtitle, Icon }: { eyebrow: string; title: string; subtitle?: string; Icon: LucideIcon }) {
  return (
    <header className="space-y-4">
      <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#71717A]">
        <Icon className="w-3 h-3 text-[var(--brand-primary)]" />
        <span>{eyebrow}</span>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold tracking-[-0.02em] uppercase text-[#FAFAFA]">{title}</h2>
      {subtitle && <p className="text-[14px] text-[#A1A1AA] font-light max-w-2xl leading-relaxed">{subtitle}</p>}
      <div className="h-px bg-gradient-to-r from-[#1F1F1F] via-[#1F1F1F] to-transparent" />
    </header>
  );
}

/** Surface card — dark, premium, brand-tint-aware */
const cardCls = "bg-[#0F0F0F] border border-[#1A1A1A] rounded-2xl";
const cardClsHover = "bg-[#0F0F0F] border border-[#1A1A1A] hover:border-[#2A2A2A] rounded-2xl transition-colors";

export default function SocialMedia() {
  const { socialMedia } = useBrandContent();
  const hasAnyContent =
    socialMedia.markets.length || socialMedia.pillars.length || socialMedia.registers.length;

  return (
    <div className="relative min-h-screen bg-[#070707] text-[#FAFAFA] overflow-hidden">
      {/* Ambient backdrop — same recipe as landing/dashboard */}
      <div aria-hidden className="pointer-events-none absolute inset-0 ambient-radial opacity-60" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_120%,rgba(0,0,0,0.6),transparent_60%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative p-6 md:p-10 max-w-5xl mx-auto space-y-20 pb-24"
      >
        {/* ─── Hero ──────────────────────────────────────────────────────── */}
        <header className="space-y-5 pt-2">
          <span className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.28em] text-[#71717A]">
            <span className="h-1 w-1 rounded-full bg-[var(--brand-primary)] shadow-[0_0_8px_var(--brand-primary)]" />
            Brand Strategy
          </span>
          <h1 className="text-4xl sm:text-5xl md:text-[56px] font-bold tracking-[-0.025em] leading-[1.02] uppercase text-[#FAFAFA]">
            Social <span className="text-[#52525B]">Media.</span>
          </h1>
          <p className="text-base md:text-[17px] text-[#A1A1AA] font-light max-w-2xl leading-relaxed">
            {socialMedia.headerSubtitle}
          </p>
        </header>

        {!hasAnyContent && (
          <div className={`${cardCls} p-8`}>
            <EmptySection
              title="Social media reference not configured yet"
              message="Add markets, platforms, content pillars, and tone registers for this brand and they will appear here."
            />
          </div>
        )}

        {/* ─── Platforms ──────────────────────────────────────────────────── */}
        {socialMedia.markets.length > 0 && (
          <section className="space-y-8">
            <SectionHeader
              eyebrow="Where we publish"
              title="Platforms"
              subtitle="The active accounts per market — handles only. Posting frequency is broken out below in Cadence."
              Icon={Share2}
            />
            <div className="grid md:grid-cols-2 gap-5">
              {socialMedia.markets.map((mkt) => (
                <div key={mkt.market} className={`${cardClsHover} p-6 space-y-5 group relative overflow-hidden`}>
                  <div
                    className="absolute -top-20 -right-20 w-56 h-56 rounded-full blur-3xl opacity-0 group-hover:opacity-15 transition-opacity duration-700 pointer-events-none"
                    style={{ background: "var(--brand-primary)" }}
                  />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Users className="w-3 h-3 text-[#52525B]" />
                      <p className="text-[10px] text-[#71717A] uppercase tracking-[0.22em] font-semibold">{mkt.market}</p>
                    </div>
                    <p className="text-sm text-[#E4E4E7] font-light leading-relaxed">{mkt.audience}</p>
                    <p className="text-sm text-[#71717A] font-light mt-1 italic">{mkt.frame}</p>
                    {mkt.note && (
                      <p
                        className="text-xs bg-white/[0.02] rounded-xl px-3 py-2 mt-3 leading-relaxed border"
                        style={{ color: "var(--brand-primary)", borderColor: "color-mix(in srgb, var(--brand-primary) 25%, transparent)" }}
                      >
                        {mkt.note}
                      </p>
                    )}
                  </div>
                  <div className="relative space-y-2 pt-4 border-t border-[#1A1A1A]">
                    {mkt.platforms.map((platform) => {
                      const Icon = PLATFORM_ICONS[platform.iconName] ?? Share2;
                      return (
                        <div key={platform.name} className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#161616] border border-[#1F1F1F] flex items-center justify-center shrink-0">
                            <Icon className={`w-4 h-4 ${platform.colorClass}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#FAFAFA] tracking-[-0.005em]">{platform.name}</p>
                            <p className="text-xs truncate" style={{ color: "var(--brand-primary)" }}>{platform.handle}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Cadence ────────────────────────────────────────────────────── */}
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
            <section className="space-y-8">
              <SectionHeader
                eyebrow="How often we post"
                title="Posting Cadence"
                subtitle="Target volume per channel — each row is one platform, with the per-market breakdown underneath."
                Icon={Clock}
              />
              <div className="space-y-4">
                {channels.map(([channelName, info]) => {
                  const Icon = PLATFORM_ICONS[info.iconName] ?? Share2;
                  return (
                    <div
                      key={channelName}
                      className={`${cardCls} overflow-hidden`}
                    >
                      <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1A1A1A] bg-[#0B0B0B]">
                        <div className="w-10 h-10 rounded-xl bg-[#161616] border border-[#1F1F1F] flex items-center justify-center shrink-0">
                          <Icon className={`w-5 h-5 ${info.colorClass}`} />
                        </div>
                        <h3 className="text-base font-bold tracking-[-0.01em] text-[#FAFAFA] uppercase">{channelName}</h3>
                      </div>
                      <ul className="divide-y divide-[#141414]">
                        {info.entries.map((e) => (
                          <li key={e.market} className="flex items-center gap-4 px-6 py-3.5">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[#FAFAFA] tracking-[-0.005em]">{e.market}</p>
                              <p className="text-xs truncate" style={{ color: "var(--brand-primary)" }}>{e.handle}</p>
                            </div>
                            <p className="text-sm text-[#E4E4E7] text-right shrink-0 font-medium num-tabular">
                              {e.cadence}
                            </p>
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

        {/* ─── Content Pillars ───────────────────────────────────────────── */}
        {socialMedia.pillars.length > 0 && (
          <section className="space-y-8">
            <SectionHeader
              eyebrow="What we talk about"
              title="Content Pillars"
              Icon={Compass}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              {socialMedia.pillars.map((pillar) => (
                <div
                  key={pillar.number}
                  className={`${cardClsHover} p-5 flex items-start gap-4`}
                >
                  <span
                    className="text-3xl font-bold leading-none pt-0.5 shrink-0 num-tabular"
                    style={{ color: "color-mix(in srgb, var(--brand-primary) 35%, transparent)" }}
                  >
                    {String(pillar.number).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="font-bold text-[#FAFAFA] mb-1 tracking-[-0.005em] uppercase text-sm">{pillar.title}</p>
                    <p className="text-sm text-[#A1A1AA] font-light leading-relaxed">{pillar.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Tone Registers ────────────────────────────────────────────── */}
        {socialMedia.registers.length > 0 && (
          <section className="space-y-8">
            <SectionHeader
              eyebrow="How we sound"
              title="Tone Registers"
              Icon={Mic2}
            />
            <div className="space-y-4">
              {socialMedia.registers.map((reg) => (
                <div
                  key={reg.label}
                  className={`${cardCls} p-6 relative overflow-hidden`}
                >
                  <span
                    className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r"
                    style={{ background: reg.color, boxShadow: `0 0 12px ${reg.color}80` }}
                  />
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 pl-3">
                    <div className="sm:w-44 shrink-0">
                      <p className="text-[10px] text-[#71717A] uppercase tracking-[0.22em] font-semibold mb-1">Register</p>
                      <p className="font-bold text-[#FAFAFA] text-sm tracking-[-0.005em] uppercase">{reg.label}</p>
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-[#E4E4E7] font-light leading-relaxed">{reg.desc}</p>
                      <p className="text-sm text-[#71717A] font-light italic">{reg.example}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Recurring Content ─────────────────────────────────────────── */}
        {socialMedia.recurringPosts && socialMedia.recurringPosts.length > 0 && (
          <section className="space-y-8">
            <SectionHeader
              eyebrow="Always-on calendar slots"
              title="Recurring Content"
              subtitle="Standing posts that go out on the same cadence every week. The team treats these as fixed appointments — they get scheduled first, then everything else fills in around them."
              Icon={CalendarClock}
            />
            <div className="space-y-4">
              {socialMedia.recurringPosts.map((r, i) => (
                <div
                  key={`${r.title}-${i}`}
                  className={`${cardCls} overflow-hidden`}
                >
                  <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#1A1A1A] bg-[#0B0B0B]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#161616] border border-[#1F1F1F] flex items-center justify-center shrink-0">
                        <CalendarClock className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold tracking-[-0.01em] text-[#FAFAFA] truncate uppercase">{r.title}</h3>
                        <p className="text-[10px] text-[#71717A] uppercase tracking-[0.22em] font-semibold">
                          {r.cadence}{r.day ? ` · ${r.day}` : ""}
                        </p>
                      </div>
                    </div>
                    {(r.market || r.channel) && (
                      <p
                        className="text-[10px] uppercase tracking-[0.18em] font-semibold rounded-full px-3 py-1 shrink-0 hidden sm:block border"
                        style={{ color: "var(--brand-primary)", borderColor: "color-mix(in srgb, var(--brand-primary) 25%, transparent)", background: "color-mix(in srgb, var(--brand-primary) 8%, transparent)" }}
                      >
                        {[r.market, r.channel].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="px-6 py-5 space-y-3">
                    <p className="text-sm text-[#E4E4E7] font-light leading-relaxed">{r.what}</p>
                    {(r.market || r.channel) && (
                      <p className="text-xs sm:hidden" style={{ color: "var(--brand-primary)" }}>
                        {[r.market, r.channel].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {r.notes && (
                      <p className="text-xs text-[#A1A1AA] font-light leading-relaxed border-t border-[#1A1A1A] pt-3">
                        <span className="font-semibold text-[#71717A] uppercase tracking-[0.22em] text-[10px] mr-2">Notes</span>
                        {r.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ─── Seasonal Themes ───────────────────────────────────────────── */}
        {socialMedia.seasonalThemes && socialMedia.seasonalThemes.length > 0 && (
          <section className="space-y-8">
            <SectionHeader
              eyebrow="The year on a page"
              title="Seasonal Themes"
              subtitle="What Sicily and the crossing feel like through the year — use these to anchor mood, topic, and visuals to the season the post will land in."
              Icon={CalendarDays}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              {socialMedia.seasonalThemes.map((s) => {
                const Icon = ({ Flower2, Sun, Leaf, Snowflake } as const)[s.iconName];
                return (
                  <div key={s.season} className={`${cardClsHover} p-5 space-y-3`}>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                        style={{ background: "color-mix(in srgb, var(--brand-primary) 10%, transparent)", borderColor: "color-mix(in srgb, var(--brand-primary) 25%, transparent)" }}
                      >
                        <Icon className="w-5 h-5" style={{ color: "var(--brand-primary)" }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold tracking-[-0.01em] text-[#FAFAFA] uppercase">{s.season}</h3>
                        <p className="text-[10px] text-[#71717A] uppercase tracking-[0.22em] font-semibold">{s.months}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {s.themes.map((t) => (
                        <span
                          key={t}
                          className="text-xs text-[#A1A1AA] bg-[#161616] border border-[#1F1F1F] rounded-full px-2.5 py-1"
                        >
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

        {/* ─── Cross-Posting Logic ───────────────────────────────────────── */}
        {socialMedia.crossPosting && (
          <section className="space-y-8">
            <SectionHeader
              eyebrow="When channels overlap"
              title="Cross-Posting Logic"
              Icon={Repeat}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              <div className={`${cardCls} p-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <Hash className="w-3.5 h-3.5" style={{ color: "var(--brand-primary)" }} />
                  <p className="font-bold text-[#FAFAFA] text-xs uppercase tracking-[0.18em]">Cross-post when</p>
                </div>
                <ul className="space-y-2 text-sm text-[#A1A1AA] font-light list-disc pl-5 marker:text-[var(--brand-primary)]">
                  {socialMedia.crossPosting.when.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className={`${cardCls} p-6`}>
                <div className="flex items-center gap-2 mb-4">
                  <Hash className="w-3.5 h-3.5" style={{ color: "var(--brand-alert)" }} />
                  <p className="font-bold text-[#FAFAFA] text-xs uppercase tracking-[0.18em]">Platform-specific when</p>
                </div>
                <ul className="space-y-2 text-sm text-[#A1A1AA] font-light list-disc pl-5 marker:text-[var(--brand-alert)]">
                  {socialMedia.crossPosting.platformSpecific.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}
      </motion.div>
    </div>
  );
}
