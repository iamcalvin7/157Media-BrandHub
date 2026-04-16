import { motion } from "framer-motion";
import { Folder, FileText, Image as ImageIcon, Video, Lock, Download, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateBrandGuidelinesPdf } from "@/lib/generateBrandGuidelinesPdf";

export default function Resources() {
  const vault = [
    { name: "Logo Pack (SVG, PNG, EPS)", type: "folder", icon: Folder, size: "12 MB" },
    { name: "Social Media Templates (Figma)", type: "folder", icon: Folder, size: "45 MB" },
    { name: "B-Roll Footage Library", type: "video", icon: Video, size: "2.1 GB" },
    { name: "Campaign Imagery 2024", type: "image", icon: ImageIcon, size: "850 MB" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-5xl mx-auto space-y-12 pb-24"
    >
      <header className="space-y-4">
        <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900">Resources</h1>
        <p className="text-lg text-gray-500 font-light max-w-2xl">
          Downloadable assets, templates, and raw files for internal team use.
        </p>
      </header>

      {/* ── Brand Guidelines Download ── */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span className="w-8 h-[2px] bg-[#1e82b4] block" />
          Brand Guidelines
        </h2>

        <div className="flex items-start justify-between gap-6 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-[#1e82b4]/30 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#1e82b4]/10 flex items-center justify-center shrink-0 group-hover:bg-[#1e82b4]/15 transition-colors">
              <BookOpen className="w-6 h-6 text-[#1e82b4]" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-900">Virtu Ferries Brand Guidelines</p>
              <p className="text-sm text-gray-400 font-light">
                Complete reference — voice, tone, key messages, logo usage, colour palette, typography, and social media standards.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs font-medium text-gray-300 uppercase tracking-widest">PDF · 3 pages · v1.0</span>
              </div>
            </div>
          </div>
          <Button
            onClick={generateBrandGuidelinesPdf}
            className="shrink-0 bg-[#1e82b4] hover:bg-[#1e82b4]/90 text-white rounded-xl h-10 px-5 text-sm font-semibold shadow-none"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>

        <div className="flex items-start justify-between gap-6 p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-[#1e82b4]/30 transition-colors group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#f6a610]/10 flex items-center justify-center shrink-0 group-hover:bg-[#f6a610]/15 transition-colors">
              <FileText className="w-6 h-6 text-[#f6a610]" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-900">Copy Style Cheat Sheet</p>
              <p className="text-sm text-gray-400 font-light">
                Quick-reference card for tone of voice, dos & don'ts, and key message phrases. Print and keep at your desk.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs font-medium text-gray-300 uppercase tracking-widest">PDF · 1 page · v1.0</span>
              </div>
            </div>
          </div>
          <Button
            onClick={generateBrandGuidelinesPdf}
            className="shrink-0 bg-[#f6a610] hover:bg-[#f6a610]/90 text-white rounded-xl h-10 px-5 text-sm font-semibold shadow-none"
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </section>

      {/* ── Asset Vault ── */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
          <span className="w-8 h-[2px] bg-gray-200 block" />
          Asset Vault
        </h2>

        <div className="p-6 bg-white border border-gray-100 rounded-2xl text-center space-y-3 relative overflow-hidden">
          <div className="absolute inset-0 bg-[#1e82b4]/3 opacity-50 pointer-events-none" />
          <Lock className="w-10 h-10 text-[#f6a610] mx-auto" />
          <h3 className="text-lg font-semibold text-gray-900">Vault Under Construction</h3>
          <p className="text-gray-400 max-w-md mx-auto font-light text-sm">
            We are migrating our Google Drive assets to this dedicated vault. The full library will be available in Q3.
          </p>
        </div>

        <div className="space-y-3 opacity-50 pointer-events-none select-none grayscale">
          {vault.map((f, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl">
              <div className="flex items-center gap-4">
                <f.icon className="w-5 h-5 text-[#1e82b4]" />
                <span className="font-medium text-gray-900 text-sm">{f.name}</span>
              </div>
              <span className="text-xs text-gray-400">{f.size}</span>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
