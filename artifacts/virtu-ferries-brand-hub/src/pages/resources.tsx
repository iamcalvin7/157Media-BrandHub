import { motion } from "framer-motion";
import { Folder, FileText, Image as ImageIcon, Video, Lock, Download, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateBrandGuidelinesPdf } from "@/lib/generateBrandGuidelinesPdf";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";

const VAULT_ICONS = { Folder, FileText, Image: ImageIcon, Video } as const;

export default function Resources() {
  const { resources } = useBrandContent();
  const hasAnyResource =
    resources.guidelinesPdf || resources.cheatSheetEnabled || resources.vault.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-5xl mx-auto space-y-12 pb-24"
    >
      <header className="space-y-4">
        <h1 className="font-extrabold text-4xl md:text-5xl text-[#18181B]">Resources</h1>
        <p className="text-lg text-[#71717A] font-light max-w-2xl">
          Downloadable assets, templates, and raw files for internal team use.
        </p>
      </header>

      {!hasAnyResource && (
        <EmptySection
          title="Resources not configured yet"
          message="Add a brand guidelines PDF and asset vault entries for this brand and they will appear here."
        />
      )}

      {/* Brand Guidelines */}
      {(resources.guidelinesPdf || resources.cheatSheetEnabled) && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#18181B] flex items-center gap-3">
            <span className="w-8 h-[2px] bg-[var(--brand-primary)] block" />
            Brand Guidelines
          </h2>

          {resources.guidelinesPdf && (
            <div className="flex items-start justify-between gap-6 p-6 bg-white border border-[#F4F4F5] rounded-2xl shadow-sm hover:border-[var(--brand-primary)]/30 transition-colors group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--brand-primary)]/15 transition-colors">
                  <BookOpen className="w-6 h-6 text-[var(--brand-primary)]" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-[#18181B]">{resources.guidelinesPdf.name}</p>
                  <p className="text-sm text-[#A1A1AA] font-light">{resources.guidelinesPdf.description}</p>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs font-medium text-gray-300 uppercase tracking-widest">Official PDF · v1.0</span>
                  </div>
                </div>
              </div>
              <a href={resources.guidelinesPdf.path} download={resources.guidelinesPdf.filename}>
                <Button className="shrink-0 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white rounded-xl h-10 px-5 text-sm font-semibold shadow-none">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </a>
            </div>
          )}

          {resources.cheatSheetEnabled && (
            <div className="flex items-start justify-between gap-6 p-6 bg-white border border-[#F4F4F5] rounded-2xl shadow-sm hover:border-[var(--brand-primary)]/30 transition-colors group">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--brand-accent)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--brand-accent)]/15 transition-colors">
                  <FileText className="w-6 h-6 text-[var(--brand-accent)]" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-[#18181B]">Copy Style Cheat Sheet</p>
                  <p className="text-sm text-[#A1A1AA] font-light">
                    Quick-reference card for tone of voice, dos & don'ts, and key message phrases. Print and keep at your desk.
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="text-xs font-medium text-gray-300 uppercase tracking-widest">PDF · 1 page · v1.0</span>
                  </div>
                </div>
              </div>
              <Button
                onClick={generateBrandGuidelinesPdf}
                className="shrink-0 bg-[var(--brand-accent)] hover:bg-[var(--brand-accent)]/90 text-white rounded-xl h-10 px-5 text-sm font-semibold shadow-none"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          )}
        </section>
      )}

      {/* Asset Vault */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold text-[#18181B] flex items-center gap-3">
          <span className="w-8 h-[2px] bg-gray-200 block" />
          Asset Vault
        </h2>

        {resources.vaultUnderConstruction && (
          <div className="p-6 bg-white border border-[#F4F4F5] rounded-2xl text-center space-y-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-[var(--brand-primary)]/3 opacity-50 pointer-events-none" />
            <Lock className="w-10 h-10 text-[var(--brand-accent)] mx-auto" />
            <h3 className="text-lg font-semibold text-[#18181B]">Vault Under Construction</h3>
            <p className="text-[#A1A1AA] max-w-md mx-auto font-light text-sm">
              We are migrating our Google Drive assets to this dedicated vault. The full library will be available in Q3.
            </p>
          </div>
        )}

        {resources.vault.length > 0 ? (
          <div className={`space-y-3 ${resources.vaultUnderConstruction ? "opacity-50 pointer-events-none select-none grayscale" : ""}`}>
            {resources.vault.map((f, i) => {
              const Icon = VAULT_ICONS[f.iconName] ?? Folder;
              return (
                <div key={i} className="flex items-center justify-between p-4 bg-white border border-[#F4F4F5] rounded-xl">
                  <div className="flex items-center gap-4">
                    <Icon className="w-5 h-5 text-[var(--brand-primary)]" />
                    <span className="font-medium text-[#18181B] text-sm">{f.name}</span>
                  </div>
                  <span className="text-xs text-[#A1A1AA]">{f.size}</span>
                </div>
              );
            })}
          </div>
        ) : (
          !resources.vaultUnderConstruction && (
            <EmptySection
              title="Vault is empty"
              message="Add files to the asset vault for this brand and they will appear here."
            />
          )
        )}
      </section>
    </motion.div>
  );
}
