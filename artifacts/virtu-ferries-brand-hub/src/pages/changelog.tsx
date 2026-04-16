import { motion } from "framer-motion";
import { useListChangelogEntries } from "@workspace/api-client-react";
import { Loader2, Plus, Sparkles, FileText, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function Changelog() {
  const { data: entries, isLoading } = useListChangelogEntries();

  const getCategoryIcon = (cat: string) => {
    if (cat.toLowerCase().includes("brand")) return <Sparkles className="w-4 h-4 text-[#f6a610]" />;
    if (cat.toLowerCase().includes("asset") || cat.toLowerCase().includes("guideline")) return <FileText className="w-4 h-4 text-[#1e82b4]" />;
    return <CheckCircle2 className="w-4 h-4 text-white/50" />;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-4xl mx-auto space-y-12 pb-24"
    >
      <header className="space-y-4">
        <h1 className="font-serif text-4xl md:text-5xl text-white">Knowledge Changelog</h1>
        <p className="text-lg text-white/60 font-light max-w-2xl">
          A running history of updates to the Virtu Ferries brand guidelines and AI agent capabilities.
        </p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#1e82b4] animate-spin" />
        </div>
      ) : !entries || entries.length === 0 ? (
        <div className="text-center py-20 bg-[#141414] border border-white/5 rounded-2xl">
          <p className="text-white/50">No changelog entries found.</p>
        </div>
      ) : (
        <div className="relative border-l border-white/10 ml-4 md:ml-6 space-y-12 pb-12">
          {entries.map((entry, index) => (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              key={entry.id} 
              className="relative pl-8 md:pl-10"
            >
              {/* Timeline dot */}
              <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-[#1e82b4] ring-4 ring-[#0d0d0d]"></div>
              
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-white/50 font-mono">
                    {format(new Date(entry.date), "MMM dd, yyyy")}
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-medium text-white flex items-center gap-1.5">
                    {getCategoryIcon(entry.category)}
                    {entry.category}
                  </span>
                </div>
                
                <div className="bg-[#141414] border border-white/5 rounded-2xl p-6 space-y-4 hover:border-white/10 transition-colors">
                  <p className="text-lg text-white font-medium">{entry.summary}</p>
                  
                  {entry.capabilities && entry.capabilities.length > 0 && (
                    <div className="pt-4 border-t border-white/5">
                      <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3">Updated Capabilities</p>
                      <ul className="space-y-2">
                        {entry.capabilities.map((cap, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-white/70 font-light">
                            <Plus className="w-4 h-4 text-[#1e82b4] shrink-0 mt-0.5" />
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
    </motion.div>
  );
}
