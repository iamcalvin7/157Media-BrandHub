import { motion } from "framer-motion";
import { Facebook, Instagram, Hash, Share2, Users, Clock, Compass, Mic2, Repeat } from "lucide-react";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";
import type { LucideIcon } from "lucide-react";

const PLATFORM_ICONS = { Facebook, Instagram, Tiktok: Share2, Linkedin: Share2 } as const;

function SectionHeader({ eyebrow, title, subtitle, Icon }: { eyebrow: string; title: string; subtitle?: string; Icon: LucideIcon }) {
  return (
    <header className="space-y-3">
      <div className="flex items-center gap-2 text-[var(--brand-primary)] text-xs font-semibold uppercase tracking-widest">
        <Icon className="w-3.5 h-3.5" />
        <span>{eyebrow}</span>
      </div>
      <div className="flex items-center gap-3">
        <span className="block w-1.5 h-7 rounded bg-[var(--brand-primary)]" />
        <h2 className="text-2xl md:text-[1.6rem] font-extrabold tracking-tight text-gray-900">{title}</h2>
      </div>
      {subtitle && <p className="text-sm text-gray-500 font-light max-w-2xl">{subtitle}</p>}
      <div className="h-px bg-gradient-to-r from-gray-200 via-gray-200 to-transparent" />
    </header>
  );
}

export default function SocialMedia() {
  const { socialMedia } = useBrandContent();
  const hasAnyContent =
    socialMedia.markets.length || socialMedia.pillars.length || socialMedia.registers.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-5xl mx-auto space-y-20 pb-24"
    >
      <header className="space-y-4">
        <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight leading-[1.04] text-gray-900">Social Media</h1>
        <p className="text-lg text-gray-500 font-light max-w-2xl">{socialMedia.headerSubtitle}</p>
      </header>

      {!hasAnyContent && (
        <EmptySection
          title="Social media reference not configured yet"
          message="Add markets, platforms, content pillars, and tone registers for this brand and they will appear here."
        />
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
          <div className="grid md:grid-cols-2 gap-6">
            {socialMedia.markets.map((mkt) => (
              <div key={mkt.market} className="p-6 bg-white border border-gray-100 rounded-2xl space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">{mkt.market}</p>
                  </div>
                  <p className="text-sm text-gray-500 font-light">{mkt.audience}</p>
                  <p className="text-sm text-gray-400 font-light mt-1 italic">{mkt.frame}</p>
                  {mkt.note && (
                    <p className="text-xs text-[var(--brand-primary)] bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/15 rounded-xl px-3 py-2 mt-3 leading-relaxed">{mkt.note}</p>
                  )}
                </div>
                <div className="space-y-2 pt-3 border-t border-gray-100">
                  {mkt.platforms.map((platform) => {
                    const Icon = PLATFORM_ICONS[platform.iconName] ?? Share2;
                    return (
                      <div key={platform.name} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                          <Icon className={`w-4.5 h-4.5 ${platform.colorClass}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{platform.name}</p>
                          <p className="text-xs text-[var(--brand-primary)] truncate">{platform.handle}</p>
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
      {socialMedia.markets.length > 0 && socialMedia.markets.some(m => m.platforms.some(p => p.cadence)) && (
        <section className="space-y-8">
          <SectionHeader
            eyebrow="How often we post"
            title="Posting Cadence"
            subtitle="Target volume per channel, broken down by market."
            Icon={Clock}
          />
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="divide-y divide-gray-100">
              {socialMedia.markets.map((mkt) => (
                <div key={mkt.market} className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">{mkt.market}</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {mkt.platforms.map((platform) => {
                      const Icon = PLATFORM_ICONS[platform.iconName] ?? Share2;
                      return (
                        <div
                          key={platform.name}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50/60 border border-gray-100"
                        >
                          <Icon className={`w-4 h-4 shrink-0 ${platform.colorClass}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900">{platform.name}</p>
                          </div>
                          <p className="text-sm text-gray-700 text-right shrink-0 font-medium">
                            {platform.cadence}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
                className="p-5 bg-white border border-gray-100 rounded-2xl flex items-start gap-4 hover:border-gray-200 transition-colors"
              >
                <span className="text-3xl font-extrabold text-[var(--brand-primary)]/15 font-mono leading-none pt-0.5 shrink-0 tabular-nums">
                  {String(pillar.number).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-extrabold text-gray-900 mb-1">{pillar.title}</p>
                  <p className="text-sm text-gray-500 font-light leading-relaxed">{pillar.desc}</p>
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
                className="p-6 bg-white border border-gray-100 rounded-2xl"
                style={{ borderLeftWidth: 3, borderLeftColor: reg.color }}
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="sm:w-44 shrink-0">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Register</p>
                    <p className="font-extrabold text-gray-900 text-sm">{reg.label}</p>
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm text-gray-600 font-light leading-relaxed">{reg.desc}</p>
                    <p className="text-sm text-gray-400 font-light italic">{reg.example}</p>
                  </div>
                </div>
              </div>
            ))}
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
            <div className="p-6 bg-white border border-gray-100 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-4 h-4 text-[var(--brand-primary)]" />
                <p className="font-extrabold text-gray-900 text-sm">Cross-post when</p>
              </div>
              <ul className="space-y-2 text-sm text-gray-500 font-light list-disc pl-5 marker:text-[var(--brand-primary)]/50">
                {socialMedia.crossPosting.when.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="p-6 bg-white border border-gray-100 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-4 h-4 text-[var(--brand-alert)]" />
                <p className="font-extrabold text-gray-900 text-sm">Platform-specific when</p>
              </div>
              <ul className="space-y-2 text-sm text-gray-500 font-light list-disc pl-5 marker:text-[var(--brand-alert)]/50">
                {socialMedia.crossPosting.platformSpecific.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </motion.div>
  );
}
