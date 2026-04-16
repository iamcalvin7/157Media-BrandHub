import { motion } from "framer-motion";
import { Instagram, Facebook, Twitter, Linkedin, Hash } from "lucide-react";

export default function SocialMedia() {
  const platforms = [
    { name: "Instagram", handle: "@virtuferries", icon: Instagram, cadence: "4–5x/week (Reels + static)", color: "text-pink-500" },
    { name: "Facebook", handle: "/virtuferries", icon: Facebook, cadence: "3–4x/week", color: "text-blue-500" },
    { name: "X (Twitter)", handle: "@virtuferries", icon: Twitter, cadence: "Daily", color: "text-white" },
    { name: "LinkedIn", handle: "/company/virtu-ferries", icon: Linkedin, cadence: "1–2x/week", color: "text-blue-400" },
  ];

  const pillars = [
    "The Crossing",
    "Malta",
    "Sicily",
    "Travel Tips",
    "People & Stories"
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-5xl mx-auto space-y-16 pb-24"
    >
      <header className="space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl text-white">Social Media</h1>
        <p className="text-lg text-white/60 font-light max-w-2xl">
          Guidelines for our digital presence. Consistent cadence, clear pillars, editorially sharp.
        </p>
      </header>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#1e82b4] block"></span>
          Channels & Cadence
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {platforms.map((platform) => (
            <div key={platform.name} className="p-6 bg-[#141414] border border-white/5 rounded-2xl hover:border-white/10 transition-colors group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <platform.icon className={`w-6 h-6 ${platform.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-white">{platform.name}</h3>
                  <p className="text-sm text-[#1e82b4]">{platform.handle}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/5">
                <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1">Target Cadence</p>
                <p className="text-sm text-white/80">{platform.cadence}</p>
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
        <div className="flex flex-wrap gap-3">
          {pillars.map((pillar) => (
            <div 
              key={pillar} 
              className="px-5 py-3 bg-[#141414] border border-white/10 rounded-full flex items-center gap-2 text-white/80 hover:text-white hover:border-[#f6a610] transition-colors cursor-default"
            >
              <Hash className="w-4 h-4 text-[#f6a610]" />
              <span className="font-medium">{pillar}</span>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
