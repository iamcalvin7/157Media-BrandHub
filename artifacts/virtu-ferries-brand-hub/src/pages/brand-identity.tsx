import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";

const KEY_MESSAGES = [
  "The fastest way between Malta and Sicily",
  "Travel by foot or bring your car",
  "A crossing worth making, not just taking",
  "Two islands. One ferry. Endless reasons to go.",
];

const WHAT_TO_SAY = [
  "Specific place names, food, seasons, cultural moments",
  "Short, confident sentences with real rhythm",
  "Copy that earns the reader's time",
  "Platform-native language that doesn't feel scheduled",
];

const WHAT_NOT_TO_SAY = [
  '"Paradise", "breathtaking", "unforgettable", "hidden gem"',
  "Generic travel language that could belong to any brand",
  "Pushy CTAs that treat the audience like a conversion target",
  "Exclamation marks used for enthusiasm rather than meaning",
];

export default function BrandIdentity() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-5xl mx-auto space-y-16 pb-24"
    >
      <header className="space-y-4">
        <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900">Brand Identity</h1>
        <p className="text-lg text-gray-500 font-light max-w-2xl">
          We are the high-speed connection between Malta and Sicily. Our voice is travel-forward, confident, and editorially sharp.
        </p>
      </header>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#1e82b4] block"></span>
          Brand Story
        </h2>
        <div className="p-8 bg-white border border-gray-100 rounded-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#1e82b4]/5 rounded-full blur-3xl pointer-events-none"></div>
          <p className="text-lg text-gray-700 leading-relaxed font-light">
            Virtu Ferries has been connecting Malta and Sicily for decades. Not just two ports — two cultures, two ways of life, two islands that have more in common than most people realise. The crossing takes 1 hour 45 minutes. What you discover on the other side stays with you longer.
          </p>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-8">
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <span className="w-8 h-[2px] bg-[#f6a610] block"></span>
            Tone of Voice
          </h2>
          <div className="h-full p-8 bg-white border border-gray-100 rounded-2xl space-y-4">
            <p className="text-gray-700 leading-relaxed font-light">
              Travel-forward and editorially sharp. Warm but not gushing. Confident but not corporate.
            </p>
            <p className="text-gray-700 leading-relaxed font-light">
              Economy of language — no filler, no clichés. Feels like a well-travelled friend, not a brand account.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <span className="w-8 h-[2px] bg-[#1e82b4] block"></span>
            Key Messages
          </h2>
          <div className="h-full p-8 bg-white border border-gray-100 rounded-2xl">
            <ul className="space-y-4">
              {KEY_MESSAGES.map((msg, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-700 font-light">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f6a610] mt-2 shrink-0" />
                  <span>{msg}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span className="w-8 h-[2px] bg-gray-200 block"></span>
          Copy Rules
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 bg-white border border-gray-100 rounded-2xl border-l-4 border-l-[#1e82b4]">
            <h3 className="font-medium text-lg mb-5 flex items-center gap-2 text-gray-900">
              <CheckCircle2 className="w-5 h-5 text-[#1e82b4]" />
              What to Say
            </h3>
            <ul className="space-y-3">
              {WHAT_TO_SAY.map((item, i) => (
                <li key={i} className="text-gray-600 font-light text-sm leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>

          <div className="p-6 bg-white border border-gray-100 rounded-2xl border-l-4 border-l-[#e01814]">
            <h3 className="font-medium text-lg mb-5 flex items-center gap-2 text-gray-900">
              <XCircle className="w-5 h-5 text-[#e01814]" />
              What Not to Say
            </h3>
            <ul className="space-y-3">
              {WHAT_NOT_TO_SAY.map((item, i) => (
                <li key={i} className="text-gray-600 font-light text-sm leading-relaxed line-through decoration-white/20">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
