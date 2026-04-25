import { motion } from "framer-motion";
import { Tag, Clock, ArrowLeftRight, Users, Car, Bike, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";

const PRICE_ICONS = { Users, Car, Bike } as const;

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
});

export default function Offers() {
  const { offers } = useBrandContent();

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
        </div>
        <div className="relative max-w-5xl mx-auto px-6 md:px-10 py-14 md:py-16">
          <motion.div {...fadeUp(0)} className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-[var(--brand-primary)]" />
              <span className="text-xs font-semibold text-[var(--brand-primary)] uppercase tracking-widest">Current Offers</span>
            </div>
            <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900">Offers</h1>
            <p className="text-lg text-gray-500 font-light leading-relaxed">{offers.headerSubtitle}</p>
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 w-fit">
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              Update this page at the start of each month
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-10 pt-12 space-y-16">

        {/* Offer Cards */}
        {offers.offers.length === 0 ? (
          <EmptySection
            title="Offers not configured yet"
            message="Add current offer cards (price, validity, hook, schedule, notes) for this brand and they will appear here."
          />
        ) : (
          <div className="space-y-8">
            {offers.offers.map((offer, i) => (
              <motion.div
                key={offer.id}
                {...fadeUp(0.06 + i * 0.07)}
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
                          style={{ backgroundColor: `${offer.badgeColor}15`, color: offer.badgeColor }}
                        >
                          {offer.badge}
                        </span>
                      </div>
                      <h2 className="text-xl font-extrabold text-gray-900 mt-1">{offer.name}</h2>
                      <p className="text-sm text-gray-500 font-light">{offer.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {offer.validity}
                    </div>
                  </div>

                  {/* Hook line */}
                  <div className="rounded-xl px-5 py-4 border-l-4" style={{ borderColor: offer.badgeColor, backgroundColor: `${offer.badgeColor}08` }}>
                    <p className="text-sm font-semibold text-gray-800 italic">"{offer.hook}"</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 uppercase tracking-wider">Content hook</p>
                  </div>

                  <div className={cn("grid gap-6", offer.schedule ? "md:grid-cols-2" : "")}>
                    {/* Prices */}
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">Prices</p>
                      <div className="space-y-2">
                        {offer.prices.map((p) => {
                          const Icon = PRICE_ICONS[p.iconName] ?? Users;
                          return (
                            <div key={p.label} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                              <div className="flex items-center gap-2.5 text-sm text-gray-600">
                                <Icon className="w-3.5 h-3.5 text-gray-400" />
                                {p.label}
                              </div>
                              <span className="text-base font-extrabold text-gray-900">{p.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Schedule */}
                    {offer.schedule && (
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold mb-3">Schedule</p>
                        <div className="space-y-2">
                          {offer.schedule.map((s) => (
                            <div key={s.label} className="flex items-start gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                              <ArrowLeftRight className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider">{s.label}</p>
                                <p className="text-sm font-semibold text-gray-900">{s.value}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Content notes */}
        {offers.notes.length > 0 && (
          <motion.section {...fadeUp(0.25)} className="space-y-5">
            <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
              <span className="w-8 h-[2px] bg-[var(--brand-accent)] block" />
              Writing offer content
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {offers.notes.map((note) => (
                <div key={note.title} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-2 hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: note.color }} />
                    <h3 className="text-sm font-extrabold text-gray-900">{note.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed font-light">{note.body}</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

      </div>
    </motion.div>
  );
}
