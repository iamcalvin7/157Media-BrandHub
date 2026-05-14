import { motion } from "framer-motion";
import {
  Map as MapIcon, Sun, Snowflake, CalendarRange, MapPin,
  Mountain, Utensils, Landmark, Clock, Tag, ListChecks, Bus, AlertCircle, Users,
  type LucideIcon,
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
        <h1 className="font-extrabold text-4xl md:text-5xl text-[#18181B]">{headerTitle}</h1>
        <p className="text-lg text-[#71717A] font-light max-w-2xl">{headerSubtitle}</p>
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
              className="rounded-2xl border border-[#E4E4E7] bg-white p-6 md:p-8 shadow-sm"
            >
              <p className="text-base md:text-lg text-[#3F3F46] leading-relaxed font-light">
                {intro}
              </p>
            </motion.section>
          )}

          {highlightGroups.length > 0 && (
            <section className="space-y-5">
              <h2 className="text-2xl font-extrabold text-[#18181B]">What to look out for</h2>
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
                      className="rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-sm flex flex-col gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${g.accent}15`, color: g.accent }}
                        >
                          <Icon className="w-5 h-5" />
                        </span>
                        <h3 className="text-base font-extrabold text-[#18181B]">{g.title}</h3>
                      </div>
                      <ul className="space-y-2.5">
                        {g.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-[#3F3F46] leading-relaxed">
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
              <h2 className="text-2xl font-extrabold text-[#18181B]">Named excursions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((e) => {
                  const Season = SEASON_ICONS[e.season];
                  const tone = SEASON_TONE[e.season];
                  const hasDetails =
                    !!e.seasonDates ||
                    typeof e.minParticipants === "number" ||
                    (e.schedules && e.schedules.length > 0) ||
                    !!e.pricing ||
                    (e.itinerary && e.itinerary.length > 0) ||
                    !!e.localTransport ||
                    (e.operationalNotes && e.operationalNotes.length > 0);

                  return (
                    <motion.article
                      key={e.id}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35 }}
                      className="rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-sm space-y-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-extrabold text-[#18181B] leading-tight">{e.name}</h3>
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${tone.bg} ${tone.text}`}
                        >
                          <Season className="w-3.5 h-3.5" />
                          {e.season}
                        </span>
                      </div>

                      {e.destinations.length > 0 && (
                        <div className="flex items-start gap-2 text-xs text-[#71717A]">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span className="leading-relaxed">{e.destinations.join(" · ")}</span>
                        </div>
                      )}

                      {e.description && (
                        <p className="text-sm text-[#3F3F46] leading-relaxed">{e.description}</p>
                      )}

                      {(e.seasonDates || typeof e.minParticipants === "number") && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {e.seasonDates && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F4F4F5] text-[#3F3F46]">
                              <CalendarRange className="w-3.5 h-3.5" />
                              {e.seasonDates}
                            </span>
                          )}
                          {typeof e.minParticipants === "number" && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#F4F4F5] text-[#3F3F46]">
                              <Users className="w-3.5 h-3.5" />
                              Min {e.minParticipants} participants
                            </span>
                          )}
                        </div>
                      )}

                      {e.schedules && e.schedules.length > 0 && (
                        <div className="space-y-2 pt-1 border-t border-[#F4F4F5]">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#71717A]">
                            <Clock className="w-3.5 h-3.5" />
                            Schedule
                          </div>
                          <div className="space-y-2">
                            {e.schedules.map((s, i) => (
                              <div key={i} className="text-xs text-[#3F3F46]">
                                <div className="font-semibold">{s.label}</div>
                                <div className="text-[#71717A] mt-0.5 font-mono">
                                  {s.depMalta && <>DEP MLA {s.depMalta}</>}
                                  {s.arrPozzallo && <> · ARR POZ {s.arrPozzallo}</>}
                                  {s.depPozzallo && <> · DEP POZ {s.depPozzallo}</>}
                                  {s.arrMalta && <> · ARR MLA {s.arrMalta}</>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {e.pricing && (
                        <div className="space-y-1.5 pt-1 border-t border-[#F4F4F5]">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#71717A]">
                            <Tag className="w-3.5 h-3.5" />
                            Pricing
                          </div>
                          <div className="text-sm text-[#27272A]">
                            <span className="font-bold">Adults €{e.pricing.adultEur.toFixed(2)}</span>
                            <span className="text-[#71717A]"> · </span>
                            <span className="font-bold">Children €{e.pricing.childEur.toFixed(2)}</span>
                            {e.pricing.ageRange && (
                              <span className="text-xs text-[#71717A]"> ({e.pricing.ageRange})</span>
                            )}
                            {typeof e.pricing.underFreeAge === "number" && (
                              <span className="text-xs text-emerald-700 font-semibold"> · Under {e.pricing.underFreeAge} FREE</span>
                            )}
                          </div>
                          {e.pricing.etsNote && (
                            <p className="text-xs text-[#71717A] italic">{e.pricing.etsNote}</p>
                          )}
                          {e.pricing.notes?.map((n, i) => (
                            <p key={i} className="text-xs text-[#71717A]">{n}</p>
                          ))}
                        </div>
                      )}

                      {e.itinerary && e.itinerary.length > 0 && (
                        <details className="pt-1 border-t border-[#F4F4F5] group">
                          <summary className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#71717A] cursor-pointer select-none hover:text-[#3F3F46]">
                            <ListChecks className="w-3.5 h-3.5" />
                            Itinerary highlights ({e.itinerary.length})
                            <span className="text-[10px] text-[#A1A1AA] ml-auto group-open:hidden">Show</span>
                            <span className="text-[10px] text-[#A1A1AA] ml-auto hidden group-open:inline">Hide</span>
                          </summary>
                          <ol className="mt-2 space-y-1.5 pl-1 list-decimal list-inside marker:text-[#A1A1AA] marker:text-xs">
                            {e.itinerary.map((line, i) => (
                              <li key={i} className="text-xs text-[#3F3F46] leading-relaxed pl-1">
                                {line}
                              </li>
                            ))}
                          </ol>
                        </details>
                      )}

                      {e.localTransport && (
                        <div className="flex items-start gap-2 pt-1 border-t border-[#F4F4F5]">
                          <Bus className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#71717A]" />
                          <p className="text-xs text-[#52525B] leading-relaxed">{e.localTransport}</p>
                        </div>
                      )}

                      {e.operationalNotes && e.operationalNotes.length > 0 && (
                        <div className="space-y-1 pt-1 border-t border-[#F4F4F5]">
                          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#71717A]">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Operational notes
                          </div>
                          <ul className="space-y-1 pl-1">
                            {e.operationalNotes.map((n, i) => (
                              <li key={i} className="text-xs text-[#52525B] leading-relaxed">• {n}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {!hasDetails && (
                        <p className="text-[11px] text-[#A1A1AA] italic pt-1 border-t border-[#F4F4F5]">
                          Schedule, pricing and itinerary not yet captured — refer to the live site.
                        </p>
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
            <p className="text-xs text-[#A1A1AA] text-center pt-2 border-t border-[#F4F4F5]">
              Source — {sourceLabel ?? sourceUrl} · Always cross-check with the live site before publishing customer-facing copy.
            </p>
          )}
        </>
      )}
    </motion.div>
  );
}
