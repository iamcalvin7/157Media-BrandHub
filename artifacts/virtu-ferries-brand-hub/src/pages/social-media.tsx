import { motion } from "framer-motion";
import { Facebook, Instagram, Hash } from "lucide-react";

const MARKETS = [
  {
    market: "English Market",
    audience: "Maltese locals",
    frame: "Malta as home base. Sicily as the irresistible neighbour.",
    platforms: [
      {
        name: "Facebook",
        handle: "facebook.com/virtuferries",
        icon: Facebook,
        cadence: "5 posts per week",
        color: "text-blue-400",
      },
    ],
  },
  {
    market: "Italian Market",
    audience: "Sicilians",
    frame: "Sicily as home. Malta as the discovery they didn't know they needed.",
    platforms: [
      {
        name: "Facebook",
        handle: "facebook.com/levacanzeMaltesi",
        icon: Facebook,
        cadence: "5 posts per week",
        color: "text-blue-400",
      },
      {
        name: "Instagram",
        handle: "instagram.com/virtuferrieslimited",
        icon: Instagram,
        cadence: "5 posts per week",
        color: "text-pink-400",
      },
    ],
  },
];

const PILLARS = [
  { number: "01", title: "Why VF", desc: "Convenience, speed, car option, experience" },
  { number: "02", title: "Why Sicily / Why Malta", desc: "Destination-led, cultural, sensory" },
  { number: "03", title: "VF Recommends", desc: "Curated local intel, trusted guide energy" },
  { number: "04", title: "VF Experience", desc: "On-board, crew, UGC, social proof" },
];

const REGISTERS = [
  {
    label: "Offer / Promotion",
    desc: "Confident, direct, tip-from-a-friend energy. Lead with value, not the discount.",
    example: '"Malta this weekend. Adults from €63.60 return. Go."',
    color: "#f6a610",
  },
  {
    label: "Destination Spotlight",
    desc: "Editorial, sensory, no superlatives. Like a well-travelled friend texting about a place they just found.",
    example: '"Modica doesn\'t have a beach. It doesn\'t need one."',
    color: "#1e82b4",
  },
  {
    label: "Operational / Disruption",
    desc: "Clear, calm, human. Acknowledge briefly, then focus on what passengers need to know and do.",
    example: '"Today\'s 10:00 from Pozzallo has been cancelled due to adverse weather. Here\'s what to do next."',
    color: "#e01814",
  },
  {
    label: "Cultural / Seasonal",
    desc: "Warm, present-tense, platform-native. Feels like it belongs to this moment, not scheduled six weeks ago.",
    example: '"It\'s April in Sicily. That\'s all."',
    color: "#1e82b4",
  },
];

export default function SocialMedia() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-5xl mx-auto space-y-16 pb-24"
    >
      <header className="space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl text-white">Social Media</h1>
        <p className="text-lg text-white/60 font-light max-w-2xl">
          Two markets, three platforms. Each with its own audience, frame, and creative register.
        </p>
      </header>

      <section className="space-y-8">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#1e82b4] block"></span>
          Platforms & Cadence
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {MARKETS.map((mkt) => (
            <div key={mkt.market} className="p-6 bg-[#141414] border border-white/5 rounded-2xl space-y-5">
              <div>
                <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-1">{mkt.market}</p>
                <p className="text-sm text-white/60 font-light">{mkt.audience}</p>
                <p className="text-sm text-white/40 font-light mt-1 italic">{mkt.frame}</p>
              </div>
              <div className="space-y-3 pt-2 border-t border-white/5">
                {mkt.platforms.map((platform) => (
                  <div key={platform.name} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <platform.icon className={`w-5 h-5 ${platform.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{platform.name}</p>
                      <p className="text-xs text-[#1e82b4] truncate">{platform.handle}</p>
                    </div>
                    <div className="ml-auto text-right shrink-0">
                      <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Cadence</p>
                      <p className="text-sm text-white/80">{platform.cadence}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#f6a610] block"></span>
          Content Pillars
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.number}
              className="p-5 bg-[#141414] border border-white/5 rounded-2xl flex items-start gap-4 hover:border-white/10 transition-colors"
            >
              <span className="text-2xl font-bold text-white/10 font-mono leading-none pt-0.5 shrink-0">{pillar.number}</span>
              <div>
                <p className="font-semibold text-white mb-1">{pillar.title}</p>
                <p className="text-sm text-white/50 font-light">{pillar.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <span className="w-8 h-[2px] bg-white/20 block"></span>
          Tone Registers
        </h2>
        <div className="space-y-4">
          {REGISTERS.map((reg) => (
            <div key={reg.label} className="p-6 bg-[#141414] border border-white/5 rounded-2xl" style={{ borderLeftWidth: 3, borderLeftColor: reg.color }}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="sm:w-44 shrink-0">
                  <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-1">Register</p>
                  <p className="font-semibold text-white text-sm">{reg.label}</p>
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-white/70 font-light leading-relaxed">{reg.desc}</p>
                  <p className="text-sm text-white/50 font-light italic">{reg.example}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#1e82b4] block"></span>
          Cross-Posting Logic
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-6 bg-[#141414] border border-white/5 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="w-4 h-4 text-[#1e82b4]" />
              <p className="font-semibold text-white text-sm">Cross-post when</p>
            </div>
            <ul className="space-y-2 text-sm text-white/60 font-light">
              <li>Destination-led content</li>
              <li>Seasonal moments</li>
              <li>Experiential posts where format works on both platforms</li>
            </ul>
          </div>
          <div className="p-6 bg-[#141414] border border-white/5 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="w-4 h-4 text-[#e01814]" />
              <p className="font-semibold text-white text-sm">Platform-specific when</p>
            </div>
            <ul className="space-y-2 text-sm text-white/60 font-light">
              <li>Reels — Instagram only</li>
              <li>Link-heavy posts — Facebook only</li>
              <li>Fit is clearly better on one platform</li>
            </ul>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
