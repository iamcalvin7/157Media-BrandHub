import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const LOGOS = [
  {
    label: "Full Colour",
    description: "For use on dark backgrounds — the primary version",
    src: "/logo.png",
    file: "/logo.png",
    filename: "virtu-ferries-logo-colour.png",
    bg: "bg-[#0d0d0d] border border-white/8",
  },
  {
    label: "White / Reversed",
    description: "For use on dark photographic or colour backgrounds",
    src: "/virtu-ferries-logo.png",
    file: "/virtu-ferries-logo.png",
    filename: "virtu-ferries-logo-white.png",
    bg: "bg-[#0d0d0d] border border-white/8",
  },
  {
    label: "Element Overlay",
    description: "Social media story overlay — English market",
    src: "/element-overlay.png",
    file: "/element-overlay.png",
    filename: "virtu-ferries-element-overlay.png",
    bg: "bg-black border border-white/8",
  },
  {
    label: "Element Overlay — Italian",
    description: "Social media story overlay — Italian market",
    src: "/element-overlay-it.png",
    file: "/element-overlay-it.png",
    filename: "virtu-ferries-element-overlay-it.png",
    bg: "bg-black border border-white/8",
  },
];

const COLOURS = [
  { name: "Primary Blue", hex: "#1e82b4", desc: "Mediterranean — primary CTA, links, UI", class: "bg-[#1e82b4]", text: "text-white" },
  { name: "Secondary Amber", hex: "#f6a610", desc: "Warm Gold — accents, highlights", class: "bg-[#f6a610]", text: "text-black" },
  { name: "Accent Red", hex: "#e01814", desc: "Vivid Red — urgency, alerts, logo mark", class: "bg-[#e01814]", text: "text-white" },
  { name: "Background", hex: "#0d0d0d", desc: "Dark Surface — primary background", class: "bg-[#0d0d0d] border border-white/10", text: "text-white" },
  { name: "Card Surface", hex: "#141414", desc: "Elevated — cards, panels", class: "bg-[#141414] border border-white/10", text: "text-white" },
];

function CopyHex({ hex }: { hex: string }) {
  const copy = () => navigator.clipboard.writeText(hex);
  return (
    <button
      onClick={copy}
      title="Copy hex"
      className="font-mono text-xs opacity-60 hover:opacity-100 transition-opacity cursor-pointer select-none"
    >
      {hex}
    </button>
  );
}

export default function Assets() {
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

      {/* Logo files */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#1e82b4] block" />
          Logo Files
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          {LOGOS.map((logo) => (
            <div key={logo.label} className="flex flex-col rounded-2xl overflow-hidden border border-white/5 bg-[#141414]">
              {/* Preview area */}
              <div className={`flex items-center justify-center h-44 p-8 ${logo.bg}`}>
                <img
                  src={logo.src}
                  alt={logo.label}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              {/* Meta + download */}
              <div className="p-4 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-white">{logo.label}</p>
                  <p className="text-xs text-white/45 font-light">{logo.description}</p>
                </div>
                <a href={logo.file} download={logo.filename}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0 text-[#1e82b4] hover:text-white hover:bg-[#1e82b4]/20 border border-[#1e82b4]/20 rounded-lg h-8 px-3 text-xs"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    PNG
                  </Button>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Logo usage */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <span className="w-8 h-[2px] bg-white/20 block" />
          Logo Usage
        </h2>

        {/* Logo mark breakdown */}
        <div className="p-6 bg-[#141414] border border-white/5 rounded-2xl space-y-5">
          <p className="text-sm text-white/50 uppercase tracking-widest font-semibold">The mark</p>
          <div className="flex items-center gap-8">
            <img src="/logo.png" alt="Logo mark" className="h-24 object-contain shrink-0" />
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#e01814] shrink-0" />
                <p className="text-sm text-white/70">Red V — speed, strength, direction</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#f6a610] shrink-0" />
                <p className="text-sm text-white/70">Amber curve — warmth, hospitality, connection</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#1e82b4] shrink-0" />
                <p className="text-sm text-white/70">Blue waves — the Mediterranean, movement</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="p-6 bg-[#141414] border border-white/5 rounded-2xl">
            <h3 className="font-medium text-lg mb-4 flex items-center gap-2 text-white">
              <CheckCircle2 className="w-5 h-5 text-[#1e82b4]" />
              Do
            </h3>
            <ul className="space-y-2.5">
              {[
                "Use the full-colour version on dark or neutral backgrounds",
                "Use the white reversed version on photographic or coloured backgrounds",
                "Maintain generous clear space — at least the height of the F in FERRIES",
                "Use only the supplied files — do not recreate the logo",
              ].map((item) => (
                <li key={item} className="text-white/70 font-light text-sm flex items-start gap-2">
                  <span className="text-[#1e82b4] mt-0.5">·</span> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-6 bg-[#141414] border border-white/5 rounded-2xl">
            <h3 className="font-medium text-lg mb-4 flex items-center gap-2 text-white">
              <XCircle className="w-5 h-5 text-[#e01814]" />
              Don't
            </h3>
            <ul className="space-y-2.5">
              {[
                "Stretch, skew, or distort the logo in any dimension",
                "Place on busy photographic backgrounds without sufficient contrast",
                "Change any of the logo colours to unofficial values",
                "Add outlines, shadows, or effects not in the supplied files",
              ].map((item) => (
                <li key={item} className="text-white/70 font-light text-sm flex items-start gap-2">
                  <span className="text-[#e01814] mt-0.5">·</span> {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Colour palette */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#f6a610] block" />
          Colour Palette
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {COLOURS.map((c) => (
            <div key={c.hex} className="space-y-3">
              <div className={`h-32 rounded-xl w-full ${c.class} shadow-lg flex items-end p-3`}>
                <CopyHex hex={c.hex} />
              </div>
              <div>
                <h3 className="font-medium text-sm text-white">{c.name}</h3>
                <p className="text-xs text-white/50">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/30 italic">Click any hex to copy it to clipboard.</p>
      </section>

      {/* Typography */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-white flex items-center gap-3">
          <span className="w-8 h-[2px] bg-white/20 block" />
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
              <p className="text-xs text-[#f6a610] uppercase tracking-widest font-semibold">Display Font</p>
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
    </motion.div>
  );
}
