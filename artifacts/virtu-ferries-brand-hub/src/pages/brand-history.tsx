import { motion } from "framer-motion";
import { Anchor, Ship, Flag, Globe, Calendar, Users, Car, TrendingUp } from "lucide-react";

const TIMELINE = [
  {
    year: "1988",
    title: "Founded in Malta",
    body: "Virtu Ferries established in Marsa, Malta. One catamaran. One route. A conviction that the crossing between Malta and Sicily deserved something faster.",
    accent: "#1e82b4",
  },
  {
    year: "2001",
    title: "Venezia Lines founded",
    body: "The Adriatic extension — Venezia Lines established to bring the same high-speed catamaran model to the North Adriatic. First commercial service launched May 2003.",
    accent: "#f6a610",
  },
  {
    year: "2010",
    title: "Jean de La Valette enters service",
    body: "Named after the Grand Master who commanded the Great Siege of Malta, the Jean de La Valette becomes the fleet's flagship — 106.5m, 800 passengers.",
    accent: "#1e82b4",
  },
  {
    year: "2019",
    title: "Saint John Paul II — new flagship",
    body: "The largest vessel in the fleet joins in March 2019. 110m, 900 passengers, Incat 089 hull. The Saint John Paul II takes over as flagship and sets a new standard for the crossing.",
    accent: "#f6a610",
  },
  {
    year: "Today",
    title: "36+ years. 250,000+ passengers a year.",
    body: "One of the longest-serving transport institutions in Malta. One of the few year-round high-speed ferry services in the Mediterranean. Still the fastest way between the two islands.",
    accent: "#e01814",
  },
];

const VESSELS = [
  {
    name: "Saint John Paul II",
    role: "Flagship",
    length: "110m",
    capacity: "900 passengers",
    hull: "Incat 089",
    inService: "March 2019",
    description:
      "The newest and largest vessel in the Virtu Ferries fleet. Named after the beloved Polish Pope who visited Malta in 1990, the Saint John Paul II brought a step-change in capacity and comfort to the Valletta–Pozzallo route.",
    accent: "#1e82b4",
  },
  {
    name: "Jean de La Valette",
    role: "Fleet vessel",
    length: "106.5m",
    capacity: "800 passengers",
    hull: "—",
    inService: "2010",
    description:
      "Named after Jean Parisot de la Valette, Grand Master of the Knights of Malta during the Great Siege of 1565. The city of Valletta — and the ferry route it anchors — bears his legacy.",
    accent: "#f6a610",
  },
];

const STATS = [
  { icon: Users, value: "250,000+", label: "passengers per year", color: "#1e82b4" },
  { icon: Car, value: "25,000+", label: "vehicles carried per year", color: "#f6a610" },
  { icon: Calendar, value: "36+", label: "years of continuous operation", color: "#e01814" },
  { icon: TrendingUp, value: "365", label: "days a year, almost daily", color: "#1e82b4" },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay },
});

export default function BrandHistory() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="pb-24"
    >
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-gray-100 bg-white">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#1e82b4]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#f6a610]/5 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 md:px-10 py-16 md:py-20">
          <motion.div {...fadeUp(0)} className="space-y-5 max-w-3xl">
            <div className="flex items-center gap-3">
              <Anchor className="w-5 h-5 text-[#1e82b4]" />
              <span className="text-xs font-semibold text-[#1e82b4] uppercase tracking-widest">Est. 1988</span>
            </div>
            <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900 leading-tight">
              36 years connecting<br className="hidden md:block" /> two islands.
            </h1>
            <p className="text-lg text-gray-500 font-light leading-relaxed max-w-2xl">
              Virtu Ferries was founded in Malta in 1988 with a single conviction — that the crossing between Malta and Sicily deserved something faster, more reliable, and worth making. We've been proving that ever since.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-10 space-y-20 pt-16">

        {/* Stats */}
        <motion.div {...fadeUp(0.05)}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3">
                <s.icon className="w-5 h-5" style={{ color: s.color }} />
                <p className="text-3xl font-extrabold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 leading-relaxed uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Timeline */}
        <motion.section {...fadeUp(0.1)} className="space-y-6">
          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <span className="w-8 h-[2px] bg-[#1e82b4] block" />
            The story so far
          </h2>

          <div className="relative">
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gray-100 md:left-[23px]" />

            <div className="space-y-8">
              {TIMELINE.map((item, i) => (
                <motion.div
                  key={item.year}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.12 + i * 0.07 }}
                  className="flex gap-6 relative"
                >
                  <div className="shrink-0 flex flex-col items-center pt-1">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[10px] font-bold z-10 shrink-0"
                      style={{ backgroundColor: item.accent }}
                    >
                      {item.year === "Today" ? (
                        <Anchor className="w-4 h-4" />
                      ) : (
                        <span className="text-[9px] font-extrabold leading-none text-center px-1">{item.year.slice(2)}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 bg-white border border-gray-100 rounded-2xl p-6 space-y-2 hover:border-gray-200 transition-colors">
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: item.accent }}>
                        {item.year}
                      </span>
                      <h3 className="text-base font-extrabold text-gray-900">{item.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed font-light">{item.body}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>

        {/* Fleet */}
        <motion.section {...fadeUp(0.15)} className="space-y-6">
          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <span className="w-8 h-[2px] bg-[#f6a610] block" />
            The fleet
          </h2>
          <p className="text-sm text-gray-400 -mt-2">Valletta Grand Harbour → Pozzallo, Sicily — exclusively catamarans, all vessels flying the Maltese flag.</p>

          <div className="grid md:grid-cols-2 gap-6">
            {VESSELS.map((v) => (
              <div key={v.name} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 transition-colors">
                <div className="h-2" style={{ backgroundColor: v.accent }} />
                <div className="p-7 space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Ship className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{v.role}</span>
                      </div>
                      <h3 className="text-xl font-extrabold text-gray-900">{v.name}</h3>
                    </div>
                    <span
                      className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: `${v.accent}15`, color: v.accent }}
                    >
                      In service {v.inService}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Length", value: v.length },
                      { label: "Capacity", value: v.capacity },
                      { label: "Hull", value: v.hull },
                    ].map((spec) => (
                      <div key={spec.label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{spec.label}</p>
                        <p className="text-sm font-semibold text-gray-900">{spec.value}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed font-light">{v.description}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Heritage note */}
        <motion.section {...fadeUp(0.2)} className="space-y-6">
          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <span className="w-8 h-[2px] bg-[#e01814] block" />
            Heritage as a content asset
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: Flag,
                title: "Maltese-flagged",
                body: "Every vessel flies the Maltese flag. For the English market — predominantly Maltese passengers — this is a point of quiet pride worth naming.",
                color: "#1e82b4",
              },
              {
                icon: Calendar,
                title: "Year-round, not seasonal",
                body: "Almost every high-speed ferry service in the Mediterranean stops for winter. Virtu doesn't. That consistency is a genuine differentiator — and a content angle.",
                color: "#f6a610",
              },
              {
                icon: Globe,
                title: "Mainstream, not niche",
                body: "250,000+ passengers a year means this isn't a discovery — it's an institution. Content should feel familiar and trusted, never like it's pitching a hidden secret.",
                color: "#e01814",
              },
              {
                icon: Anchor,
                title: "36 years — use it sparingly",
                body: "Heritage is credibility, not marketing gloss. Drop the founding year or vessel history into content when it earns its place — never as a lead.",
                color: "#1e82b4",
              },
            ].map((item) => (
              <div key={item.title} className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3 hover:border-gray-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${item.color}10` }}>
                    <item.icon className="w-4.5 h-4.5" style={{ color: item.color }} />
                  </div>
                  <h3 className="text-sm font-extrabold text-gray-900">{item.title}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed font-light">{item.body}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Venezia Lines */}
        <motion.section {...fadeUp(0.22)} className="space-y-4">
          <h2 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <span className="w-8 h-[2px] bg-[#1e82b4] block" />
            Venezia Lines
          </h2>
          <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col md:flex-row gap-8">
            <div className="space-y-3 flex-1">
              <p className="text-xs font-semibold text-[#1e82b4] uppercase tracking-widest">Adriatic subsidiary — Virtu Holdings</p>
              <h3 className="text-lg font-extrabold text-gray-900">North Adriatic routes, April – October</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-light">
                Founded in 2001, with first commercial service in May 2003. Venezia Lines brings the Virtu high-speed catamaran model to the Adriatic — connecting Venice and the Croatian coast through the summer season.
              </p>
            </div>
            <div className="flex flex-col gap-3 shrink-0">
              {[
                { label: "Founded", value: "2001" },
                { label: "First service", value: "May 2003" },
                { label: "Season", value: "April – October" },
                { label: "Fleet type", value: "High-speed catamaran" },
              ].map((d) => (
                <div key={d.label} className="flex items-center gap-4">
                  <span className="text-xs text-gray-400 w-24 shrink-0">{d.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.section>

      </div>
    </motion.div>
  );
}
