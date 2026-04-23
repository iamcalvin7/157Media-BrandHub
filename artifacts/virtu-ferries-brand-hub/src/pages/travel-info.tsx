import { motion } from "framer-motion";
import {
  Ship, Clock, Luggage, Car, Dog, Accessibility, Truck, Bike,
  CreditCard, AlertTriangle, ExternalLink, Phone, Mail,
} from "lucide-react";

const BLUE = "#1e82b4";
const AMBER = "#f6a610";
const RED = "#e01814";

type Section = {
  id: string;
  title: string;
  icon: React.ElementType;
  accent: string;
  intro?: string;
  bullets?: string[];
  notes?: { label: string; body: string }[];
};

const SECTIONS: Section[] = [
  {
    id: "booking",
    title: "Before You Travel",
    icon: CreditCard,
    accent: BLUE,
    intro:
      "Bookings can be made online, by phone or by email — same price across all channels. Book early: space on the high-speed ferry is limited.",
    bullets: [
      "Advance reservations: payment within 48 hrs of booking",
      "Bookings within 3 days of departure: paid the same day",
      "Online bookings: paid immediately",
      "Unpaid reservations are auto-cancelled without prior notice",
    ],
    notes: [
      {
        label: "Info needed for passengers",
        body: "Full name & surname, date of birth, ID/passport number, nationality, mobile number, email address.",
      },
      {
        label: "Info needed for vehicles",
        body: "Make, model & registration number.",
      },
    ],
  },
  {
    id: "foot",
    title: "Foot Passengers",
    icon: Clock,
    accent: AMBER,
    bullets: [
      "Arrive at the terminal 1 hour before scheduled departure",
      "Check-in opens 2 hours before departure",
      "Check-in closes 30 minutes before departure",
    ],
  },
  {
    id: "luggage",
    title: "Personal Luggage",
    icon: Luggage,
    accent: BLUE,
    bullets: [
      "Up to 3 pieces of personal baggage per passenger",
      "Each piece up to 50 × 40 × 80 cm (170 linear cm)",
      "Stowed in baggage trolley or vessel storage as directed by crew",
      "Plus 1 hand luggage carried to your seat: max 37 × 45 × 25 cm and ≤ 5 kg",
    ],
  },
  {
    id: "car",
    title: "Travelling by Private Car",
    icon: Car,
    accent: AMBER,
    intro:
      "Pack your car, hop in, and away you go. No restrictions on personal luggage in your car — sports gear and family pets included. Illegal or dangerous goods are not allowed.",
    bullets: [
      "Arrive at the terminal 90 minutes before scheduled departure",
      "Loading order is at the discretion of the Master and Duty Officer (safety & logistics, not first-come)",
      "Caravans: charged at non-commercial light vehicle tariffs",
    ],
  },
  {
    id: "pets",
    title: "Accompanied Pets",
    icon: Dog,
    accent: RED,
    intro:
      "Pets must be declared at booking and carry a valid pet passport with all required vaccinations. Notify the crew on boarding. Pets are not allowed on coach transfers (except guide dogs). We recommend evening or early-morning sailings when temperatures are cooler.",
    bullets: [
      "Pet Cabin — A/C insulated cabin in the vehicle garage. Cages provided by Virtu Ferries. Water/food supplied by owner. Charged. Pre-book required. Max 1 pet per cage.",
      "Cage 1: 60 × 80 × 60 cm   ·   Cages 2–4: 73 × 102 × 76.5 cm   ·   Cages 5–7: 105 × 115 × 90 cm",
      "Pets in Vehicles — kept inside the car with windows open. First 3 pets in a vehicle are free of charge.",
      "Pets on outside deck — cats & dogs only, in a leak-proof cage max 91 × 64 × 67.5 cm. Owner must accompany throughout the voyage. Leash + muzzle when transiting passenger areas. Charged.",
      "Small pets in passenger areas — cats & dogs only, leak-proof carrier max 70 × 50 × 51.5 cm. Must remain inside carrier, on the floor next to the seat (never on tables/seats).",
    ],
    notes: [
      {
        label: "Service & Guide Dogs",
        body:
          "Welcome on board. Must be certified by Assistance Dogs International (ADI) or the International Guide Dogs Federation (IGDF). Must wear an identifying jacket and harness throughout the voyage.",
      },
      {
        label: "Pets are NOT allowed in passenger saloons or common areas",
        body:
          "Exceptions: small pets in carriers (rule above) and guide dogs. The Master may permit owners to visit pets in the garage or pet cabin during the voyage, accompanied by crew.",
      },
      {
        label: "Veterinary contacts — Malta",
        body:
          "Veterinary Regulation Directorate · +356 9917 0532 · petstravel.mafa@gov.mt — contact before booking if in doubt.",
      },
      {
        label: "Veterinary contacts — Pozzallo",
        body:
          "Ufficio Sanità Pubblica Veterinaria, Ragusa · +39 0932 234958 / 960 / 613 · igiene.allevamenti@asp.rg.it",
      },
    ],
  },
  {
    id: "accessibility",
    title: "Facilities for Persons with Special Needs",
    icon: Accessibility,
    accent: BLUE,
    intro:
      "The high-speed ferry is equipped with ramps, a lift and a toilet for persons with special needs. Euro Class and Club Class lounges are also accessible by lift.",
    bullets: [
      "Crew on board are happy to assist — speak to a crew member at any time",
      "We recommend notifying us at the time of booking so we can plan ahead",
      "Disability Card holders accommodated",
    ],
  },
  {
    id: "commercial",
    title: "Commercial Vehicles",
    icon: Truck,
    accent: AMBER,
    intro:
      "Drivers of commercial vehicles have a designated lounge reserved for them — feel free to use it.",
    bullets: [
      "Dangerous goods are governed by the IMDG Code — see Conditions of Carriage for details",
    ],
  },
  {
    id: "bike",
    title: "Me & My Bicycle",
    icon: Bike,
    accent: RED,
    intro:
      "Your bicycle travels free, subject to space being available. Please notify Virtu Ferries at the time of booking that you have an accompanying bicycle.",
  },
];

export default function TravelInfo() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-amber-50/20">
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${BLUE}, ${AMBER})` }}
            >
              <Ship className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold">
                Operational reference
              </p>
              <h1 className="text-3xl font-bold text-gray-900">Travel Info</h1>
            </div>
          </div>
          <p className="text-gray-600 max-w-3xl leading-relaxed">
            Authoritative passenger information drawn from{" "}
            <a
              href="https://www.virtuferries.com/travel-info/5"
              target="_blank"
              rel="noreferrer"
              className="text-[#1e82b4] hover:underline font-medium inline-flex items-center gap-1"
            >
              virtuferries.com/travel-info/5
              <ExternalLink className="w-3 h-3" />
            </a>
            . Use this as the source of truth when writing service-led content, replying to passenger
            questions, or briefing the team. The AI agent has the same rules baked into its knowledge.
          </p>

          <div className="mt-5 flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 leading-relaxed">
              For refund policy and full conditions, see the{" "}
              <a
                href="https://www.virtuferries.com/terms_and_conditions/23"
                target="_blank"
                rel="noreferrer"
                className="font-semibold hover:underline"
              >
                Conditions of Carriage
              </a>
              .
            </p>
          </div>
        </motion.div>

        {/* Quick contact strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10"
        >
          <a
            href="https://www.virtuferries.com/contact_us/13"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 hover:border-[#1e82b4]/40 hover:shadow-sm transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#1e82b4]">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Book by phone</p>
              <p className="text-sm font-semibold text-gray-900">Contact Virtu Ferries</p>
            </div>
          </a>
          <a
            href="https://www.virtuferries.com/contact_us/13"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 hover:border-[#f6a610]/40 hover:shadow-sm transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-[#f6a610]">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Book by email</p>
              <p className="text-sm font-semibold text-gray-900">reservations@virtuferries.com</p>
            </div>
          </a>
        </motion.div>

        {/* Sections */}
        <div className="space-y-6">
          {SECTIONS.map((s, idx) => (
            <motion.section
              key={s.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 * idx }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: s.accent }}
                >
                  <s.icon className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{s.title}</h2>
              </div>

              <div className="px-6 py-5 space-y-4">
                {s.intro && (
                  <p className="text-[15px] text-gray-700 leading-relaxed">{s.intro}</p>
                )}

                {s.bullets && s.bullets.length > 0 && (
                  <ul className="space-y-2.5">
                    {s.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-gray-700 leading-relaxed">
                        <span
                          className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                          style={{ backgroundColor: s.accent }}
                        />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {s.notes && s.notes.length > 0 && (
                  <div className="pt-2 space-y-3">
                    {s.notes.map((n, i) => (
                      <div key={i} className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                        <p className="text-[11px] uppercase tracking-widest text-gray-500 font-semibold mb-1">
                          {n.label}
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">{n.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.section>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-12">
          Source — virtuferries.com/travel-info/5 · Always cross-check with the live site before publishing customer-facing copy.
        </p>
      </div>
    </div>
  );
}
