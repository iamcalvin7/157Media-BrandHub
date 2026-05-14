import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Camera, Sparkles } from "lucide-react";
import { useBrand, type Brand } from "@/lib/brand";

export default function BrandPicker() {
  const { brands, isLoading, error, setActiveBrandSlug } = useBrand();
  const [, navigate] = useLocation();

  function pick(brand: Brand) {
    setActiveBrandSlug(brand.slug);
    navigate("/dashboard");
  }

  return (
    <div className="relative min-h-screen bg-[#070707] text-[#FAFAFA] overflow-hidden selection:bg-[#39A15F] selection:text-black">
      {/* Ambient atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 ambient-radial" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] ambient-lines opacity-40" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_120%,rgba(0,0,0,0.6),transparent_60%)]" />

      <div className="relative flex flex-col min-h-screen">
        {/* ─── Top chrome ─────────────────────────────────────────────── */}
        <header className="px-6 sm:px-10 pt-7 pb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#39A15F] grid place-items-center text-black font-bold shadow-[0_0_24px_-6px_rgba(57,161,95,0.55)]">
              <span className="text-[11px] tracking-tight">BH</span>
            </div>
            <div className="text-[13px] font-semibold tracking-tight text-[#FAFAFA]">Brand Hub</div>
          </div>

          <nav className="hidden sm:flex items-center gap-1 rounded-full border border-[#1A1A1A] bg-[#0E0E0E]/80 backdrop-blur px-1 py-1">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#52525B] px-3">Workspace</span>
            <span className="h-3 w-px bg-[#1F1F1F]" />
            <span className="text-[12px] text-[#A1A1AA] px-3 py-0.5">Multi-brand</span>
          </nav>

          <Link
            href="/nico"
            className="pill-nav"
            data-testid="link-nico"
          >
            <Camera className="h-3.5 w-3.5 text-[#39A15F]" />
            Nico
          </Link>
        </header>

        {/* ─── Hero ───────────────────────────────────────────────────── */}
        <main className="flex-1 px-6 sm:px-10 pb-12 flex flex-col items-center justify-center">
          <div className="w-full max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="text-center mb-14 space-y-6"
            >
              <span className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.28em] text-[#71717A]">
                <span className="h-1 w-1 rounded-full bg-[#39A15F] shadow-[0_0_8px_rgba(57,161,95,0.8)]" />
                {brands.length > 0 ? `${brands.length} brand${brands.length === 1 ? "" : "s"} · one workspace` : "Brand workspace"}
              </span>

              <h1 className="h-hero text-[#FAFAFA] max-w-3xl mx-auto uppercase tracking-[-0.02em]">
                One Hub.{" "}
                <span className="text-[#52525B]">Every</span>{" "}
                Brand.
              </h1>

              <p className="text-[#A1A1AA] text-base sm:text-[17px] max-w-xl mx-auto leading-relaxed font-light">
                Calendar, copy, ideas, library, and an AI agent that knows each brand by name.
                Pick one to step inside.
              </p>
            </motion.div>

            {isLoading && (
              <div className="text-center text-[#71717A] text-sm py-12">
                <span className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#39A15F] animate-pulse" />
                  Loading brands…
                </span>
              </div>
            )}

            {error && !isLoading && (
              <div className="max-w-md mx-auto rounded-2xl border border-red-900/40 bg-red-950/20 text-red-300 px-4 py-3 text-sm text-center">
                Couldn't load brands: {error}
              </div>
            )}

            {!isLoading && !error && brands.length === 0 && (
              <div className="text-center text-[#71717A] text-sm py-12">
                No brands have been set up yet.
              </div>
            )}

            {!isLoading && !error && brands.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
                {brands.map((brand, i) => (
                  <motion.button
                    key={brand.slug}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.15 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => pick(brand)}
                    data-testid={`brand-card-${brand.slug}`}
                    className="group relative text-left rounded-3xl bg-gradient-to-b from-[#141414] to-[#0C0C0C] border border-[#1F1F1F] hover:border-[#2D2D2D] transition-all p-7 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39A15F]/60 focus-visible:ring-offset-0"
                    style={{ boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 30px 60px -30px rgba(0,0,0,0.6)" }}
                  >
                    {/* Brand-tinted ambient glow on hover */}
                    <div
                      className="absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-0 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none"
                      style={{ background: brand.primaryColor }}
                    />
                    {/* Top color stripe */}
                    <div
                      className="absolute top-0 left-6 right-6 h-px opacity-60"
                      style={{ background: `linear-gradient(90deg, transparent, ${brand.primaryColor}, ${brand.accentColor}, transparent)` }}
                    />

                    <div className="relative flex items-start justify-between gap-5">
                      <div className="min-w-0 flex-1">
                        <div
                          className="inline-flex items-center justify-center h-11 w-11 rounded-2xl text-white font-bold text-[13px] mb-5 ring-1 ring-white/10 shadow-lg"
                          style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.accentColor})` }}
                        >
                          {brand.shortName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="text-lg font-semibold tracking-[-0.02em] text-[#FAFAFA] leading-tight">
                          {brand.name}
                        </div>
                        {brand.tagline && (
                          <div className="text-[13px] text-[#A1A1AA] mt-1.5 leading-relaxed font-light">
                            {brand.tagline}
                          </div>
                        )}
                      </div>
                      <div className="h-9 w-9 rounded-full grid place-items-center bg-[#161616] border border-[#222222] group-hover:bg-[#39A15F]/15 group-hover:border-[#39A15F]/40 transition-colors shrink-0">
                        <ArrowRight className="h-4 w-4 text-[#71717A] group-hover:text-[#39A15F] group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>

                    <div className="relative mt-6 pt-5 border-t border-white/[0.04] flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {[
                          { role: "primary", color: brand.primaryColor },
                          { role: "accent", color: brand.accentColor },
                          { role: "alert", color: brand.alertColor },
                        ].map(({ role, color }) => (
                          <span
                            key={role}
                            className="h-2 w-2 rounded-full ring-1 ring-white/10"
                            style={{ background: color }}
                          />
                        ))}
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[#52525B] group-hover:text-[#A1A1AA] font-semibold transition-colors">
                        Enter hub
                        <Sparkles className="h-3 w-3" />
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </main>

        <footer className="px-6 sm:px-10 py-6 flex items-center justify-center gap-2 text-[11px] text-[#52525B]">
          <span>Switch brands anytime from the sidebar</span>
          <span className="h-1 w-1 rounded-full bg-[#1F1F1F]" />
          <span className="uppercase tracking-[0.22em]">v1</span>
        </footer>
      </div>
    </div>
  );
}
