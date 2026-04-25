import { motion } from "framer-motion";
import {
  Ship, Clock, Luggage, Car, Dog, Accessibility, Truck, Bike,
  CreditCard, AlertTriangle, ExternalLink, Phone, Mail, Sparkles,
} from "lucide-react";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";

const ICONS = {
  CreditCard, Clock, Luggage, Car, Dog,
  Accessibility, Truck, Bike, Ship, AlertTriangle, Sparkles,
} as const;

export default function TravelInfo() {
  const { travelInfo } = useBrandContent();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-amber-50/20">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, var(--brand-primary), var(--brand-accent))` }}
            >
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">
                {travelInfo.headerKicker}
              </p>
              <h1 className="text-3xl font-bold text-gray-900">{travelInfo.headerTitle}</h1>
            </div>
          </div>
          <p className="text-gray-600 max-w-3xl leading-relaxed">
            {travelInfo.headerNote}
            {travelInfo.sourceUrl && travelInfo.sourceLabel && (
              <>
                {" "}
                <a
                  href={travelInfo.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--brand-primary)] hover:underline font-medium inline-flex items-center gap-1"
                >
                  {travelInfo.sourceLabel}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
          </p>

          {travelInfo.termsUrl && (
            <div className="mt-5 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 leading-relaxed">
                For refund policy and full conditions, see the{" "}
                <a
                  href={travelInfo.termsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold hover:underline"
                >
                  Conditions of Carriage
                </a>
                .
              </p>
            </div>
          )}
        </motion.div>

        {/* Quick contact strip */}
        {travelInfo.contacts && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10"
          >
            <a
              href={travelInfo.contacts.phoneHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 hover:border-[var(--brand-primary)]/40 hover:shadow-sm transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-[var(--brand-primary)]">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">{travelInfo.contacts.phoneLabel}</p>
                <p className="text-sm font-semibold text-gray-900">{travelInfo.contacts.phoneTarget}</p>
              </div>
            </a>
            <a
              href={travelInfo.contacts.emailHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 hover:border-[var(--brand-accent)]/40 hover:shadow-sm transition-all"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-[var(--brand-accent)]">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">{travelInfo.contacts.emailLabel}</p>
                <p className="text-sm font-semibold text-gray-900">{travelInfo.contacts.emailTarget}</p>
              </div>
            </a>
          </motion.div>
        )}

        {/* Sections */}
        {travelInfo.sections.length === 0 ? (
          <EmptySection
            title="Travel info not configured yet"
            message="Add booking, foot-passenger, vehicle, pet, and accessibility sections for this brand and they will appear here."
          />
        ) : (
          <div className="space-y-6">
            {travelInfo.sections.map((s, idx) => {
              const Icon = ICONS[s.iconName] ?? Ship;
              return (
                <motion.section
                  key={s.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.05 * idx }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: s.accent }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">{s.title}</h2>
                  </div>

                  <div className="px-6 py-5 space-y-4">
                    {s.intro && (
                      <p className="text-[15px] text-gray-700 leading-relaxed">{s.intro}</p>
                    )}

                    {s.bullets && s.bullets.length > 0 && (
                      <ul className="space-y-2.5">
                        {s.bullets.map((b, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
                            <span
                              className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                              style={{ backgroundColor: s.accent }}
                            />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {s.notes && s.notes.length > 0 && (
                      <div className="pt-2 space-y-3">
                        {s.notes.map((n, i) => (
                          <div key={i} className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                            <p className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-1">
                              {n.label}
                            </p>
                            <p className="text-sm text-gray-700 leading-relaxed">{n.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.section>
              );
            })}
          </div>
        )}

        {travelInfo.footer && (
          <p className="text-center text-xs text-gray-400 mt-12">{travelInfo.footer}</p>
        )}
      </div>
    </div>
  );
}
