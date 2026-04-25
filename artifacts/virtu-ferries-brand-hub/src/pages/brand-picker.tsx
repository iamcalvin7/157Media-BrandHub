import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
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
      <header className="px-6 sm:px-10 py-6 flex items-center gap-3">
        <div className="h-9 w-9 rounded-2xl bg-[#39A15F] grid place-items-center text-black font-bold">
          <span className="text-sm tracking-tight">BH</span>
        </div>
        <div className="text-sm font-medium text-[#A1A1AA]">Brand Hub</div>
      </header>

      <main className="flex-1 px-6 sm:px-10 pb-12 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-10"
          >
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#FAFAFA]">
              Which brand are you working on today?
            </h1>
            <p className="mt-4 text-[#A1A1AA] text-base sm:text-lg max-w-xl mx-auto">
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
                  className="group text-left rounded-2xl bg-[#141414] border border-[#262626] hover:border-[#39A15F]/50 hover:bg-[#1A1A1A] transition-all p-6 relative overflow-hidden"
                >
                  {/* Color stripe in the brand's primary color — kept so customers can spot their brand at a glance */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ background: `linear-gradient(90deg, ${brand.primaryColor}, ${brand.accentColor})` }}
                  />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div
                        className="inline-flex items-center justify-center h-11 w-11 rounded-2xl text-white font-semibold text-base mb-4"
                        style={{ background: brand.primaryColor }}
                      >
                        {brand.shortName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="text-lg font-semibold text-[#FAFAFA]">{brand.name}</div>
                      {brand.tagline && (
                        <div className="text-sm text-[#A1A1AA] mt-1">{brand.tagline}</div>
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-[#3F3F46] group-hover:text-[#39A15F] group-hover:translate-x-0.5 transition-all" />
                  </div>

                  <div className="mt-5 flex items-center gap-1.5">
                    {[brand.primaryColor, brand.accentColor, brand.alertColor].map((c) => (
                      <span
                        key={c}
                        className="h-3 w-3 rounded-full ring-1 ring-white/10"
                        style={{ background: c }}
                      />
                    ))}
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
