import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Camera } from "lucide-react";
import { useBrand, type Brand } from "@/lib/brand";

export default function BrandPicker() {
  const { brands, isLoading, error, setActiveBrandSlug } = useBrand();
  const [, navigate] = useLocation();

  function pick(brand: Brand) {
    setActiveBrandSlug(brand.slug);
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col selection:bg-[#39A15F] selection:text-black">
      <header className="px-6 sm:px-10 py-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-[#39A15F] grid place-items-center text-black font-bold">
            <span className="text-sm tracking-tight">BH</span>
          </div>
          <div className="text-sm font-medium text-[#A1A1AA]">Brand Hub</div>
        </div>
        <Link
          href="/nico"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#262626] hover:border-[#39A15F]/50 bg-[#141414] hover:bg-[#1A1A1A] text-[#A1A1AA] hover:text-[#FAFAFA] text-xs font-medium pl-2.5 pr-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39A15F]/60"
          data-testid="link-nico"
        >
          <Camera className="h-3.5 w-3.5 text-[#39A15F]" />
          Nico
        </Link>
      </header>

      <main className="flex-1 px-6 sm:px-10 pb-12 flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-10 space-y-3"
          >
            <span className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-[#52525B]">
              <span className="h-1 w-1 rounded-full bg-[#39A15F]" />
              Brand workspace
            </span>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-[-0.02em] text-[#FAFAFA] leading-[1.15]">
              Which brand are you working on today?
            </h1>
            <p className="text-[#A1A1AA] text-sm sm:text-[15px] max-w-lg mx-auto leading-relaxed">
              Each brand has its own calendar, posts, ideas, library, and assistant memory.
            </p>
          </motion.div>

          {isLoading && (
            <div className="text-center text-[#71717A] text-sm py-12">Loading brands…</div>
          )}

          {error && !isLoading && (
            <div className="rounded-2xl border border-red-900/40 bg-red-950/30 text-red-300 px-4 py-3 text-sm">
              Couldn't load brands: {error}
            </div>
          )}

          {!isLoading && !error && brands.length === 0 && (
            <div className="text-center text-[#71717A] text-sm py-12">
              No brands have been set up yet.
            </div>
          )}

          {!isLoading && !error && brands.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {brands.map((brand, i) => (
                <motion.button
                  key={brand.slug}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.05 + i * 0.06 }}
                  whileHover={{ y: -2 }}
                  onClick={() => pick(brand)}
                  data-testid={`brand-card-${brand.slug}`}
                  className="group text-left rounded-2xl bg-gradient-to-b from-[#161616] to-[#101010] border border-[#262626] hover:border-[#39A15F]/40 transition-all p-6 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#39A15F]/60 focus-visible:ring-offset-0"
                  style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)" }}
                >
                  {/* Soft brand-tinted ambient glow on hover */}
                  <div
                    className="absolute -top-20 -right-20 w-56 h-56 rounded-full blur-3xl opacity-0 group-hover:opacity-25 transition-opacity duration-500 pointer-events-none"
                    style={{ background: brand.primaryColor }}
                  />
                  {/* Top color stripe — gradient between primary + accent */}
                  <div
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${brand.primaryColor}, ${brand.accentColor}, transparent)` }}
                  />
                  <div className="relative flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div
                        className="inline-flex items-center justify-center h-10 w-10 rounded-xl text-white font-semibold text-[13px] mb-4 shadow-sm ring-1 ring-white/10"
                        style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.accentColor})` }}
                      >
                        {brand.shortName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="text-[15px] font-semibold tracking-[-0.01em] text-[#FAFAFA]">{brand.name}</div>
                      {brand.tagline && (
                        <div className="text-[13px] text-[#A1A1AA] mt-1 leading-relaxed">{brand.tagline}</div>
                      )}
                    </div>
                    <div className="h-7 w-7 rounded-full grid place-items-center bg-[#1F1F1F] group-hover:bg-[#39A15F]/15 transition-colors shrink-0">
                      <ArrowRight className="h-3.5 w-3.5 text-[#52525B] group-hover:text-[#39A15F] group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>

                  <div className="relative mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
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
                    <span className="text-[10px] uppercase tracking-[0.18em] text-[#52525B] font-medium">Open hub</span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="px-6 sm:px-10 py-5 text-center text-xs text-[#A1A1AA]">
        Pick a brand to enter its hub. You can switch brands anytime from the sidebar.
      </footer>
    </div>
  );
}
