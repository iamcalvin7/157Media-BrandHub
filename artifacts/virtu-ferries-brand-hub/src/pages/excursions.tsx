import { motion } from "framer-motion";
import {
  Map as MapIcon, Sun, Snowflake, CalendarRange, MapPin,
  Mountain, Utensils, Landmark, type LucideIcon,
} from "lucide-react";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";
import type { Excursion, ExcursionsHighlightGroup } from "@workspace/brand-knowledge";

const HIGHLIGHT_ICONS: Record<ExcursionsHighlightGroup["iconName"], LucideIcon> = {
  Mountain,
  Utensils,
  Landmark,
};

const SEASON_ICONS: Record<Excursion["season"], LucideIcon> = {
  Summer: Sun,
  Winter: Snowflake,
  "Year-round": CalendarRange,
};

const SEASON_TONE: Record<Excursion["season"], { bg: string; text: string }> = {
  Summer: { bg: "bg-amber-100", text: "text-amber-800" },
  Winter: { bg: "bg-sky-100", text: "text-sky-800" },
  "Year-round": { bg: "bg-emerald-100", text: "text-emerald-800" },
};

export default function Excursions() {
  const { excursions } = useBrandContent();

  if (!excursions) {
    return (
      <div className="p-6 md:p-10 max-w-5xl mx-auto pb-24">
        <EmptySection
          title="Not available for this brand"
          message="The Excursions section is configured per brand. The currently active brand does not include an excursions catalogue."
        />
      </div>
    );
  }

  const {
    headerKicker,
    headerTitle,
    headerSubtitle,
    intro,
    highlightGroups,
    excursions: items,
    closingNote,
    sourceUrl,
    sourceLabel,
  } = excursions;

  const hasIntro = typeof intro === "string" && intro.trim().length > 0;
  const isEmpty = items.length === 0 && highlightGroups.length === 0 && !hasIntro;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-5xl mx-auto space-y-12 pb-24"
    >
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-[var(--brand-primary)] text-sm font-semibold uppercase tracking-widest">
          <MapIcon className="w-4 h-4" />
          {headerKicker}
        </div>
        <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900">{headerTitle}</h1>
        <p className="text-lg text-gray-500 font-light max-w-2xl">{headerSubtitle}</p>
      </header>

      {isEmpty ? (
        <EmptySection
          title="Excursions not configured yet"
          message="Add the destination context (landscape, food, heritage) and named excursions for this brand and they will appear here. The AI agent automatically picks them up via the brand knowledge feed."
        />
      ) : (
        <>
          {hasIntro && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm"
            >
              <p className="text-base md:text-lg text-gray-700 leading-relaxed font-light">
                {intro}
              </p>
            </motion.section>
          )}

          {highlightGroups.length > 0 && (
            <section className="space-y-5">
              <h2 className="text-2xl font-extrabold text-gray-900">What to look out for</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {highlightGroups.map((g) => {
                  const Icon = HIGHLIGHT_ICONS[g.iconName] ?? Mountain;
                  return (
                    <motion.div
                      key={g.title}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35 }}
                      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${g.accent}15`, color: g.accent }}
                        >
                          <Icon className="w-5 h-5" />
                        </span>
                        <h3 className="text-base font-extrabold text-gray-900">{g.title}</h3>
                      </div>
                      <ul className="space-y-2.5">
                        {g.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                            <span
                              className="w-1.5 h-1.5 rounded-full mt-[7px] shrink-0"
                              style={{ backgroundColor: g.accent }}
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {items.length > 0 && (
            <section className="space-y-5">
              <h2 className="text-2xl font-extrabold text-gray-900">Named excursions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((e) => {
                  const Season = SEASON_ICONS[e.season];
                  const tone = SEASON_TONE[e.season];
                  return (
                    <motion.article
                      key={e.id}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35 }}
                      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-extrabold text-gray-900 leading-tight">{e.name}</h3>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${tone.bg} ${tone.text}`}
                        >
                          <Season className="w-3.5 h-3.5" />
                          {e.season}
                        </span>
                      </div>

                      {e.destinations.length > 0 && (
                        <div className="flex items-start gap-2 text-xs text-gray-500">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span className="leading-relaxed">{e.destinations.join(" · ")}</span>
                        </div>
                      )}

                      {e.description && (
                        <p className="text-sm text-gray-700 leading-relaxed">{e.description}</p>
                      )}
                    </motion.article>
                  );
                })}
              </div>
            </section>
          )}

          {closingNote && (
            <p className="text-center text-base md:text-lg italic text-[var(--brand-primary)] font-semibold pt-4">
              {closingNote}
            </p>
          )}

          {sourceUrl && (
            <p className="text-xs text-gray-400 text-center pt-2 border-t border-gray-100">
              Source — {sourceLabel ?? sourceUrl} · Always cross-check with the live site before publishing customer-facing copy.
            </p>
          )}
        </>
      )}
    </motion.div>
  );
}
