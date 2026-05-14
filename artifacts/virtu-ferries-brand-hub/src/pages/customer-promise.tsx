import { motion } from "framer-motion";
import {
  ShieldCheck, RefreshCw, BadgeCheck, Car, Wallet, Check, Info, type LucideIcon,
} from "lucide-react";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";
import type { CustomerPromiseGroup } from "@workspace/brand-knowledge";

const GROUP_ICONS: Record<CustomerPromiseGroup["iconName"], LucideIcon> = {
  RefreshCw,
  BadgeCheck,
  Car,
  Wallet,
};

export default function CustomerPromise() {
  const { customerPromise } = useBrandContent();

  if (!customerPromise) {
    return (
      <div className="p-6 md:p-10 max-w-5xl mx-auto pb-24">
        <EmptySection
          title="Not available for this brand"
          message="The Customer Promise section is configured per brand. The currently active brand does not publish a fairness / no-hidden-fees promise."
        />
      </div>
    );
  }

  const {
    headerKicker, headerTitle, headerSubtitle, intro,
    groups, caveat, sourceUrl, sourceLabel,
  } = customerPromise;

  const hasIntro = typeof intro === "string" && intro.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-5xl mx-auto space-y-12 pb-24"
    >
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-[var(--brand-primary)] text-sm font-semibold uppercase tracking-widest">
          <ShieldCheck className="w-4 h-4" />
          {headerKicker}
        </div>
        <h1 className="font-extrabold text-4xl md:text-5xl text-[#18181B]">{headerTitle}</h1>
        <p className="text-lg text-[#71717A] font-light max-w-2xl">{headerSubtitle}</p>
      </header>

      {hasIntro && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border-2 border-[var(--brand-primary)]/15 bg-[var(--brand-primary)]/5 p-6 md:p-8"
        >
          <p className="text-base md:text-lg text-[#27272A] leading-relaxed font-medium">
            {intro}
          </p>
        </motion.section>
      )}

      {groups.length === 0 ? (
        <EmptySection
          title="Customer promise not configured yet"
          message="Add the brand's stated refund / change / fee policies and they will appear here and feed into the AI agent."
        />
      ) : (
        <section className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((g) => {
              const Icon = GROUP_ICONS[g.iconName] ?? ShieldCheck;
              return (
                <motion.article
                  key={g.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35 }}
                  className="rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-sm flex flex-col gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${g.accent}15`, color: g.accent }}
                    >
                      <Icon className="w-5 h-5" />
                    </span>
                    <h3 className="text-base font-extrabold text-[#18181B]">{g.title}</h3>
                  </div>
                  <ul className="space-y-3">
                    {g.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-[#3F3F46] leading-relaxed">
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: `${g.accent}20`, color: g.accent }}
                        >
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.article>
              );
            })}
          </div>
        </section>
      )}

      {caveat && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-amber-300 bg-amber-50 p-5 flex items-start gap-3"
        >
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Important caveat</p>
            <p className="text-sm text-amber-800 mt-0.5">{caveat}</p>
            <p className="text-xs text-amber-700/80 mt-2">
              Always state this caveat alongside any of the promises above when writing customer-facing copy.
            </p>
          </div>
        </motion.div>
      )}

      {sourceUrl && (
        <p className="text-xs text-[#A1A1AA] text-center pt-2 border-t border-[#F4F4F5]">
          Source — {sourceLabel ?? sourceUrl} · Always cross-check the live site before publishing customer-facing copy.
        </p>
      )}
    </motion.div>
  );
}
