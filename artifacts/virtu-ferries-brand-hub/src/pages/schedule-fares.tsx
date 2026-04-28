import { motion } from "framer-motion";
import {
  Ship, Clock, Accessibility, AlertTriangle, Sparkles,
  CreditCard, Luggage, Car, Dog, Truck, Bike,
  CalendarRange, Tag, ArrowLeftRight, Users, RefreshCw,
} from "lucide-react";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";
import { cn } from "@/lib/utils";

const SECTION_ICONS = {
  CreditCard, Clock, Luggage, Car, Dog,
  Accessibility, Truck, Bike, Ship, AlertTriangle, Sparkles,
} as const;

const PRICE_ICONS = { Users, Car, Bike, Truck } as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

export default function ScheduleFares() {
  const { travelInfo, offers } = useBrandContent();

  const scheduleSections = travelInfo.sections.filter(
    (s) => s.id.startsWith("schedule-") || s.id === "routes" || s.id === "patient-travel",
  );

  const hasSchedule = scheduleSections.length > 0;
  const hasFares = offers.offers.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-24"
    >
      {/* Header */}
      <div className="relative overflow-hidden border-b border-gray-100 bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-[var(--brand-primary)]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-20 w-72 h-72 bg-[var(--brand-accent)]/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 md:px-10 py-14 md:py-16">
          <motion.div {...fadeUp(0)} className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <CalendarRange className="w-5 h-5 text-[var(--brand-primary)]" />
              <span className="text-xs font-semibold text-[var(--brand-primary)] uppercase tracking-widest">
                Operations at a glance
              </span>
            </div>
            <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900">
              Schedule &amp; Fares
            </h1>
            <p className="text-lg text-gray-500 font-light leading-relaxed">
              Every route, every sailing time, every fare — on one page. Use this as the quick reference
              for service questions, content prompts and price quotes.
            </p>
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 w-fit">
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              Verify against the latest brochure before publishing
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-10 pt-12 space-y-16">
        {/* SCHEDULE */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ background: `linear-gradient(135deg, var(--brand-primary), var(--brand-accent))` }}
            >
              <Clock className="w-4 h-4" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">Schedule</h2>
          </div>

          {!hasSchedule ? (
            <EmptySection
              title="No schedule configured yet"
              message="Add route and schedule sections to the brand's Travel Info and they'll appear here."
            />
          ) : (
            <div className="space-y-6">
              {scheduleSections.map((s, idx) => {
                const Icon = SECTION_ICONS[s.iconName] ?? Ship;
                return (
                  <motion.section
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05 * idx }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                  >
                    <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                        style={{ backgroundColor: s.accent }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">{s.title}</h3>
                    </div>

                    <div className="px-6 py-5 space-y-4">
                      {s.intro && (
                        <p className="text-[15px] text-gray-700 leading-relaxed">{s.intro}</p>
                      )}

                      {s.bullets && s.bullets.length > 0 && (
                        <ul className="space-y-2.5">
                          {s.bullets.map((b, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                                style={{ backgroundColor: s.accent }}
                              />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {s.notes && s.notes.length > 0 && (
                        <div className="pt-2 space-y-3">
                          {s.notes.map((n, i) => (
                            <div
                              key={i}
                              className="rounded-xl bg-gray-50 border border-gray-100 p-4"
                            >
                              <p className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-1">
                                {n.label}
                              </p>
                              <p className="text-sm text-gray-700 leading-relaxed">{n.body}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.section>
                );
              })}
            </div>
          )}
        </section>

        {/* FARES */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ background: `linear-gradient(135deg, var(--brand-accent), var(--brand-primary))` }}
            >
              <Tag className="w-4 h-4" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900">Fares</h2>
          </div>

          {!hasFares ? (
            <EmptySection
              title="No fares configured yet"
              message="Add fare cards to the brand's Offers and they'll appear here."
            />
          ) : (
            <div className="space-y-6">
              {offers.offers.map((offer, i) => (
                <motion.div
                  key={offer.id}
                  {...fadeUp(0.06 + i * 0.05)}
                  className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 transition-colors"
                >
                  <div className="h-1.5" style={{ backgroundColor: offer.badgeColor }} />
                  <div className="p-7 md:p-8 space-y-6">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="text-xs font-bold px-2.5 py-1 rounded-full"
                            style={{
                              backgroundColor: `${offer.badgeColor}15`,
                              color: offer.badgeColor,
                            }}
                          >
                            {offer.badge}
                          </span>
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-900 mt-1">{offer.name}</h3>
                        <p className="text-sm text-gray-500 font-light">{offer.description}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                        {offer.validity}
                      </div>
                    </div>

                    {/* Hook */}
                    <div
                      className="rounded-xl px-5 py-4 border-l-4"
                      style={{
                        borderColor: offer.badgeColor,
                        backgroundColor: `${offer.badgeColor}08`,
                      }}
                    >
                      <p className="text-sm font-semibold text-gray-800 italic">"{offer.hook}"</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 uppercase tracking-wider">
                        Content hook
                      </p>
                    </div>

                    <div className={cn("grid gap-6", offer.schedule ? "md:grid-cols-2" : "")}>
                      {/* Prices */}
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">
                          Prices
                        </p>
                        <div className="space-y-2">
                          {offer.prices.map((p) => {
                            const Icon = PRICE_ICONS[p.iconName] ?? Users;
                            return (
                              <div
                                key={p.label}
                                className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100"
                              >
                                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                                  {p.label}
                                </div>
                                <span className="text-base font-extrabold text-gray-900">
                                  {p.value}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Schedule */}
                      {offer.schedule && (
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">
                            Schedule
                          </p>
                          <div className="space-y-2">
                            {offer.schedule.map((s) => (
                              <div
                                key={s.label}
                                className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100"
                              >
                                <ArrowLeftRight className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                                <div>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">
                                    {s.label}
                                  </p>
                                  <p className="text-sm font-semibold text-gray-900">{s.value}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {offer.notes.length > 0 && (
                      <div className="pt-2 border-t border-gray-50 space-y-1.5">
                        {offer.notes.map((n, idx2) => (
                          <p
                            key={idx2}
                            className="text-xs text-gray-500 leading-relaxed flex items-start gap-2"
                          >
                            <span
                              className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                              style={{ backgroundColor: offer.badgeColor }}
                            />
                            {n}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {offers.notes.length > 0 && (
            <motion.div {...fadeUp(0.25)} className="grid md:grid-cols-2 gap-4 pt-4">
              {offers.notes.map((note) => (
                <div
                  key={note.title}
                  className="bg-white border border-gray-100 rounded-2xl p-6 space-y-2 hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: note.color }}
                    />
                    <h4 className="text-sm font-extrabold text-gray-900">{note.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed font-light">{note.body}</p>
                </div>
              ))}
            </motion.div>
          )}
        </section>
      </div>
    </motion.div>
  );
}
