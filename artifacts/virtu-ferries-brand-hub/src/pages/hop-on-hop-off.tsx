import { motion } from "framer-motion";
import { Bus, MapPin, Ticket, Baby, Users, Clock, AlertCircle } from "lucide-react";
import { useBrand } from "@/lib/brand";
import { EmptySection } from "@/components/EmptySection";

const STOPS: Array<{ n: number; name: string; times: (string | null)[] }> = [
  { n: 1,  name: "Mġarr Harbour",                       times: ["09:45","10:35","11:20","12:00","12:45","13:30","14:15","15:00","15:45*"] },
  { n: 2,  name: "Mixta Cave",                          times: ["09:55","10:45","11:30","12:10","12:55","13:40","14:25","15:10","15:55"] },
  { n: 3,  name: "Ramla",                               times: ["10:00","10:50","11:35","12:15","13:00","13:45","14:30","15:15","16:00"] },
  { n: 4,  name: "Ġgantija Temples & Ta' Kola Windmill",times: ["10:15","11:05","11:50","12:30","13:15","14:00","14:45","15:30","16:15"] },
  { n: 5,  name: "Savina Creativity Centre",            times: ["10:40","11:30","12:15","12:55","13:40","14:20","15:10","15:55", null ] },
  { n: 6,  name: "Marsalforn Bay (Salt Pans)",          times: ["10:55","11:45","12:30","13:10","13:55","14:35","15:25","16:10","16:30"] },
  { n: 7,  name: "Victoria Bus Station — Stop 1",       times: ["11:05","11:55","12:40","13:20","14:05","14:45","15:35","16:20","16:40"] },
  { n: 8,  name: "Ta' Pinu Sanctuary",                  times: ["11:25","12:15","13:00","13:45","14:30","15:10","15:55","16:45","17:00"] },
  { n: 9,  name: "Ta' Dbieġi Crafts Village",           times: ["11:30","12:20","13:05","13:50","14:35","15:15","16:05","16:50","17:05"] },
  { n: 10, name: "Azure Window (Dwejra)",               times: ["11:35","12:25","13:10","13:55","14:40","15:20","16:10","16:55","17:40"] },
  { n: 11, name: "Fontana",                             times: ["11:50","12:40","13:25","14:10","14:55","15:35","16:25","17:10","17:55"] },
  { n: 12, name: "Xlendi Bay",                          times: ["11:55","12:45","13:30","14:15","15:00","15:45","16:30","17:15","18:00"] },
  { n: 13, name: "Victoria Bus Station — Stop 2",       times: ["12:05","12:55","13:40","14:25","15:10","15:55","16:40","17:25","18:10"] },
  { n: 14, name: "Xewkija Square",                      times: ["12:10","13:00","13:45","14:30","15:15","16:00","16:45","17:30","18:20"] },
  { n: 1,  name: "Mġarr Harbour (loop ends)",           times: ["12:20","13:10","13:55","14:40","15:25","16:10","16:55","17:40","18:30"] },
];

const PRICES: Array<{ icon: typeof Users; label: string; price: string; note?: string }> = [
  { icon: Users, label: "Adult",                price: "€30" },
  { icon: Users, label: "Child (4 – 10 years)", price: "€20" },
  { icon: Baby,  label: "Infant (0 – 3 years)", price: "FREE" },
];

export default function HopOnHopOff() {
  const { activeBrand } = useBrand();
  const isGHS = activeBrand?.slug === "gozo-highspeed";

  if (!isGHS) {
    return (
      <div className="p-6 md:p-10 max-w-5xl mx-auto pb-24">
        <EmptySection
          title="Not available for this brand"
          message="The Hop-On Hop-Off bus tour is a Gozo Highspeed product. Switch to Gozo Highspeed from the brand picker to view this page."
        />
      </div>
    );
  }

  const ACCENT = "#1d3289"; // GHS primary blue
  const RED = "#ea2d3f";    // GHS red — alerts/highlights only

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-6xl mx-auto space-y-12 pb-24"
    >
      {/* Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
          <Bus className="w-4 h-4" />
          <span>Hop-On Hop-Off</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="block w-2 h-8 rounded" style={{ backgroundColor: ACCENT }} />
          <h1 className="font-extrabold text-4xl md:text-5xl tracking-tight leading-[1.04] text-gray-900">
            Bus tour around Gozo
          </h1>
        </div>
        <p className="text-lg text-gray-500 font-light max-w-2xl">
          One open-top green bus, 14 stops, all day. Hop off whenever you like — the next bus comes round the loop.
        </p>
      </header>

      {/* Prices */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <Ticket className="w-5 h-5" style={{ color: ACCENT }} />
          <h2 className="text-2xl md:text-[1.6rem] font-extrabold tracking-tight text-gray-900">Prices</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRICES.map(({ icon: Icon, label, price }) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex items-center gap-4"
            >
              <span
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${ACCENT}15`, color: ACCENT }}
              >
                <Icon className="w-6 h-6" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500 font-light">{label}</p>
                <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{price}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 font-light">
          <Clock className="w-4 h-4" />
          <span>Ticket valid for <strong className="text-gray-900 font-semibold">1 full day</strong> — unlimited hop on / hop off.</span>
        </div>
      </section>

      {/* Timetable */}
      <section className="space-y-5">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5" style={{ color: ACCENT }} />
          <h2 className="text-2xl md:text-[1.6rem] font-extrabold tracking-tight text-gray-900">Timetable & Stops</h2>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left font-extrabold text-xs uppercase tracking-wider text-gray-600 px-4 py-3 sticky left-0 bg-gray-50 z-10">
                    Stop
                  </th>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <th
                      key={i}
                      className="text-center font-extrabold text-xs uppercase tracking-wider text-gray-600 px-3 py-3 whitespace-nowrap"
                    >
                      Run {i + 1}
                      {i === 8 && <span className="block text-[10px] font-semibold normal-case mt-0.5" style={{ color: RED }}>Apr–Oct only</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STOPS.map((stop, idx) => {
                  const isLoopBack = idx === STOPS.length - 1;
                  return (
                    <tr key={idx} className={isLoopBack ? "bg-gray-50/60" : "hover:bg-gray-50/60 transition-colors"}>
                      <td className="px-4 py-3 sticky left-0 bg-inherit z-10 border-r border-gray-100">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-extrabold shrink-0"
                            style={{ backgroundColor: ACCENT }}
                          >
                            {stop.n}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 leading-tight">{stop.name}</p>
                            {isLoopBack && (
                              <p className="text-[11px] text-gray-500 font-light flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" /> Back to where you started
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {stop.times.map((t, i) => (
                        <td
                          key={i}
                          className="text-center px-3 py-3 font-mono text-gray-700 whitespace-nowrap"
                        >
                          {t === null ? <span className="text-gray-300">—</span> : (
                            <span className={t.endsWith("*") ? "font-semibold" : ""} style={t.endsWith("*") ? { color: RED } : undefined}>
                              {t.replace("*", "")}
                              {t.endsWith("*") && <span className="text-xs align-super">*</span>}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footnote */}
        <div
          className="rounded-xl p-4 flex items-start gap-3 border"
          style={{ borderColor: `${RED}33`, backgroundColor: `${RED}08` }}
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: RED }} />
          <p className="text-sm text-gray-700 font-light">
            <strong className="font-semibold text-gray-900">* The 15:45 departure from Mġarr Harbour</strong> does not run between November and March.
          </p>
        </div>
      </section>
    </motion.div>
  );
}
