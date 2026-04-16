import { motion } from "framer-motion";
import { Anchor } from "lucide-react";

const SECTIONS = [
  {
    title: "The Route",
    color: "#1e82b4",
    items: [
      "Malta (Valletta Grand Harbour) ↔ Sicily (Pozzallo / Catania)",
      "90 km crossing — 1 hour 45 minutes",
      "Year-round service",
      "The only direct, scheduled high-speed ferry link between the two islands",
    ],
  },
  {
    title: "Speed & Convenience",
    color: "#1e82b4",
    items: [
      "Fastest connection between Malta and Sicily — no combination of flights and transfers comes close door-to-door",
      "No airport. No security queues. No check-in two hours early.",
      "No luggage restrictions or fees",
      "Board at a city-centre port and arrive at a city-centre port",
      "Travel as a foot passenger or bring your car, motorbike, or van",
    ],
  },
  {
    title: "The Fleet",
    color: "#f6a610",
    items: [
      "High-speed catamaran hull — purpose-built for open Mediterranean sea crossings",
      "Operates at speeds that make the 90 km crossing achievable in under 2 hours",
      "Stabilised ride designed for passenger comfort even in moderate sea conditions",
      "Multiple passenger decks with indoor and outdoor seating",
      "Vehicle deck capacity for cars, motorbikes, campervans, and light commercial vehicles",
      "Modern fleet maintained to international maritime safety standards",
    ],
  },
  {
    title: "Onboard Experience",
    color: "#f6a610",
    items: [
      "Air-conditioned passenger saloons with comfortable seating",
      "Outdoor deck access — open-air views of the Mediterranean throughout the crossing",
      "Onboard café and bar — food and drinks available for purchase",
      "Complimentary Wi-Fi available onboard",
      "TV screens throughout the passenger areas",
      "Dedicated seating areas including business-class style seats on some sailings",
      "Accessible facilities for passengers with reduced mobility",
      "Friendly, multilingual crew (Maltese, English, Italian)",
      "The crossing itself is part of the experience — golden hour on deck, Malta fading behind you, Sicily appearing ahead",
    ],
  },
  {
    title: "Value Positioning",
    color: "#1e82b4",
    items: [
      "Not a budget option — an intelligent one",
      "When you factor in airport transfers, parking, baggage fees, and 2+ hours of queuing, the ferry wins on total cost",
      "Adult return from €63.60 (One Day offer)",
      "Light car return from €109.00",
      "No hidden fees — what you see is what you pay",
      "Children's fares available",
    ],
  },
  {
    title: "The Two Audiences",
    color: "#e01814",
    items: [
      "English market: Maltese travellers using VF to reach Sicily for day trips, weekends, and holidays — they already know the route, speak to the feeling",
      "Italian market: Sicilians and mainland Italians for whom Malta is an aspirational short break — European, English-speaking, compact, and different",
      "International travellers using VF as a Mediterranean island-hop between two distinct cultures",
    ],
  },
  {
    title: "What Makes the Brand Different",
    color: "#1e82b4",
    items: [
      "Decades of operating this exact route — institutional knowledge no competitor can replicate",
      "A brand that talks like a well-travelled friend, not a ticket seller",
      "Sicily and Malta content that goes beyond what every travel brand already says",
      "The crossing is presented as an experience, not a means to an end",
      "Tone: confident, editorially sharp, never corporate, never gushing",
    ],
  },
  {
    title: "Ferry vs Flying — The Honest Case",
    color: "#e01814",
    items: [
      "Door-to-door: ~2h 30m by ferry vs 4h+ when you count airport time honestly",
      "Luggage: no restrictions by ferry vs fees, size limits, and weight caps by air",
      "Stress: board and sit by ferry vs arrive 2 hours early, queue, security, gate changes by air",
      "Car travel: possible by ferry, impossible by air without a rental desk",
      "Arrival point: city-centre port by ferry vs remote airport by air",
      "The view: open Mediterranean deck by ferry vs seat 32B by air",
    ],
  },
];

export default function UniqueSellingPoints() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-4xl mx-auto space-y-14 pb-24"
    >
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-[#1e82b4] text-sm font-semibold uppercase tracking-widest">
          <Anchor className="w-4 h-4" />
          Why Virtu Ferries
        </div>
        <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900">Unique Selling Points</h1>
        <p className="text-lg text-gray-500 font-light max-w-2xl">
          Everything that makes Virtu Ferries the obvious choice — and the language we use to say so.
        </p>
      </header>

      <div className="space-y-10">
        {SECTIONS.map(({ title, color, items }) => (
          <motion.section
            key={title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-3">
              <span className="w-6 h-[3px] rounded-full shrink-0" style={{ backgroundColor: color }} />
              {title}
            </h2>
            <ul className="space-y-3 pl-1">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-[7px] shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  {item}
                </li>
              ))}
            </ul>
          </motion.section>
        ))}
      </div>
    </motion.div>
  );
}
