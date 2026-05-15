import { motion } from "framer-motion";
import { Link } from "wouter";
import { MapPin, Clock, ArrowLeft } from "lucide-react";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";

export default function SicilyTowns() {
  const { sicilyTowns } = useBrandContent();

  if (!sicilyTowns || sicilyTowns.groups.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 md:p-10 max-w-4xl mx-auto space-y-6 pb-24"
      >
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#18181B] tracking-tight">Sicily Towns</h1>
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
      className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 pb-24"
    >
      <header className="space-y-2">
        <Link
          href="/sicily-resources"
          className="inline-flex items-center gap-1 text-[12px] text-[#A1A1AA] hover:text-[var(--brand-primary)] transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Sicily Resources
        </Link>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#18181B] tracking-tight">
          {sicilyTowns.headerTitle}
        </h1>
        <p className="text-sm text-[#71717A] font-light max-w-2xl leading-relaxed">{sicilyTowns.headerSubtitle}</p>
        {sicilyTowns.intro && (
          <p className="text-[13px] text-[#A1A1AA] font-light max-w-2xl italic pt-1">{sicilyTowns.intro}</p>
        )}
      </header>

      <div className="space-y-6">
        {sicilyTowns.groups.map((group) => (
          <section key={group.bracket} className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[var(--brand-primary)]" />
              <h2 className="text-sm font-semibold text-[#18181B]">{group.bracket}</h2>
            </div>
            {group.intro && (
              <p className="text-[13px] text-[#71717A] font-light max-w-2xl leading-relaxed">{group.intro}</p>
            )}
            <div className="grid sm:grid-cols-2 gap-2">
              {group.towns.map((t) => (
                <div
                  key={t.name}
                  className="p-3 bg-white border border-[#E4E4E7] rounded-lg flex items-start gap-2.5 hover:border-[var(--brand-primary)]/40 transition-colors"
                >
                  <MapPin className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0 mt-1" />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#18181B] text-[13px] leading-tight">{t.name}</p>
                    <p className="text-[13px] text-[#71717A] font-light leading-relaxed mt-1">{t.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {sicilyTowns.footer && (
        <p className="text-[13px] text-[var(--brand-primary)] bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/15 rounded-lg px-3 py-2.5 leading-relaxed">
          {sicilyTowns.footer}
        </p>
      )}
    </motion.div>
  );
}
