import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";

export default function BrandIdentity() {
  const { identity } = useBrandContent();
  const hasAnyContent =
    identity.brandStory ||
    identity.toneOfVoice.length ||
    identity.keyMessages.length ||
    identity.whatToSay.length ||
    identity.whatNotToSay.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-5xl mx-auto space-y-16 pb-24"
    >
      <header className="space-y-5 pb-2">
        <span className="eyebrow text-[var(--brand-primary)]">
          <span className="accent-bar bg-[var(--brand-primary)]" />
          Brand · Identity
        </span>
        <h1 className="h-display text-gray-900">Brand Identity</h1>
        <p className="text-lg text-gray-500 font-light max-w-2xl leading-relaxed">{identity.headerSubtitle}</p>
        <div className="hairline-light pt-4" />
      </header>

      {!hasAnyContent && (
        <EmptySection
          title="Brand identity not configured yet"
          message="Add the brand story, tone of voice, key messages, and copy rules so every channel sounds the same."
        />
      )}

      {identity.brandStory && (
        <section className="space-y-6">
          <h2 className="h-section text-gray-900 flex items-center gap-3">
            <span className="accent-bar bg-[var(--brand-primary)]" />
            Brand Story
          </h2>
          <div className="p-8 bg-white border border-gray-100 rounded-2xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--brand-primary)]/5 rounded-full blur-3xl pointer-events-none"></div>
            <p className="text-lg text-gray-700 leading-relaxed font-light">{identity.brandStory}</p>
          </div>
        </section>
      )}

      {(identity.toneOfVoice.length > 0 || identity.keyMessages.length > 0) && (
        <div className="grid md:grid-cols-2 gap-8">
          {identity.toneOfVoice.length > 0 && (
            <section className="space-y-6">
              <h2 className="h-section text-gray-900 flex items-center gap-3">
                <span className="accent-bar bg-[var(--brand-accent)]" />
                Tone of Voice
              </h2>
              <div className="h-full p-8 bg-white border border-gray-100 rounded-2xl space-y-4">
                {identity.toneOfVoice.map((line, i) => (
                  <p key={i} className="text-gray-700 leading-relaxed font-light">{line}</p>
                ))}
              </div>
            </section>
          )}

          {identity.keyMessages.length > 0 && (
            <section className="space-y-6">
              <h2 className="h-section text-gray-900 flex items-center gap-3">
                <span className="accent-bar bg-[var(--brand-primary)]" />
                Key Messages
              </h2>
              <div className="h-full p-8 bg-white border border-gray-100 rounded-2xl">
                <ul className="space-y-4">
                  {identity.keyMessages.map((msg, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-700 font-light">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-accent)] mt-2 shrink-0" />
                      <span>{msg}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      )}

      {(identity.whatToSay.length > 0 || identity.whatNotToSay.length > 0) && (
        <section className="space-y-6">
          <h2 className="h-section text-gray-900 flex items-center gap-3">
            <span className="accent-bar bg-gray-300" />
            Copy Rules
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {identity.whatToSay.length > 0 && (
              <div className="p-6 bg-white border border-gray-100 rounded-2xl border-l-4 border-l-[var(--brand-primary)]">
                <h3 className="h-card mb-5 flex items-center gap-2 text-gray-900">
                  <CheckCircle2 className="w-5 h-5 text-[var(--brand-primary)]" />
                  What to Say
                </h3>
                <ul className="space-y-3">
                  {identity.whatToSay.map((item, i) => (
                    <li key={i} className="text-gray-600 font-light text-sm leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {identity.whatNotToSay.length > 0 && (
              <div className="p-6 bg-white border border-gray-100 rounded-2xl border-l-4 border-l-[var(--brand-alert)]">
                <h3 className="h-card mb-5 flex items-center gap-2 text-gray-900">
                  <XCircle className="w-5 h-5 text-[var(--brand-alert)]" />
                  What Not to Say
                </h3>
                <ul className="space-y-3">
                  {identity.whatNotToSay.map((item, i) => (
                    <li key={i} className="text-gray-600 font-light text-sm leading-relaxed line-through decoration-white/20">{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </motion.div>
  );
}
