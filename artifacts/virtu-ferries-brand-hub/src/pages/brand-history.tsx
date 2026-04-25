import { motion } from "framer-motion";
import { Anchor, Ship, Flag, Globe, Calendar, Users, Car, TrendingUp } from "lucide-react";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";

const ICONS = { Users, Car, Calendar, TrendingUp, Anchor, Ship, Flag, Globe } as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay },
});

export default function BrandHistory() {
  const { history } = useBrandContent();
  const hasAnyContent =
    history.stats.length || history.timeline.length || history.vessels.length || history.heritage.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-24"
    >
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-gray-100 bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[var(--brand-primary)]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[var(--brand-accent)]/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 md:px-10 py-16 md:py-20">
          <motion.div {...fadeUp(0)} className="space-y-5 max-w-3xl">
            <div className="flex items-center gap-3">
              <Anchor className="w-5 h-5 text-[var(--brand-primary)]" />
              <span className="text-xs font-semibold text-[var(--brand-primary)] uppercase tracking-widest">
                {history.hero.kicker}
              </span>
            </div>
            <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900 leading-tight">
              {history.hero.title}
            </h1>
            <p className="text-lg text-gray-500 font-light leading-relaxed max-w-2xl">
              {history.hero.subtitle}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-10 space-y-20 pt-16">

        {!hasAnyContent && (
          <EmptySection
            title="Brand history not configured yet"
            message="Add timeline milestones, fleet, stats, and heritage notes for this brand and they will appear here."
          />
        )}

        {/* Stats */}
        {history.stats.length > 0 && (
          <motion.div {...fadeUp(0.05)}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {history.stats.map((s) => {
                const Icon = ICONS[s.iconName] ?? TrendingUp;
                return (
                  <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3">
                    <Icon className="w-5 h-5" style={{ color: s.color }} />
                    <p className="text-3xl font-extrabold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-400 leading-relaxed uppercase tracking-wide">{s.label}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Timeline */}
        {history.timeline.length > 0 && (
          <motion.section {...fadeUp(0.1)} className="space-y-6">
            <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
              <span className="w-8 h-[2px] bg-[var(--brand-primary)] block" />
              The story so far
            </h2>

            <div className="relative">
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gray-100 md:left-[23px]" />

              <div className="space-y-8">
                {history.timeline.map((item, i) => (
                  <motion.div
                    key={item.year + item.title}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.12 + i * 0.07 }}
                    className="flex gap-6 relative"
                  >
                    <div className="shrink-0 flex flex-col items-center pt-1">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[10px] font-bold z-10 shrink-0"
                        style={{ backgroundColor: item.accent }}
                      >
                        {item.year === "Today" ? (
                          <Anchor className="w-4 h-4" />
                        ) : (
                          <span className="text-[9px] font-extrabold leading-none text-center px-1">
                            {item.year.length > 2 ? item.year.slice(2) : item.year}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-6 space-y-2 hover:border-gray-200 transition-colors">
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: item.accent }}>
                          {item.year}
                        </span>
                        <h3 className="text-base font-extrabold text-gray-900">{item.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed font-light">{item.body}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

        {/* Fleet */}
        {history.vessels.length > 0 && (
          <motion.section {...fadeUp(0.15)} className="space-y-6">
            <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
              <span className="w-8 h-[2px] bg-[var(--brand-accent)] block" />
              The fleet
            </h2>
            {history.fleetSubtitle && (
              <p className="text-sm text-gray-400 -mt-2">{history.fleetSubtitle}</p>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {history.vessels.map((v) => (
                <div key={v.name} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 transition-colors">
                  <div className="h-2" style={{ backgroundColor: v.accent }} />
                  <div className="p-7 space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Ship className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{v.role}</span>
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-900">{v.name}</h3>
                      </div>
                      <span
                        className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: `${v.accent}15`, color: v.accent }}
                      >
                        In service {v.inService}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Length", value: v.length },
                        { label: "Capacity", value: v.capacity },
                        { label: "Hull", value: v.hull },
                      ].map((spec) => (
                        <div key={spec.label} className="bg-gray-50 rounded-xl p-3">
                          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{spec.label}</p>
                          <p className="text-sm font-semibold text-gray-900">{spec.value}</p>
                        </div>
                      ))}
                    </div>

                    <p className="text-sm text-gray-600 leading-relaxed font-light">{v.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Heritage note */}
        {history.heritage.length > 0 && (
          <motion.section {...fadeUp(0.2)} className="space-y-6">
            <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
              <span className="w-8 h-[2px] bg-[var(--brand-alert)] block" />
              Heritage as a content asset
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {history.heritage.map((item) => {
                const Icon = ICONS[item.iconName] ?? Anchor;
                return (
                  <div key={item.title} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3 hover:border-gray-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}10` }}>
                        <Icon className="w-4 h-4" style={{ color: item.color }} />
                      </div>
                      <h3 className="text-sm font-extrabold text-gray-900">{item.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed font-light">{item.body}</p>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Sister brand */}
        {history.sister && (
          <motion.section {...fadeUp(0.22)} className="space-y-4">
            <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
              <span className="w-8 h-[2px] bg-[var(--brand-primary)] block" />
              Sister brand
            </h2>
            <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col md:flex-row gap-8">
              <div className="space-y-3 flex-1">
                <p className="text-xs font-semibold text-[var(--brand-primary)] uppercase tracking-widest">{history.sister.kicker}</p>
                <h3 className="text-lg font-extrabold text-gray-900">{history.sister.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed font-light">{history.sister.description}</p>
              </div>
              <div className="flex flex-col gap-3 shrink-0">
                {history.sister.details.map((d) => (
                  <div key={d.label} className="flex items-center gap-4">
                    <span className="text-xs text-gray-400 w-24 shrink-0">{d.label}</span>
                    <span className="text-sm font-semibold text-gray-900">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        )}

      </div>
    </motion.div>
  );
}
