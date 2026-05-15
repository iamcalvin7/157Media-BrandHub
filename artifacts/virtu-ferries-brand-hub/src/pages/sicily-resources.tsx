import { motion } from "framer-motion";
import { Link } from "wouter";
import { Navigation, Waves, MapPin, Clock, ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface ResourceCard {
  href: string;
  title: string;
  description: string;
  meta: string;
  icon: LucideIcon;
}

const CARDS: ResourceCard[] = [
  {
    href: "/sicily-towns",
    title: "Sicily Towns",
    description:
      "Atlas of towns reachable from the Pozzallo terminal, grouped by drive time — your reference for destination content.",
    meta: "Towns under 4h",
    icon: MapPin,
  },
  {
    href: "/blue-flag-beaches",
    title: "Blue Flag Beaches",
    description:
      "Sicily's certified Blue Flag coastline, split between day-trip distance and wider weekend itineraries.",
    meta: "Coastline atlas",
    icon: Waves,
  },
];

export default function SicilyResources() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-5xl mx-auto space-y-10 pb-24"
    >
      <header className="space-y-4">
        <div className="flex items-center gap-2 text-[var(--brand-primary)] text-xs font-semibold uppercase tracking-widest">
          <Navigation className="w-3.5 h-3.5" />
          <span>Sicily Reference</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="block w-1.5 h-9 rounded bg-[var(--brand-primary)]" />
          <h1 className="font-extrabold text-4xl md:text-5xl text-[#18181B] tracking-tight leading-[1.04]">
            Sicily Resources
          </h1>
        </div>
        <p className="text-lg text-[#71717A] font-light max-w-3xl leading-relaxed">
          Reference material for building Sicily-side destination content —
          everything anchored to the Pozzallo terminal as the starting point.
        </p>
        <div className="h-px bg-gradient-to-r from-gray-200 via-gray-200 to-transparent" />
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="group p-5 bg-white border border-[#E4E4E7] rounded-2xl hover:border-[var(--brand-primary)]/40 transition-colors flex flex-col gap-4 min-h-[180px]"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center group-hover:bg-[var(--brand-primary)]/15 transition-colors">
                  <Icon className="w-5 h-5 text-[var(--brand-primary)]" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#71717A] bg-[#F4F4F5] rounded-full px-2.5 py-1">
                  <Clock className="w-3 h-3" />
                  {c.meta}
                </span>
              </div>
              <div className="flex-1 space-y-1.5">
                <h2 className="font-extrabold text-[#18181B] text-lg leading-tight">
                  {c.title}
                </h2>
                <p className="text-sm text-[#71717A] font-light leading-relaxed">
                  {c.description}
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-primary)] uppercase tracking-widest">
                Open
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
