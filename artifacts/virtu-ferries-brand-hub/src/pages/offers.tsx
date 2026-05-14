import { motion } from "framer-motion";
import { Tag, Clock, ArrowLeftRight, Users, Car, Bike, Truck, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";

const PRICE_ICONS = { Users, Car, Bike, Truck } as const;

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
      <div className="relative overflow-hidden border-b border-[#F4F4F5] bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-[var(--brand-primary)]/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 md:px-10 py-14 md:py-16">
          <motion.div {...fadeUp(0)} className="space-y-4 max-w-2xl">
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-[var(--brand-primary)]" />
              <span className="text-xs font-semibold text-[var(--brand-primary)] uppercase tracking-widest">Current Offers</span>
            </div>
            <h1 className="font-extrabold text-4xl md:text-5xl text-[#18181B]">Offers</h1>
            <p className="text-lg text-[#71717A] font-light leading-relaxed">{offers.headerSubtitle}</p>
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
                className="bg-white border border-[#F4F4F5] rounded-2xl overflow-hidden hover:border-[#E4E4E7] transition-colors"
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
                      <h2 className="text-xl font-extrabold text-[#18181B] mt-1">{offer.name}</h2>
                      <p className="text-sm text-[#71717A] font-light">{offer.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#A1A1AA] bg-[#F5F5F5] border border-[#F4F4F5] px-3 py-2 rounded-xl shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      {offer.validity}
                    </div>
                  </div>

                  {/* Hook line */}
                  <div className="rounded-xl px-5 py-4 border-l-4" style={{ borderColor: offer.badgeColor, backgroundColor: `${offer.badgeColor}08` }}>
                    <p className="text-sm font-semibold text-[#27272A] italic">"{offer.hook}"</p>
                    <p className="text-[11px] text-[#A1A1AA] mt-0.5 uppercase tracking-wider">Content hook</p>
                  </div>

                  <div className={cn("grid gap-6", offer.schedule ? "md:grid-cols-2" : "")}>
                    {/* Prices */}
                    <div>
                      <p className="text-[10px] text-[#A1A1AA] uppercase tracking-widest font-semibold mb-3">Prices</p>
                      <div className="space-y-2">
                        {offer.prices.map((p) => {
                          const Icon = PRICE_ICONS[p.iconName] ?? Users;
                          return (
                            <div key={p.label} className="flex items-center justify-between bg-[#F5F5F5] rounded-xl px-4 py-3 border border-[#F4F4F5]">
                              <div className="flex items-center gap-2.5 text-sm text-[#52525B]">
                                <Icon className="w-3.5 h-3.5 text-[#A1A1AA]" />
                                {p.label}
                              </div>
                              <span className="text-base font-extrabold text-[#18181B]">{p.value}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Schedule */}
                    {offer.schedule && (
                      <div>
                        <p className="text-[10px] text-[#A1A1AA] uppercase tracking-widest font-semibold mb-3">Schedule</p>
                        <div className="space-y-2">
                          {offer.schedule.map((s) => (
                            <div key={s.label} className="flex items-start gap-3 bg-[#F5F5F5] rounded-xl px-4 py-3 border border-[#F4F4F5]">
                              <ArrowLeftRight className="w-3.5 h-3.5 text-[#A1A1AA] mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[10px] text-[#A1A1AA] uppercase tracking-wider">{s.label}</p>
                                <p className="text-sm font-semibold text-[#18181B]">{s.value}</p>
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
            <h2 className="text-2xl font-extrabold text-[#18181B] flex items-center gap-3">
              <span className="w-8 h-[2px] bg-[var(--brand-accent)] block" />
              Writing offer content
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {offers.notes.map((note) => (
                <div key={note.title} className="bg-white border border-[#F4F4F5] rounded-2xl p-6 space-y-2 hover:border-[#E4E4E7] transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: note.color }} />
                    <h3 className="text-sm font-extrabold text-[#18181B]">{note.title}</h3>
                  </div>
                  <p className="text-sm text-[#52525B] leading-relaxed font-light">{note.body}</p>
                </div>
              ))}
            </div>
          </motion.section>
        )}

      </div>
    </motion.div>
  );
}
