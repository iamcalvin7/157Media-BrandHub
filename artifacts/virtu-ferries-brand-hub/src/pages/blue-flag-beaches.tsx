import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Waves, Clock, MapPin } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface BeachRow {
  area: string;
  beaches: string;
  drive: string;
}

const NEAR_POZZALLO: BeachRow[] = [
  { area: "Pozzallo", beaches: "Pietre Nere, Raganzino", drive: "0–10 min" },
  { area: "Ispica", beaches: "Santa Maria del Focallo", drive: "15–25 min" },
  { area: "Modica", beaches: "Maganuco, Marina di Modica", drive: "20–35 min" },
  { area: "Scicli", beaches: "Sampieri, Pisciotto", drive: "30–45 min" },
  { area: "Ragusa", beaches: "Marina di Ragusa", drive: "45–60 min" },
];

const WIDER_SICILY: BeachRow[] = [
  { area: "Menfi", beaches: "Lido Fiori Bertolino, Porto Palo–Cipollazzo", drive: "~2h 30–3h" },
  { area: "Taormina", beaches: "Mazzeo", drive: "~2h 15–2h 45" },
  { area: "Letojanni", beaches: "Letojanni Centro", drive: "~2h 20–2h 50" },
  { area: "Alì Terme", beaches: "Lungomare", drive: "~2h 45–3h 15" },
  { area: "Nizza di Sicilia", beaches: "Spiaggia", drive: "~2h 45–3h 15" },
  { area: "Roccalumera", beaches: "Litorale", drive: "~2h 45–3h 15" },
  { area: "Furci Siculo", beaches: "Litorale", drive: "~2h 45–3h 15" },
  { area: "Santa Teresa di Riva", beaches: "Lungomare", drive: "~2h 45–3h 20" },
  { area: "Messina", beaches: "Messina Nord, Messina Sud, Messina Tirreno", drive: "~3h–3h 30" },
  { area: "Tusa", beaches: "Lungomare / Lampare / Marina", drive: "~3h 30–4h" },
];

function BeachTable({ rows }: { rows: BeachRow[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#FAFAFA] border-b border-[#E4E4E7] text-left">
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[#71717A]">
              Area
            </th>
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[#71717A]">
              Blue Flag beaches / coastline
            </th>
            <th className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[#71717A] whitespace-nowrap">
              Drive from Pozzallo
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.area}
              className={
                i !== rows.length - 1 ? "border-b border-[#F4F4F5]" : ""
              }
            >
              <td className="px-5 py-3.5 align-top">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[var(--brand-primary)] shrink-0" />
                  <span className="font-extrabold text-[#18181B]">{r.area}</span>
                </div>
              </td>
              <td className="px-5 py-3.5 align-top text-[#27272A] font-light leading-relaxed">
                {r.beaches}
              </td>
              <td className="px-5 py-3.5 align-top whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#52525B] bg-[#F4F4F5] rounded-full px-2.5 py-1">
                  <Clock className="w-3 h-3" />
                  {r.drive}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BlueFlagBeaches() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-5xl mx-auto space-y-10 pb-24"
    >
      <header className="space-y-4">
        <Link
          href="/sicily-towns"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA] hover:text-[var(--brand-primary)] uppercase tracking-widest"
        >
          <ArrowLeft className="w-3 h-3" />
          Sicily Towns
        </Link>
        <div className="flex items-center gap-2 text-[var(--brand-primary)] text-xs font-semibold uppercase tracking-widest">
          <Waves className="w-3.5 h-3.5" />
          <span>Coastline Atlas</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="block w-1.5 h-9 rounded bg-[var(--brand-primary)]" />
          <h1 className="font-extrabold text-4xl md:text-5xl text-[#18181B] tracking-tight leading-[1.04]">
            Blue Flag Beaches
          </h1>
        </div>
        <p className="text-lg text-[#71717A] font-light max-w-3xl leading-relaxed">
          Sicily's certified Blue Flag beaches, organised by approximate drive
          time from the Pozzallo terminal.
        </p>
        <div className="h-px bg-gradient-to-r from-gray-200 via-gray-200 to-transparent" />
      </header>

      <Tabs defaultValue="near" className="space-y-6">
        <TabsList className="bg-[#F4F4F5] h-10 p-1 rounded-xl">
          <TabsTrigger
            value="near"
            className="rounded-lg px-4 py-1.5 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#18181B] text-[#71717A]"
          >
            Near Pozzallo · within 1h
          </TabsTrigger>
          <TabsTrigger
            value="wider"
            className="rounded-lg px-4 py-1.5 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#18181B] text-[#71717A]"
          >
            Wider Sicily · 2h+
          </TabsTrigger>
        </TabsList>

        <TabsContent value="near" className="space-y-3">
          <p className="text-sm text-[#71717A] font-light max-w-3xl">
            Day-trip distance — easy to slot into a single crossing. Ideal for
            "pack the car, pick a beach" content.
          </p>
          <BeachTable rows={NEAR_POZZALLO} />
        </TabsContent>

        <TabsContent value="wider" className="space-y-3">
          <p className="text-sm text-[#71717A] font-light max-w-3xl">
            Western Sicily and the Ionian / Tyrrhenian coast — better suited to
            multi-day itineraries and "stay a weekend" stories.
          </p>
          <BeachTable rows={WIDER_SICILY} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
