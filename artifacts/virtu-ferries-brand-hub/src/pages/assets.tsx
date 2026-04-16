import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";

export default function Assets() {
  const colours = [
    { name: "Primary Blue", hex: "#1e82b4", desc: "Mediterranean", class: "bg-[#1e82b4]", text: "text-white" },
    { name: "Secondary Amber", hex: "#f6a610", desc: "Warm Gold", class: "bg-[#f6a610]", text: "text-black" },
    { name: "Accent Red", hex: "#e01814", desc: "Alert", class: "bg-[#e01814]", text: "text-white" },
    { name: "Background", hex: "#0d0d0d", desc: "Dark Surface", class: "bg-[#0d0d0d] border border-white/10", text: "text-white" },
    { name: "Card Surface", hex: "#141414", desc: "Elevated", class: "bg-[#141414] border border-white/10", text: "text-white" },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-5xl mx-auto space-y-16 pb-24"
    >
      <header className="space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl text-white">Assets & Guidelines</h1>
        <p className="text-lg text-white/60 font-light max-w-2xl">
          The visual components that make up the Virtu Ferries brand.
        </p>
      </header>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#1e82b4] block"></span>
          Colour Palette
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {colours.map((c) => (
            <div key={c.hex} className="space-y-3">
              <div className={`h-32 rounded-xl w-full ${c.class} shadow-lg flex items-end p-3`}>
                <span className={`font-mono text-xs opacity-70 ${c.text}`}>{c.hex}</span>
              </div>
              <div>
                <h3 className="font-medium text-sm text-white">{c.name}</h3>
                <p className="text-xs text-white/50">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#f6a610] block"></span>
          Typography
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-8 bg-[#141414] border border-white/5 rounded-2xl space-y-6">
            <div className="space-y-2">
              <p className="text-xs text-[#1e82b4] uppercase tracking-widest font-semibold">Primary Font</p>
              <h3 className="text-3xl font-sans text-white">Montserrat</h3>
            </div>
            <div className="space-y-3 font-sans">
              <p className="font-light text-white/70 text-2xl">Light 300 for elegant body copy</p>
              <p className="font-normal text-white/80 text-2xl">Regular 400 for UI elements</p>
              <p className="font-bold text-white text-2xl">Bold 700 for headlines</p>
            </div>
          </div>
          <div className="p-8 bg-[#141414] border border-white/5 rounded-2xl space-y-6">
            <div className="space-y-2">
              <p className="text-xs text-[#f6a610] uppercase tracking-widest font-semibold">Secondary Font</p>
              <h3 className="text-4xl font-serif text-white">Dancing Script</h3>
            </div>
            <div className="space-y-3 font-serif">
              <p className="font-bold text-white/80 text-3xl">For display moments only.</p>
              <p className="font-bold text-[#f6a610] text-3xl">Adds an artisanal touch.</p>
              <p className="font-bold text-white/60 text-3xl">Use sparingly.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <span className="w-8 h-[2px] bg-white/20 block"></span>
          Logo Usage
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 bg-[#141414] border border-white/5 rounded-2xl">
            <h3 className="font-medium text-lg mb-4 flex items-center gap-2 text-white">
              <CheckCircle2 className="w-5 h-5 text-[#1e82b4]" />
              Do
            </h3>
            <ul className="space-y-3">
              <li className="text-white/70 font-light">Use on dark backgrounds</li>
              <li className="text-white/70 font-light">Maintain clear space around the logo</li>
              <li className="text-white/70 font-light">Use official brand colours</li>
            </ul>
          </div>
          
          <div className="p-6 bg-[#141414] border border-white/5 rounded-2xl">
            <h3 className="font-medium text-lg mb-4 flex items-center gap-2 text-white">
              <XCircle className="w-5 h-5 text-[#e01814]" />
              Don't
            </h3>
            <ul className="space-y-3">
              <li className="text-white/70 font-light">Stretch or distort the logo</li>
              <li className="text-white/70 font-light">Use on busy photographic backgrounds</li>
              <li className="text-white/70 font-light">Change the logo colours to unofficial hexes</li>
            </ul>
          </div>
        </div>
      </section>
    </motion.div>
  );
}
