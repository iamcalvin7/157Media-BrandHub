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
  { number: "01", title: "Why VF", desc: "Reasons to choose Virtu Ferries — speed, comfort, convenience, car option. The crossing as the obvious choice." },
  { number: "02", title: "Why Sicily", desc: "Sells the destination, not the product. Food, culture, nature, events. If they want Sicily, VF is the natural next step." },
  { number: "03", title: "VF Recommends", desc: "Curated Sicily travel content — restaurants, trails, towns, seasonal events. VF as trusted local guide, not ticket seller." },
  { number: "04", title: "Virtu Ferries Experience", desc: "On-board experience, team stories, UGC from real passengers. Real people, real crossings, real moments." },
  { number: "05", title: "Sicily Experience", desc: "Immersive, sensory Sicily — food close-ups, colour, atmosphere, light. No hard sell. Let the island do the talking." },
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
        <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900">Social Media</h1>
        <p className="text-lg text-gray-500 font-light max-w-2xl">
          Two markets, three platforms. Each with its own audience, frame, and creative register.
        </p>
      </header>

      <section className="space-y-8">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#1e82b4] block"></span>
          Platforms & Cadence
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {MARKETS.map((mkt) => (
            <div key={mkt.market} className="p-6 bg-white border border-gray-100 rounded-2xl space-y-5">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">{mkt.market}</p>
                <p className="text-sm text-gray-500 font-light">{mkt.audience}</p>
                <p className="text-sm text-gray-400 font-light mt-1 italic">{mkt.frame}</p>
              </div>
              <div className="space-y-3 pt-2 border-t border-gray-100">
                {mkt.platforms.map((platform) => (
                  <div key={platform.name} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                      <platform.icon className={`w-5 h-5 ${platform.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{platform.name}</p>
                      <p className="text-xs text-[#1e82b4] truncate">{platform.handle}</p>
                    </div>
                    <div className="ml-auto text-right shrink-0">
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Cadence</p>
                      <p className="text-sm text-gray-700">{platform.cadence}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#f6a610] block"></span>
          Content Pillars
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.number}
              className="p-5 bg-white border border-gray-100 rounded-2xl flex items-start gap-4 hover:border-gray-200 transition-colors"
            >
              <span className="text-2xl font-bold text-white/10 font-mono leading-none pt-0.5 shrink-0">{pillar.number}</span>
              <div>
                <p className="font-semibold text-gray-900 mb-1">{pillar.title}</p>
                <p className="text-sm text-gray-400 font-light">{pillar.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span className="w-8 h-[2px] bg-gray-200 block"></span>
          Tone Registers
        </h2>
        <div className="space-y-4">
          {REGISTERS.map((reg) => (
            <div key={reg.label} className="p-6 bg-white border border-gray-100 rounded-2xl" style={{ borderLeftWidth: 3, borderLeftColor: reg.color }}>
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="sm:w-44 shrink-0">
                  <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Register</p>
                  <p className="font-semibold text-gray-900 text-sm">{reg.label}</p>
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-gray-600 font-light leading-relaxed">{reg.desc}</p>
                  <p className="text-sm text-gray-400 font-light italic">{reg.example}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#1e82b4] block"></span>
          Cross-Posting Logic
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-6 bg-white border border-gray-100 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="w-4 h-4 text-[#1e82b4]" />
              <p className="font-semibold text-gray-900 text-sm">Cross-post when</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-500 font-light">
              <li>Destination-led content</li>
              <li>Seasonal moments</li>
              <li>Experiential posts where format works on both platforms</li>
            </ul>
          </div>
          <div className="p-6 bg-white border border-gray-100 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Hash className="w-4 h-4 text-[#e01814]" />
              <p className="font-semibold text-gray-900 text-sm">Platform-specific when</p>
            </div>
            <ul className="space-y-2 text-sm text-gray-500 font-light">
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
