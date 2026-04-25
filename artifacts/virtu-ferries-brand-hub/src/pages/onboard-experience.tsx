import { motion } from "framer-motion";
import {
  Wifi, Crown, Coffee, Tv, Wind, Anchor, Sparkles, Armchair, Utensils,
  type LucideIcon,
} from "lucide-react";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";
import type { OnboardSection } from "@workspace/brand-knowledge";

const ICON_MAP: Record<OnboardSection["iconName"], LucideIcon> = {
  Wifi,
  Crown,
  Coffee,
  Tv,
  Wind,
  Anchor,
  Sparkles,
  Armchair,
  Utensils,
};

export default function OnboardExperience() {
  const { onboardExperience } = useBrandContent();
  const { headerKicker, headerTitle, headerSubtitle, sections, footer } = onboardExperience;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-4xl mx-auto space-y-12 pb-24"
    >
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-[var(--brand-primary)] text-sm font-semibold uppercase tracking-widest">
          <Wifi className="w-4 h-4" />
          {headerKicker}
        </div>
        <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900">{headerTitle}</h1>
        <p className="text-lg text-gray-500 font-light max-w-2xl">{headerSubtitle}</p>
      </header>

      {sections.length === 0 ? (
        <EmptySection
          title="Onboard experience not configured yet"
          message="Add the brand's connectivity, premium tiers, comfort, and food & drink amenities and they will appear here. The AI agent automatically picks them up via the brand knowledge feed."
        />
      ) : (
        <div className="space-y-10">
          {sections.map((section) => {
            const Icon = ICON_MAP[section.iconName] ?? Anchor;
            return (
              <motion.section
                key={section.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
                className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm space-y-5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${section.accent}15`, color: section.accent }}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <h2 className="text-xl md:text-2xl font-extrabold text-gray-900">{section.title}</h2>
                </div>

                {section.intro && (
                  <p className="text-sm md:text-base text-gray-700 leading-relaxed">{section.intro}</p>
                )}

                {section.bullets && section.bullets.length > 0 && (
                  <ul className="space-y-2.5 pl-1">
                    {section.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
                        <span
                          className="w-1.5 h-1.5 rounded-full mt-[7px] shrink-0"
                          style={{ backgroundColor: section.accent }}
                        />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.notes && section.notes.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {section.notes.map((n, i) => (
                      <div
                        key={i}
                        className="rounded-xl border-l-4 bg-gray-50 px-4 py-3"
                        style={{ borderColor: section.accent }}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                          {n.label}
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">{n.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>
            );
          })}
        </div>
      )}

      {footer && (
        <p className="text-xs text-gray-500 italic border-t border-gray-200 pt-4 leading-relaxed">
          {footer}
        </p>
      )}
    </motion.div>
  );
}
