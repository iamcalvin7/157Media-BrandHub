import { motion } from "framer-motion";
import { Link } from "wouter";
import { Waves, ArrowRight } from "lucide-react";
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
    href: "/blue-flag-beaches-malta",
    title: "Blue Flag Beaches",
    description:
      "Malta and Gozo's certified Blue Flag beaches, sourced from the official Nature Trust Malta listing.",
    meta: "Coastline atlas",
    icon: Waves,
  },
];

export default function MaltaResources() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 pb-24"
    >
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#18181B] tracking-tight">
          Malta Resources
        </h1>
        <p className="text-sm text-[#71717A] font-light max-w-2xl leading-relaxed">
          Reference material for Malta-side destination content — used on the
          Italy-facing channel ("Choose Malta") and as background for any
          Maltese-market post about local beaches, towns, or events.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-3">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="group p-4 bg-white border border-[#E4E4E7] rounded-xl hover:border-[var(--brand-primary)]/40 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-[var(--brand-primary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-semibold text-[#18181B] text-[15px] leading-tight">
                      {c.title}
                    </h2>
                    <ArrowRight className="w-3.5 h-3.5 text-[#A1A1AA] group-hover:text-[var(--brand-primary)] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                  <p className="text-[13px] text-[#71717A] font-light leading-relaxed mt-1">
                    {c.description}
                  </p>
                  <p className="text-[11px] text-[#A1A1AA] font-medium mt-2">
                    {c.meta}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
