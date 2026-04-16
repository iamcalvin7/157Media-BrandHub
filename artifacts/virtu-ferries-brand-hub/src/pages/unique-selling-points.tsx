import { motion } from "framer-motion";
import {
  Clock, ShieldOff, Car, MapPin, Sparkles, Waves,
  CheckCircle2, XCircle, Anchor, Users, Star,
} from "lucide-react";

const USP_CARDS = [
  {
    icon: Clock,
    color: "#1e82b4",
    bg: "bg-blue-50",
    headline: "1 hour 45 minutes",
    subline: "Malta ↔ Sicily",
    body: "The fastest connection between Malta and Sicily — period. No combination of flights, transfers, and waiting comes close when you count door-to-door time honestly.",
  },
  {
    icon: ShieldOff,
    color: "#f6a610",
    bg: "bg-amber-50",
    headline: "No airport. No stress.",
    subline: "Board and go",
    body: "No check-in queues. No security theatre. No luggage allowance calculator. You arrive, you board, you sit down. The sea does the rest.",
  },
  {
    icon: Car,
    color: "#1e82b4",
    bg: "bg-blue-50",
    headline: "Travel your way",
    subline: "Foot passenger or car",
    body: "Fly to Sicily and you're dependent on rental desks and timetables. Sail with Virtu Ferries and Sicily is yours — on your own terms, in your own car.",
  },
  {
    icon: MapPin,
    color: "#e01814",
    bg: "bg-red-50",
    headline: "City centre to city centre",
    subline: "Valletta Grand Harbour → Pozzallo / Catania",
    body: "You don't arrive at a remote airport outside town. You arrive at the port. The real city. The right starting point for wherever you're going.",
  },
  {
    icon: Sparkles,
    color: "#f6a610",
    bg: "bg-amber-50",
    headline: "The intelligent choice",
    subline: "Premium, not expensive",
    body: "Factor in airport transfers, parking, and two hours of your life standing in queues. The ferry doesn't just win on comfort — it wins on total cost and total time. Always.",
  },
  {
    icon: Waves,
    color: "#1e82b4",
    bg: "bg-blue-50",
    headline: "The crossing itself",
    subline: "90km of Mediterranean",
    body: "Two islands. 90 kilometres of open sea. The crossing is not a gap between destinations — it is part of the experience. Golden hour on deck. Malta disappearing. Sicily coming into view.",
  },
];

const COMPARISON = [
  { label: "Door-to-door time", ferry: "≈ 2h 30m", flight: "4h+ (airport + transfer)", ferryWins: true },
  { label: "Luggage restrictions", ferry: "None", flight: "Fees, size limits, weight caps", ferryWins: true },
  { label: "Check-in process", ferry: "Board and sit", flight: "Arrive 2h early, security queue", ferryWins: true },
  { label: "Bring your car", ferry: "Yes", flight: "No", ferryWins: true },
  { label: "City centre arrival", ferry: "Grand Harbour / Pozzallo / Catania", flight: "Remote airport", ferryWins: true },
  { label: "Scenic experience", ferry: "Mediterranean views on deck", flight: "Seat 32B", ferryWins: true },
  { label: "Stress level", ferry: "Low", flight: "High", ferryWins: true },
];

const AUDIENCES = [
  {
    market: "English Market",
    flag: "🇬🇧",
    title: "The Maltese audience",
    color: "#1e82b4",
    borderColor: "border-[#1e82b4]",
    points: [
      "They already know the route — speak to them like it",
      "Sicily is the destination. VF is the obvious vehicle.",
      "Day trips, weekends, spontaneous escapes — all within reach",
      "The crossing is not a journey. It is practically a commute.",
    ],
    insight: "Don't over-explain the product. They know. Make them feel something.",
  },
  {
    market: "Italian Market",
    flag: "🇮🇹",
    title: "The Sicilian audience",
    color: "#e01814",
    borderColor: "border-[#e01814]",
    points: [
      "Malta is an aspirational short break — European, English-speaking, safe",
      "Different architecture, culture, and energy — closer than they think",
      "Posting on Facebook only for this market",
      "Captions in Italian, perspective selling Malta as the destination",
    ],
    insight: "Position Malta as the weekend they haven't thought of yet.",
  },
];

const QUICK_FACTS = [
  { label: "Crossing time", value: "1h 45m" },
  { label: "Distance", value: "90 km" },
  { label: "From Malta", value: "Valletta Grand Harbour" },
  { label: "To Sicily", value: "Pozzallo or Catania" },
  { label: "Season", value: "Year-round" },
  { label: "Passengers", value: "Foot + car" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
};

export default function UniqueSellingPoints() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-5xl mx-auto space-y-20 pb-24"
    >
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-3 text-[#1e82b4] text-sm font-semibold uppercase tracking-widest">
          <Anchor className="w-4 h-4" />
          Why Virtu Ferries
        </div>
        <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900">
          Unique Selling Points
        </h1>
        <p className="text-lg text-gray-500 font-light max-w-2xl">
          What makes Virtu Ferries the obvious choice — and how to talk about it without sounding like every other travel brand.
        </p>
      </header>

      {/* Quick facts strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {QUICK_FACTS.map(({ label, value }) => (
          <div
            key={label}
            className="bg-white border border-gray-100 rounded-2xl p-4 text-center shadow-sm"
          >
            <p className="text-lg font-extrabold text-gray-900 leading-tight">{value}</p>
            <p className="text-[11px] text-gray-400 mt-1 uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>

      {/* Core USPs */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#1e82b4] block" />
          The six reasons people choose VF
        </h2>
        <div className="grid md:grid-cols-2 gap-5">
          {USP_CARDS.map(({ icon: Icon, color, bg, headline, subline, body }, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="bg-white border border-gray-100 rounded-2xl p-6 flex gap-5 hover:shadow-md transition-shadow"
            >
              <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color }}>{subline}</p>
                <h3 className="text-lg font-extrabold text-gray-900 leading-snug">{headline}</h3>
                <p className="text-sm text-gray-500 font-light leading-relaxed">{body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Ferry vs Flight */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#f6a610] block" />
          Ferry vs Flight — the honest comparison
        </h2>
        <p className="text-sm text-gray-500 font-light">
          When the Maltese audience says "it might be faster to fly," this is the table you have in your head.
        </p>
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="grid grid-cols-3 text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-50 border-b border-gray-100 px-6 py-3">
            <span></span>
            <span className="flex items-center gap-1.5 text-[#1e82b4]">
              <Waves className="w-3.5 h-3.5" /> Virtu Ferries
            </span>
            <span className="text-gray-400">Flying</span>
          </div>
          {COMPARISON.map(({ label, ferry, flight, ferryWins }, i) => (
            <div
              key={i}
              className={`grid grid-cols-3 px-6 py-4 text-sm items-start ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} border-b border-gray-50 last:border-b-0`}
            >
              <span className="text-gray-500 font-medium text-xs pr-4">{label}</span>
              <span className="font-semibold text-gray-900 flex items-start gap-1.5">
                {ferryWins && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />}
                {ferry}
              </span>
              <span className="text-gray-400 font-light flex items-start gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-red-300 mt-0.5 shrink-0" />
                {flight}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Two audiences */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#e01814] block" />
          Two markets. Two conversations.
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {AUDIENCES.map(({ market, flag, title, color, borderColor, points, insight }) => (
            <div
              key={market}
              className={`bg-white border border-gray-100 rounded-2xl p-7 border-l-4 ${borderColor} space-y-5`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{flag}</span>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color }}>{market}</p>
                </div>
                <h3 className="text-xl font-extrabold text-gray-900">{title}</h3>
              </div>
              <ul className="space-y-3">
                {points.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600 font-light leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ backgroundColor: color }} />
                    {pt}
                  </li>
                ))}
              </ul>
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 italic border border-gray-100">
                <Star className="w-3.5 h-3.5 inline mr-1.5 mb-0.5 text-amber-400" />
                {insight}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Positioning statement */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span className="w-8 h-[2px] bg-gray-200 block" />
          The positioning in one sentence
        </h2>
        <div className="relative bg-white border border-gray-100 rounded-2xl p-10 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#1e82b4]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-[#f6a610]/5 rounded-full blur-3xl pointer-events-none" />
          <blockquote className="relative text-2xl md:text-3xl font-extrabold text-gray-900 leading-snug max-w-2xl">
            "The fastest, most civilised way between Malta and Sicily — for people who value their time."
          </blockquote>
          <p className="relative mt-5 text-sm text-gray-400 font-light max-w-xl">
            Everything in our communication — every caption, every visual brief, every story — should make this sentence feel true without ever having to say it.
          </p>
        </div>
      </section>

      {/* What not to do */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#e01814] block" />
          How <em>not</em> to sell these USPs
        </h2>
        <div className="grid md:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 border-l-4 border-l-[#1e82b4] space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1e82b4]" />
              Say it like this
            </h3>
            <ul className="space-y-3 text-sm text-gray-600 font-light leading-relaxed">
              <li>"No airport. No stress. Just sea."</li>
              <li>"Leave in the morning. Back for dinner."</li>
              <li>"Bring the car. Bring the family. Bring less stress."</li>
              <li>"Sicily is 1h 45 minutes from your front door."</li>
              <li>"Everyone knows Palermo. Not everyone knows they can be there by lunch."</li>
            </ul>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-6 border-l-4 border-l-[#e01814] space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-[#e01814]" />
              Never say this
            </h3>
            <ul className="space-y-3 text-sm text-gray-500 font-light leading-relaxed line-through decoration-gray-300">
              <li>"Did you know you can reach Sicily in just 1h 45 minutes?!"</li>
              <li>"Experience the breathtaking journey aboard our stunning fast ferry!"</li>
              <li>"Book now for an amazing Mediterranean adventure!"</li>
              <li>"Discover the magic of Sicily with Virtu Ferries today!"</li>
              <li>"Incredible value for an unforgettable crossing!"</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Crew/people */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#1e82b4] block" />
          The audience, simply
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: Users,
              label: "Maltese travellers",
              desc: "Day trips, weekends, holidays. They know the route. Speak to the feeling, not the fact.",
            },
            {
              icon: Anchor,
              label: "Sicilian visitors",
              desc: "Malta as a fresh, aspirational break. Facebook only. Italian captions.",
            },
            {
              icon: Star,
              label: "International hoppers",
              desc: "Using VF as a Mediterranean connection — island to island, culture to culture.",
            },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-2xl p-6 text-center space-y-3 hover:shadow-sm transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mx-auto">
                <Icon className="w-5 h-5 text-[#1e82b4]" />
              </div>
              <p className="font-bold text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-500 font-light leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
