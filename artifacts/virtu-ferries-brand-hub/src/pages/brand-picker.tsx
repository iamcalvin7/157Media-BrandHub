import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Ship, ArrowRight } from "lucide-react";
import { useBrand, type Brand } from "@/lib/brand";

export default function BrandPicker() {
  const { brands, isLoading, error, setActiveBrandSlug } = useBrand();
  const [, navigate] = useLocation();

  function pick(brand: Brand) {
    setActiveBrandSlug(brand.slug);
    navigate("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col">
      <header className="px-6 sm:px-10 py-6 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 grid place-items-center text-white">
          <Ship className="h-4 w-4" />
        </div>
        <div className="text-sm font-medium text-slate-700">Brand Hub</div>
      </header>

      <main className="flex-1 px-6 sm:px-10 pb-12 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center mb-10"
          >
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              Which brand are you working on today?
            </h1>
            <p className="mt-3 text-slate-500 text-base sm:text-lg">
              Each brand has its own calendar, posts, ideas, library, and assistant memory.
            </p>
          </motion.div>

          {isLoading && (
            <div className="text-center text-slate-400 text-sm py-12">Loading brands…</div>
          )}

          {error && !isLoading && (
            <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
              Couldn't load brands: {error}
            </div>
          )}

          {!isLoading && !error && brands.length === 0 && (
            <div className="text-center text-slate-500 text-sm py-12">
              No brands have been set up yet.
            </div>
          )}

          {!isLoading && !error && brands.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {brands.map((brand, i) => (
                <motion.button
                  key={brand.slug}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.05 + i * 0.06 }}
                  whileHover={{ y: -2 }}
                  onClick={() => pick(brand)}
                  data-testid={`brand-card-${brand.slug}`}
                  className="group text-left rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all p-6 relative overflow-hidden"
                >
                  {/* Color stripe in the brand's primary color */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1.5"
                    style={{ background: `linear-gradient(90deg, ${brand.primaryColor}, ${brand.accentColor})` }}
                  />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div
                        className="inline-flex items-center justify-center h-11 w-11 rounded-xl text-white font-semibold text-base mb-4"
                        style={{ background: brand.primaryColor }}
                      >
                        {brand.shortName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="text-lg font-semibold text-slate-900">{brand.name}</div>
                      {brand.tagline && (
                        <div className="text-sm text-slate-500 mt-1">{brand.tagline}</div>
                      )}
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
                  </div>

                  <div className="mt-5 flex items-center gap-1.5">
                    {[brand.primaryColor, brand.accentColor, brand.alertColor].map((c) => (
                      <span
                        key={c}
                        className="h-3 w-3 rounded-full ring-1 ring-black/5"
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

      <footer className="px-6 sm:px-10 py-5 text-center text-xs text-slate-400">
        Pick a brand to enter its hub. You can switch brands anytime from the sidebar.
      </footer>
    </div>
  );
}
