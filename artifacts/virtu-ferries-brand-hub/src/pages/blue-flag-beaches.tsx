import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Clock, MapPin } from "lucide-react";
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
    <div className="overflow-hidden rounded-lg border border-[#E4E4E7] bg-white">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-[#FAFAFA] border-b border-[#E4E4E7] text-left">
            <th className="px-4 py-2.5 text-[11px] font-medium text-[#71717A]">Area</th>
            <th className="px-4 py-2.5 text-[11px] font-medium text-[#71717A]">Beaches / coastline</th>
            <th className="px-4 py-2.5 text-[11px] font-medium text-[#71717A] whitespace-nowrap">
              Drive
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.area}
              className={i !== rows.length - 1 ? "border-b border-[#F4F4F5]" : ""}
            >
              <td className="px-4 py-2.5 align-top">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-[var(--brand-primary)] shrink-0" />
                  <span className="font-semibold text-[#18181B]">{r.area}</span>
                </div>
              </td>
              <td className="px-4 py-2.5 align-top text-[#52525B] font-light leading-relaxed">
                {r.beaches}
              </td>
              <td className="px-4 py-2.5 align-top whitespace-nowrap">
                <span className="inline-flex items-center gap-1 text-[12px] text-[#71717A]">
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
      className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 pb-24"
    >
      <header className="space-y-2">
        <Link
          href="/sicily-resources"
          className="inline-flex items-center gap-1 text-[12px] text-[#A1A1AA] hover:text-[var(--brand-primary)] transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Sicily Resources
        </Link>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#18181B] tracking-tight">
          Blue Flag Beaches
        </h1>
        <p className="text-sm text-[#71717A] font-light max-w-2xl leading-relaxed">
          Sicily's certified Blue Flag beaches, organised by approximate drive
          time from the Pozzallo terminal.
        </p>
      </header>

      <Tabs defaultValue="near" className="space-y-5">
        <TabsList className="bg-[#F4F4F5] h-9 p-0.5 rounded-lg">
          <TabsTrigger
            value="near"
            className="rounded-md px-3 py-1 text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:text-[#18181B] text-[#71717A]"
          >
            Near Pozzallo · within 1h
          </TabsTrigger>
          <TabsTrigger
            value="wider"
            className="rounded-md px-3 py-1 text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:text-[#18181B] text-[#71717A]"
          >
            Wider Sicily · 2h+
          </TabsTrigger>
        </TabsList>

        <TabsContent value="near" className="space-y-3">
          <p className="text-[13px] text-[#71717A] font-light max-w-2xl">
            Day-trip distance — easy to slot into a single crossing.
          </p>
          <BeachTable rows={NEAR_POZZALLO} />
        </TabsContent>

        <TabsContent value="wider" className="space-y-3">
          <p className="text-[13px] text-[#71717A] font-light max-w-2xl">
            Western Sicily and the Ionian / Tyrrhenian coast — better for
            multi-day itineraries.
          </p>
          <BeachTable rows={WIDER_SICILY} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
