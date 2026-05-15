import { motion } from "framer-motion";
import { Link } from "wouter";
import { MapPin, Clock, ArrowLeft, Navigation, Waves, ArrowRight } from "lucide-react";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";

export default function SicilyTowns() {
  const { sicilyTowns } = useBrandContent();

  if (!sicilyTowns || sicilyTowns.groups.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 pb-24"
      >
        <header className="space-y-4">
          <h1 className="font-extrabold text-4xl md:text-5xl text-[#18181B] tracking-tight">Sicily Towns</h1>
        </header>
        <EmptySection
          title="Not configured for this brand"
          message="This atlas is specific to Virtu Ferries (Pozzallo terminal). It will appear here once Sicily town data is added for the active brand."
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-5xl mx-auto space-y-12 pb-24"
    >
      <header className="space-y-4">
        <Link
          href="/resources"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA] hover:text-[var(--brand-primary)] uppercase tracking-widest"
        >
          <ArrowLeft className="w-3 h-3" />
          Resources
        </Link>
        <div className="flex items-center gap-2 text-[var(--brand-primary)] text-xs font-semibold uppercase tracking-widest">
          <Navigation className="w-3.5 h-3.5" />
          <span>{sicilyTowns.headerKicker}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="block w-1.5 h-9 rounded bg-[var(--brand-primary)]" />
          <h1 className="font-extrabold text-4xl md:text-5xl text-[#18181B] tracking-tight leading-[1.04]">
            {sicilyTowns.headerTitle}
          </h1>
        </div>
        <p className="text-lg text-[#71717A] font-light max-w-3xl leading-relaxed">{sicilyTowns.headerSubtitle}</p>
        <div className="h-px bg-gradient-to-r from-gray-200 via-gray-200 to-transparent" />
        {sicilyTowns.intro && (
          <p className="text-sm text-[#71717A] font-light max-w-3xl italic">{sicilyTowns.intro}</p>
        )}
      </header>

      <Link
        href="/blue-flag-beaches"
        className="group flex items-center gap-4 p-4 bg-white border border-[#E4E4E7] rounded-2xl hover:border-[var(--brand-primary)]/40 transition-colors"
      >
        <div className="w-11 h-11 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--brand-primary)]/15 transition-colors">
          <Waves className="w-5 h-5 text-[var(--brand-primary)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-[#18181B] text-sm leading-tight">Blue Flag Beaches</p>
          <p className="text-sm text-[#71717A] font-light leading-relaxed mt-0.5">
            Sicily's certified Blue Flag coastline, grouped by drive time from Pozzallo.
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-[#A1A1AA] group-hover:text-[var(--brand-primary)] transition-colors shrink-0" />
      </Link>

      <div className="space-y-8">
        {sicilyTowns.groups.map((group, gi) => (
          <section key={group.bracket} className="space-y-4">
            <div className="flex items-baseline gap-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--brand-primary)]" />
                <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#18181B]">{group.bracket}</h2>
              </div>
              <span className="text-xs text-[#A1A1AA] font-mono tabular-nums">
                {String(gi + 1).padStart(2, "0")} / {String(sicilyTowns.groups.length).padStart(2, "0")}
              </span>
            </div>
            {group.intro && (
              <p className="text-sm text-[#71717A] font-light max-w-3xl leading-relaxed">{group.intro}</p>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              {group.towns.map((t) => (
                <div
                  key={t.name}
                  className="group p-4 bg-white border border-[#F4F4F5] rounded-2xl flex items-start gap-3 hover:border-[var(--brand-primary)]/30 transition-colors"
                >
                  <div className="w-9 h-9 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--brand-primary)]/15 transition-colors">
                    <MapPin className="w-4 h-4 text-[var(--brand-primary)]" />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="font-extrabold text-[#18181B] text-sm leading-tight">{t.name}</p>
                    <p className="text-sm text-[#71717A] font-light leading-relaxed mt-1">{t.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {sicilyTowns.footer && (
        <p className="text-sm text-[var(--brand-primary)] bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/15 rounded-xl px-4 py-3 leading-relaxed">
          {sicilyTowns.footer}
        </p>
      )}
    </motion.div>
  );
}
