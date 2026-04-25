import { motion } from "framer-motion";
import { Facebook, Instagram, Hash, Share2 } from "lucide-react";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";

const PLATFORM_ICONS = { Facebook, Instagram, Tiktok: Share2, Linkedin: Share2 } as const;

export default function SocialMedia() {
  const { socialMedia } = useBrandContent();
  const hasAnyContent =
    socialMedia.markets.length || socialMedia.pillars.length || socialMedia.registers.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-5xl mx-auto space-y-16 pb-24"
    >
      <header className="space-y-4">
        <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900">Social Media</h1>
        <p className="text-lg text-gray-500 font-light max-w-2xl">{socialMedia.headerSubtitle}</p>
      </header>

      {!hasAnyContent && (
        <EmptySection
          title="Social media reference not configured yet"
          message="Add markets, platforms, content pillars, and tone registers for this brand and they will appear here."
        />
      )}

      {socialMedia.markets.length > 0 && (
        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <span className="w-8 h-[2px] bg-[var(--brand-primary)] block"></span>
            Platforms & Cadence
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {socialMedia.markets.map((mkt) => (
              <div key={mkt.market} className="p-6 bg-white border border-gray-100 rounded-2xl space-y-5">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">{mkt.market}</p>
                  <p className="text-sm text-gray-500 font-light">{mkt.audience}</p>
                  <p className="text-sm text-gray-400 font-light mt-1 italic">{mkt.frame}</p>
                  {mkt.note && (
                    <p className="text-xs text-[var(--brand-primary)] bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/15 rounded-xl px-3 py-2 mt-2 leading-relaxed">{mkt.note}</p>
                  )}
                </div>
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  {mkt.platforms.map((platform) => {
                    const Icon = PLATFORM_ICONS[platform.iconName] ?? Share2;
                    return (
                      <div key={platform.name} className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                          <Icon className={`w-5 h-5 ${platform.colorClass}`} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900">{platform.name}</p>
                          <p className="text-xs text-[var(--brand-primary)] truncate">{platform.handle}</p>
                        </div>
                        <div className="ml-auto text-right shrink-0">
                          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Cadence</p>
                          <p className="text-sm text-gray-700">{platform.cadence}</p>
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

      {socialMedia.pillars.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <span className="w-8 h-[2px] bg-[var(--brand-accent)] block"></span>
            Content Pillars
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {socialMedia.pillars.map((pillar) => (
              <div
                key={pillar.number}
                className="p-5 bg-white border border-gray-100 rounded-2xl flex items-start gap-4 hover:border-gray-200 transition-colors"
              >
                <span className="text-2xl font-bold text-white/10 font-mono leading-none pt-0.5 shrink-0">{pillar.number}</span>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">{pillar.title}</p>
                  <p className="text-sm text-gray-400 font-light">{pillar.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {socialMedia.registers.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <span className="w-8 h-[2px] bg-gray-200 block"></span>
            Tone Registers
          </h2>
          <div className="space-y-4">
            {socialMedia.registers.map((reg) => (
              <div key={reg.label} className="p-6 bg-white border border-gray-100 rounded-2xl" style={{ borderLeftWidth: 3, borderLeftColor: reg.color }}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="sm:w-44 shrink-0">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Register</p>
                    <p className="font-semibold text-gray-900 text-sm">{reg.label}</p>
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

      {socialMedia.crossPosting && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <span className="w-8 h-[2px] bg-[var(--brand-primary)] block"></span>
            Cross-Posting Logic
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-6 bg-white border border-gray-100 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-4 h-4 text-[var(--brand-primary)]" />
                <p className="font-semibold text-gray-900 text-sm">Cross-post when</p>
              </div>
              <ul className="space-y-2 text-sm text-gray-500 font-light">
                {socialMedia.crossPosting.when.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="p-6 bg-white border border-gray-100 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-4 h-4 text-[var(--brand-alert)]" />
                <p className="font-semibold text-gray-900 text-sm">Platform-specific when</p>
              </div>
              <ul className="space-y-2 text-sm text-gray-500 font-light">
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
