import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, MapPin, ExternalLink } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface BeachRow {
  area: string;
  name: string;
  description: string;
  url: string;
}

const MALTA: BeachRow[] = [
  {
    area: "Mellieha",
    name: "Mellieha Bay",
    description:
      "Largest of the thirteen pocket beaches around Mellieha — a sheltered, sandy bay between two headlands on the northern tip of the island.",
    url: "https://blueflagmalta.org/awarded-beaches/mellieha-bay-mellieha",
  },
  {
    area: "Mellieha",
    name: "Golden Bay",
    description:
      "One of three rural sandy beaches on the north-west coast — open, dramatic, and undeveloped compared with the resort beaches further south.",
    url: "https://blueflagmalta.org/awarded-beaches/golden-bay-mellieha",
  },
  {
    area: "Mġarr",
    name: "Għajn Tuffieħa Bay",
    description:
      "Twin beach to Golden Bay, separated only by a headland. Secluded — reached on foot via a long flight of steps or footpaths down the clay slopes.",
    url: "https://blueflagmalta.org/awarded-beaches/ghajn-tuffieha-bay-mgarr",
  },
  {
    area: "St Paul's Bay",
    name: "Buġibba Perched Beach",
    description:
      "Within Malta's largest seaside resort area. The coastline promenade runs for kilometres from Salina Bay to St Paul's Bay with some of the islands' best open-sea views.",
    url: "https://blueflagmalta.org/awarded-beaches/bugibba-perched-beach-st-pauls-bay",
  },
  {
    area: "St Paul's Bay",
    name: "Qawra Point",
    description:
      "A pocket of sand along the otherwise rocky Buġibba and Qawra coast, upgraded by the Malta Tourism Authority to support proper beach management.",
    url: "https://blueflagmalta.org/awarded-beaches/qawra-point-st-pauls-bay",
  },
  {
    area: "Sliema",
    name: "Fond Għadir",
    description:
      "Part of the long Sliema → St Julian's rocky shoreline (Qui-si-Sana to Balluta Bay). Promenade culture — long walks, food stops, and shoreline views day and night.",
    url: "https://blueflagmalta.org/awarded-beaches/fond-ghadir",
  },
  {
    area: "St Julian's",
    name: "Med-Bar Reef Club",
    description:
      "On the Dragonara Peninsula on the east coast — part of The Westin Dragonara Resort, St Julian's.",
    url: "https://blueflagmalta.org/awarded-beaches/med-bar-reef-club",
  },
  {
    area: "St Julian's",
    name: "St George's Bay",
    description:
      "Sandy bay in the heart of St Julian's — flanked by hotels, restaurants, and the Paceville nightlife strip.",
    url: "https://blueflagmalta.org/awarded-beaches/st-georges-bay",
  },
];

const GOZO: BeachRow[] = [
  {
    area: "Marsalforn",
    name: "Marsalforn Bay",
    description:
      "Gozo's most popular summer resort. Sand-and-pebble beach backed by a long promenade — busy with Maltese families and foreign visitors throughout the season.",
    url: "https://blueflagmalta.org/awarded-beaches/marsalforn-bay-marsalforn-gozo",
  },
  {
    area: "Qala",
    name: "Hondoq ir-Rummien",
    description:
      "Below the village of Qala — small cove dotted with traditional salt pans (some still active). Deep, clear water makes it a favourite for snorkelling.",
    url: "https://blueflagmalta.org/awarded-beaches/hondoq-ir-rummien-qala-gozo",
  },
];

function BeachTable({ rows }: { rows: BeachRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#E4E4E7] bg-white">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-[#FAFAFA] border-b border-[#E4E4E7] text-left">
            <th className="px-4 py-2.5 text-[11px] font-medium text-[#71717A] w-[28%]">Area</th>
            <th className="px-4 py-2.5 text-[11px] font-medium text-[#71717A] w-[32%]">Beach</th>
            <th className="px-4 py-2.5 text-[11px] font-medium text-[#71717A]">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={`${r.area}-${r.name}`}
              className={i !== rows.length - 1 ? "border-b border-[#F4F4F5]" : ""}
            >
              <td className="px-4 py-2.5 align-top">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-[var(--brand-primary)] shrink-0" />
                  <span className="font-semibold text-[#18181B]">{r.area}</span>
                </div>
              </td>
              <td className="px-4 py-2.5 align-top">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-[#18181B] hover:text-[var(--brand-primary)] transition-colors"
                >
                  {r.name}
                  <ExternalLink className="w-3 h-3 text-[#A1A1AA]" />
                </a>
              </td>
              <td className="px-4 py-2.5 align-top text-[#52525B] font-light leading-relaxed">
                {r.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BlueFlagBeachesMalta() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 pb-24"
    >
      <header className="space-y-2">
        <Link
          href="/malta-resources"
          className="inline-flex items-center gap-1 text-[12px] text-[#A1A1AA] hover:text-[var(--brand-primary)] transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          Malta Resources
        </Link>
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#18181B] tracking-tight">
          Blue Flag Beaches
        </h1>
        <p className="text-sm text-[#71717A] font-light max-w-2xl leading-relaxed">
          Certified Blue Flag beaches across the Maltese islands, sourced from
          Nature Trust Malta — the national operator. Use these as the
          authoritative reference when proposing beach-led "Choose Malta"
          (Italy-facing) or seasonal Malta content. Always link back to the
          official listing where possible.
        </p>
        <p className="text-[11px] text-[#A1A1AA] font-medium pt-1">
          Source ·{" "}
          <a
            href="https://blueflagmalta.org/beach-awards/blue-flag-beach"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--brand-primary)] transition-colors inline-flex items-center gap-1"
          >
            blueflagmalta.org
            <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </header>

      <Tabs defaultValue="malta" className="space-y-5">
        <TabsList className="bg-[#F4F4F5] h-9 p-0.5 rounded-lg">
          <TabsTrigger
            value="malta"
            className="rounded-md px-3 py-1 text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:text-[#18181B] text-[#71717A]"
          >
            Malta · {MALTA.length}
          </TabsTrigger>
          <TabsTrigger
            value="gozo"
            className="rounded-md px-3 py-1 text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:text-[#18181B] text-[#71717A]"
          >
            Gozo · {GOZO.length}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="malta" className="space-y-3">
          <p className="text-[13px] text-[#71717A] font-light max-w-2xl">
            Mainland Malta — north-west rural beaches, the Mellieħa / St Paul's
            resort coast, and the Sliema / St Julian's promenade.
          </p>
          <BeachTable rows={MALTA} />
        </TabsContent>

        <TabsContent value="gozo" className="space-y-3">
          <p className="text-[13px] text-[#71717A] font-light max-w-2xl">
            Gozo — quieter, more rural, and a strong angle for itinerary content
            that uses Malta as a base.
          </p>
          <BeachTable rows={GOZO} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
