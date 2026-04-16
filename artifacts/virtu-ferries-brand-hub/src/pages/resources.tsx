import { motion } from "framer-motion";
import { Folder, FileText, Image as ImageIcon, Video, Lock } from "lucide-react";

export default function Resources() {
  const folders = [
    { name: "Brand Guidelines PDF", type: "document", icon: FileText, size: "2.4 MB" },
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
        <h1 className="font-serif text-4xl md:text-5xl text-white">Resources</h1>
        <p className="text-lg text-white/60 font-light max-w-2xl">
          Downloadable assets, templates, and raw files for internal team use.
        </p>
      </header>

      <div className="p-8 bg-[#141414] border border-white/5 rounded-2xl text-center space-y-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[#1e82b4]/5 opacity-50"></div>
        <Lock className="w-12 h-12 text-[#f6a610] mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-white">Asset Vault Under Construction</h2>
        <p className="text-white/60 max-w-md mx-auto font-light pb-4">
          We are currently migrating our Google Drive assets to this dedicated vault. 
          The full library will be available in Q3.
        </p>
      </div>

      <div className="space-y-4 opacity-50 pointer-events-none select-none grayscale">
        <h3 className="text-lg font-medium text-white px-2">Preview</h3>
        <div className="grid gap-3">
          {folders.map((f, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-[#141414] border border-white/5 rounded-xl">
              <div className="flex items-center gap-4">
                <f.icon className="w-6 h-6 text-[#1e82b4]" />
                <span className="font-medium text-white">{f.name}</span>
              </div>
              <span className="text-xs text-white/40">{f.size}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
