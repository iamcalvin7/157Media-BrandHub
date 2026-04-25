import { motion } from "framer-motion";
import { useListChangelogEntries } from "@workspace/api-client-react";
import { Loader2, Plus, Sparkles, FileText, CheckCircle2, Settings as SettingsIcon } from "lucide-react";
import { format } from "date-fns";
import { useBrandContent } from "@/lib/brand-content";

function getCategoryIcon(cat: string) {
  if (cat.toLowerCase().includes("brand")) return <Sparkles className="w-4 h-4 text-[#39A15F]" />;
  if (cat.toLowerCase().includes("asset") || cat.toLowerCase().includes("guideline")) return <FileText className="w-4 h-4 text-[#39A15F]" />;
  return <CheckCircle2 className="w-4 h-4 text-[#71717A]" />;
}

export default function Settings() {
  const { data: entries, isLoading } = useListChangelogEntries();
  const { brandShortLabel, hubLabel } = useBrandContent();
  const brandPrefix = brandShortLabel ? `${brandShortLabel} ` : "";

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 md:p-10 max-w-4xl mx-auto space-y-12 pb-24"
      >
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 text-[#39A15F]" />
            <h1 className="font-extrabold text-4xl md:text-5xl text-[#FAFAFA] tracking-tight">Settings</h1>
          </div>
          <p className="text-lg text-[#A1A1AA] font-light max-w-2xl">
            Platform settings and knowledge history for the {brandPrefix}{hubLabel}.
          </p>
        </header>

        {/* Knowledge Changelog section */}
        <section className="space-y-6">
          <div className="border-b border-[#1F1F1F] pb-4">
            <h2 className="text-xl font-extrabold text-[#FAFAFA]">Knowledge Changelog</h2>
            <p className="text-sm text-[#71717A] font-light mt-1">
              A running history of updates to the {brandPrefix}brand guidelines and AI agent capabilities.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#39A15F] animate-spin" />
            </div>
          ) : !entries || entries.length === 0 ? (
            <div className="text-center py-16 bg-[#141414] border border-[#262626] rounded-2xl">
              <p className="text-[#71717A]">No changelog entries found.</p>
            </div>
          ) : (
            <div className="relative border-l border-[#262626] ml-4 md:ml-6 space-y-12 pb-12">
              {entries.map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.07 }}
                  className="relative pl-8 md:pl-10"
                >
                  <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-[#39A15F] ring-4 ring-[#0A0A0A]" />
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-sm text-[#71717A] font-mono">
                        {format(new Date(entry.date), "MMM dd, yyyy")}
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-[#1A1A1A] border border-[#262626] text-xs font-medium text-[#FAFAFA] flex items-center gap-1.5">
                        {getCategoryIcon(entry.category)}
                        {entry.category}
                      </span>
                    </div>
                    <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 space-y-4 hover:border-[#3A3A3A] transition-colors">
                      <p className="text-lg text-[#FAFAFA] font-medium">{entry.summary}</p>
                      {entry.capabilities && entry.capabilities.length > 0 && (
                        <div className="pt-4 border-t border-[#262626]">
                          <p className="text-xs text-[#71717A] uppercase tracking-widest font-semibold mb-3">Updated Capabilities</p>
                          <ul className="space-y-2">
                            {entry.capabilities.map((cap, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-[#A1A1AA] font-light">
                                <Plus className="w-4 h-4 text-[#39A15F] shrink-0 mt-0.5" />
                                {cap}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </motion.div>
    </div>
  );
}
