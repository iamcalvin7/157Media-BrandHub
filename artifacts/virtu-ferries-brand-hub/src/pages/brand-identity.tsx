import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";

export default function BrandIdentity() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-5xl mx-auto space-y-16 pb-24"
    >
      <header className="space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl text-white">Brand Identity</h1>
        <p className="text-lg text-white/60 font-light max-w-2xl">
          We are the high-speed connection between Malta and Sicily. Our voice is travel-forward, confident, and editorially sharp.
        </p>
      </header>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#1e82b4] block"></span>
          Brand Story
        </h2>
        <div className="p-8 bg-[#141414] border border-white/5 rounded-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#1e82b4]/5 rounded-full blur-3xl pointer-events-none"></div>
          <p className="text-lg text-white/80 leading-relaxed font-light">
            Virtu Ferries connects Malta's Grand Harbour to Pozzallo, Sicily in 1h45m. 
            Foot passengers and vehicles welcome. The brand is travel-forward, editorially sharp — accessible but aspirational.
          </p>
        </div>
      </section>

      <div className="grid md:grid-cols-2 gap-8">
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
            <span className="w-8 h-[2px] bg-[#f6a610] block"></span>
            Tone of Voice
          </h2>
          <div className="h-full p-8 bg-[#141414] border border-white/5 rounded-2xl space-y-4">
            <p className="text-white/80 leading-relaxed font-light">
              Travel-forward and editorially sharp. Warm but not gushing. Confident but not corporate.
            </p>
            <p className="text-white/80 leading-relaxed font-light">
              Economy of language — no filler, no clichés. Feels like a well-travelled friend.
            </p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
            <span className="w-8 h-[2px] bg-[#1e82b4] block"></span>
            Key Messages
          </h2>
          <div className="h-full p-8 bg-[#141414] border border-white/5 rounded-2xl">
            <ul className="space-y-4">
              {[
                "Malta and Sicily are 90 minutes apart",
                "High-speed catamaran: modern and efficient",
                "Foot passengers and vehicles welcome",
                "Two cultures, one crossing"
              ].map((msg, i) => (
                <li key={i} className="flex items-start gap-3 text-white/80 font-light">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f6a610] mt-2 shrink-0" />
                  <span>{msg}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <span className="w-8 h-[2px] bg-white/20 block"></span>
          Vocabulary
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 bg-[#141414] border border-white/5 rounded-2xl border-l-4 border-l-[#1e82b4]">
            <h3 className="font-medium text-lg mb-4 flex items-center gap-2 text-white">
              <CheckCircle2 className="w-5 h-5 text-[#1e82b4]" />
              What to Say
            </h3>
            <ul className="space-y-3">
              <li className="text-white/70 font-light">"90 minutes of open sea"</li>
              <li className="text-white/70 font-light">"Valletta to Sicily before lunch"</li>
            </ul>
          </div>
          
          <div className="p-6 bg-[#141414] border border-white/5 rounded-2xl border-l-4 border-l-[#e01814]">
            <h3 className="font-medium text-lg mb-4 flex items-center gap-2 text-white">
              <XCircle className="w-5 h-5 text-[#e01814]" />
              What Not to Say
            </h3>
            <ul className="space-y-3">
              <li className="text-white/70 font-light line-through decoration-white/20">"Gateway to"</li>
              <li className="text-white/70 font-light line-through decoration-white/20">"Experience the magic"</li>
              <li className="text-white/70 font-light line-through decoration-white/20">"Your dream journey awaits"</li>
            </ul>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
