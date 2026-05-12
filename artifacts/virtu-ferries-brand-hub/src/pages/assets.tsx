import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrandContent } from "@/lib/brand-content";
import { EmptySection } from "@/components/EmptySection";

function CopyHex({ hex }: { hex: string }) {
  const copy = () => navigator.clipboard.writeText(hex);
  return (
    <button
      onClick={copy}
      title="Copy hex"
      className="font-mono text-xs opacity-60 hover:opacity-100 transition-opacity cursor-pointer select-none"
    >
      {hex}
    </button>
  );
}

export default function Assets() {
  const { assets } = useBrandContent();
  const hasAnyContent =
    assets.logos.length || assets.colours.length || assets.logoDos.length || assets.logoDonts.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-5xl mx-auto space-y-16 pb-24"
    >
      <header className="space-y-4">
        <h1 className="font-extrabold text-4xl md:text-5xl text-gray-900">Assets & Guidelines</h1>
        <p className="text-lg text-gray-500 font-light max-w-2xl">{assets.headerSubtitle}</p>
      </header>

      {!hasAnyContent && (
        <EmptySection
          title="Brand assets not configured yet"
          message="Add logos, colour palette, typography, and logo usage rules for this brand and they will appear here."
        />
      )}

      {/* Logo files */}
      {assets.logos.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <span className="w-8 h-[2px] bg-[var(--brand-primary)] block" />
            Logo Files
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {assets.logos.map((logo) => {
              const hasFile = Boolean(logo.src && logo.file);
              return (
                <div key={logo.label} className="flex flex-col rounded-2xl overflow-hidden border border-gray-100 bg-white">
                  <div className={`flex items-center justify-center h-44 p-8 ${logo.bg}`}>
                    {hasFile ? (
                      <img
                        src={logo.src}
                        alt={logo.label}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs uppercase tracking-widest font-semibold text-white/70">
                        File pending
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-gray-900">{logo.label}</p>
                      <p className="text-xs text-gray-400 font-light">{logo.description}</p>
                    </div>
                    {hasFile && (
                      <a href={logo.file} download={logo.filename}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="shrink-0 text-[var(--brand-primary)] hover:text-gray-900 hover:bg-[var(--brand-primary)]/20 border border-[var(--brand-primary)]/20 rounded-lg h-8 px-3 text-xs"
                        >
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          PNG
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Logo usage */}
      {(assets.logoMark || assets.logoDos.length > 0 || assets.logoDonts.length > 0) && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <span className="w-8 h-[2px] bg-gray-200 block" />
            Logo Usage
          </h2>

          {assets.logoMark && (
            <div className="p-6 bg-white border border-gray-100 rounded-2xl space-y-5">
              <p className="text-sm text-gray-400 uppercase tracking-widest font-semibold">The mark</p>
              <div className="flex items-center gap-8">
                <img src={assets.logoMark.src} alt="Logo mark" className="h-24 object-contain shrink-0" />
                <div className="space-y-3">
                  {assets.logoMark.parts.map((p) => (
                    <div key={p.label} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                      <p className="text-sm text-gray-600">{p.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(assets.logoDos.length > 0 || assets.logoDonts.length > 0) && (
            <div className="grid md:grid-cols-2 gap-5">
              {assets.logoDos.length > 0 && (
                <div className="p-6 bg-white border border-gray-100 rounded-2xl">
                  <h3 className="font-medium text-lg mb-4 flex items-center gap-2 text-gray-900">
                    <CheckCircle2 className="w-5 h-5 text-[var(--brand-primary)]" />
                    Do
                  </h3>
                  <ul className="space-y-2.5">
                    {assets.logoDos.map((item) => (
                      <li key={item} className="text-gray-600 font-light text-sm flex items-start gap-2">
                        <span className="text-[var(--brand-primary)] mt-0.5">·</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {assets.logoDonts.length > 0 && (
                <div className="p-6 bg-white border border-gray-100 rounded-2xl">
                  <h3 className="font-medium text-lg mb-4 flex items-center gap-2 text-gray-900">
                    <XCircle className="w-5 h-5 text-[var(--brand-alert)]" />
                    Don't
                  </h3>
                  <ul className="space-y-2.5">
                    {assets.logoDonts.map((item) => (
                      <li key={item} className="text-gray-600 font-light text-sm flex items-start gap-2">
                        <span className="text-[var(--brand-alert)] mt-0.5">·</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Colour palette */}
      {assets.colours.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <span className="w-8 h-[2px] bg-[var(--brand-accent)] block" />
            Colour Palette
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {assets.colours.map((c) => (
              <div key={c.hex + c.name} className="space-y-3">
                <div className={`h-32 rounded-xl w-full ${c.className} shadow-lg flex items-end p-3`}>
                  <CopyHex hex={c.hex} />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-gray-900">{c.name}</h3>
                  <p className="text-xs text-gray-400">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-300 italic">Click any hex to copy it to clipboard.</p>
        </section>
      )}

      {/* Typography */}
      {assets.typography && (
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
            <span className="w-8 h-[2px] bg-gray-200 block" />
            Typography
          </h2>

          {/* Primary font card */}
          <div className="p-8 bg-white border border-gray-100 rounded-2xl flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs text-[var(--brand-primary)] uppercase tracking-widest font-semibold">Primary Font</p>
              <h3 className="text-5xl font-extrabold text-gray-900 leading-none">{assets.typography.primaryFontName}</h3>
            </div>
            <p className="text-sm text-gray-500 font-light max-w-md">
              One typeface across every surface. Hierarchy is created by weight, not by switching fonts. Pick the lightest weight that still carries the right authority for the role.
            </p>
          </div>

          {/* Weight ladder — one card per weight with sample at scale + usage */}
          <div className="space-y-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Weight Hierarchy &amp; Usage</p>
            <div className="grid gap-4">
              {assets.typography.weights.map((w) => (
                <div
                  key={w.weight}
                  className="grid md:grid-cols-[200px_1fr_1fr] gap-6 items-center p-6 bg-white border border-gray-100 rounded-2xl"
                >
                  <div className="space-y-1">
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Weight</p>
                    <p className={`text-2xl ${w.className} text-gray-900 leading-none`}>{w.weight}</p>
                  </div>
                  <p
                    className={`${w.className} text-gray-900 text-3xl md:text-4xl leading-tight tracking-tight`}
                    aria-label={`${w.weight} sample`}
                  >
                    {w.sample}
                  </p>
                  <div className="space-y-1">
                    <p className="text-[10px] text-[var(--brand-accent)] uppercase tracking-widest font-semibold">Use for</p>
                    <p className="text-sm text-gray-600 font-light leading-relaxed">{w.usage}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </motion.div>
  );
}
