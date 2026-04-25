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
      <div className="relative overflow-hidden border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/40">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-[28rem] h-[28rem] bg-[var(--brand-primary)]/[0.06] rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-[var(--brand-accent)]/[0.05] rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 md:px-10 py-12 md:py-16">
          <motion.div {...fadeUp(0)} className="space-y-4 max-w-3xl">
            <span className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--brand-primary)]">
              <Anchor className="w-3.5 h-3.5" />
              {history.hero.kicker}
            </span>
            <h1 className="h-display text-gray-900 max-w-2xl">
              {history.hero.title}
            </h1>
            <p className="text-[15px] text-gray-500 font-light leading-relaxed max-w-xl">
              {history.hero.subtitle}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-10 space-y-14 pt-12">

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
                  <div key={s.label} className="surface-card p-5 space-y-3 hover:border-gray-200/80 transition-colors">
                    <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: `${s.color}12` }}>
                      <Icon className="w-4 h-4" style={{ color: s.color }} />
                    </div>
                    <p className="text-2xl font-semibold tracking-[-0.02em] text-gray-900 tabular-nums">{s.value}</p>
                    <p className="text-[10px] text-gray-400 leading-relaxed uppercase tracking-[0.16em] font-medium">{s.label}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Timeline */}
        {history.timeline.length > 0 && (
          <motion.section {...fadeUp(0.1)} className="space-y-5">
            <h2 className="h-section text-gray-900 flex items-center gap-2.5">
              <span className="accent-dot bg-[var(--brand-primary)]" />
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

                    <div className="flex-1 surface-card p-5 space-y-1.5 hover:border-gray-200/80 transition-colors">
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <span className="text-[10px] font-medium uppercase tracking-[0.18em]" style={{ color: item.accent }}>
                          {item.year}
                        </span>
                        <h3 className="h-card text-gray-900">{item.title}</h3>
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
          <motion.section {...fadeUp(0.15)} className="space-y-5">
            <div className="space-y-1.5">
              <h2 className="h-section text-gray-900 flex items-center gap-2.5">
                <span className="accent-dot bg-[var(--brand-accent)]" />
                The fleet
              </h2>
              {history.fleetSubtitle && (
                <p className="text-[13px] text-gray-400 ml-4">{history.fleetSubtitle}</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {history.vessels.map((v) => (
                <div key={v.name} className="surface-card overflow-hidden hover:border-gray-200/80 transition-colors">
                  <div className="h-[3px]" style={{ backgroundColor: v.accent }} />
                  <div className="p-6 space-y-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Ship className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-gray-400">{v.role}</span>
                        </div>
                        <h3 className="text-lg font-semibold tracking-[-0.01em] text-gray-900">{v.name}</h3>
                      </div>
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0"
                        style={{ backgroundColor: `${v.accent}14`, color: v.accent }}
                      >
                        In service {v.inService}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Length", value: v.length },
                        { label: "Capacity", value: v.capacity },
                        { label: "Hull", value: v.hull },
                      ].map((spec) => (
                        <div key={spec.label} className="bg-gray-50/70 rounded-lg p-2.5">
                          <p className="text-[9px] text-gray-400 uppercase tracking-[0.14em] mb-0.5 font-medium">{spec.label}</p>
                          <p className="text-[13px] font-semibold text-gray-900 tabular-nums">{spec.value}</p>
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
          <motion.section {...fadeUp(0.2)} className="space-y-5">
            <h2 className="h-section text-gray-900 flex items-center gap-2.5">
              <span className="accent-dot bg-[var(--brand-alert)]" />
              Heritage as a content asset
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {history.heritage.map((item) => {
                const Icon = ICONS[item.iconName] ?? Anchor;
                return (
                  <div key={item.title} className="surface-card p-5 space-y-3 hover:border-gray-200/80 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}10` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                      </div>
                      <h3 className="h-card text-gray-900">{item.title}</h3>
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
          <motion.section {...fadeUp(0.22)} className="space-y-5">
            <h2 className="h-section text-gray-900 flex items-center gap-2.5">
              <span className="accent-dot bg-[var(--brand-primary)]" />
              Sister brand
            </h2>
            <div className="surface-card p-7 flex flex-col md:flex-row gap-8">
              <div className="space-y-2.5 flex-1">
                <p className="text-[10px] font-medium text-[var(--brand-primary)] uppercase tracking-[0.18em]">{history.sister.kicker}</p>
                <h3 className="text-base font-semibold tracking-[-0.01em] text-gray-900">{history.sister.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed font-light">{history.sister.description}</p>
              </div>
              <div className="flex flex-col gap-2.5 shrink-0 md:border-l md:border-gray-100 md:pl-8">
                {history.sister.details.map((d) => (
                  <div key={d.label} className="flex items-center gap-4">
                    <span className="text-[11px] text-gray-400 w-24 shrink-0 uppercase tracking-wider font-medium">{d.label}</span>
                    <span className="text-[13px] font-semibold text-gray-900 tabular-nums">{d.value}</span>
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
