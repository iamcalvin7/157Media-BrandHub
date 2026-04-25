import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { queryClient } from "@/lib/queryClient";

// ─── Types ───────────────────────────────────────────────────────────────────
export type Brand = {
  id: number;
  slug: string;
  name: string;
  shortName: string;
  tagline: string | null;
  primaryColor: string;
  accentColor: string;
  alertColor: string;
  logoUrl: string | null;
};

type BrandContextValue = {
  brands: Brand[];
  activeBrand: Brand | null;
  activeBrandSlug: string | null;
  setActiveBrandSlug: (slug: string | null) => void;
  isLoading: boolean;
  error: string | null;
};

const BrandContext = createContext<BrandContextValue | undefined>(undefined);

const LS_KEY = "vfh.activeBrandSlug";
const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Global fetch interceptor ────────────────────────────────────────────────
// We patch window.fetch once (idempotently) so every existing fetch call across
// the app automatically sends the active brand slug. Pages don't need to know
// about the brand context — the header is attached transparently.
let installed = false;
let currentBrandSlug: string | null = null;

function installFetchInterceptor() {
  if (installed) return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    try {
      const url = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      // Only attach the header to our own API calls. We don't want to leak
      // it to third-party endpoints (e.g. presigned upload URLs to GCS).
      const isApi = url.includes("/api/");
      if (isApi && currentBrandSlug) {
        const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
        if (!headers.has("x-brand-slug")) {
          headers.set("x-brand-slug", currentBrandSlug);
        }
        const nextInit: RequestInit = { ...(init || {}), headers };
        if (input instanceof Request) {
          // Re-create the Request with the merged headers so body/method survive.
          return original(new Request(input, nextInit));
        }
        return original(input, nextInit);
      }
    } catch {
      // fall through to original fetch on any header-merge mishap
    }
    return original(input, init);
  };
}

// ─── Theme application ───────────────────────────────────────────────────────
function applyBrandTheme(brand: Brand | null) {
  const root = document.documentElement;
  if (!brand) {
    root.style.removeProperty("--brand-primary");
    root.style.removeProperty("--brand-accent");
    root.style.removeProperty("--brand-alert");
    root.removeAttribute("data-brand");
    return;
  }
  root.style.setProperty("--brand-primary", brand.primaryColor);
  root.style.setProperty("--brand-accent", brand.accentColor);
  root.style.setProperty("--brand-alert", brand.alertColor);
  root.setAttribute("data-brand", brand.slug);
}

// ─── Provider ────────────────────────────────────────────────────────────────
// Install the fetch interceptor at module load so it's ready before any React
// render — every fetch from now on goes through the wrapper.
installFetchInterceptor();

export function BrandProvider({ children }: { children: ReactNode }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeBrandSlug, setActiveBrandSlugState] = useState<string | null>(() => {
    let initial: string | null = null;
    try {
      initial = localStorage.getItem(LS_KEY);
    } catch { /* noop */ }
    // Seed the interceptor's slug synchronously so the very first fetches
    // (made by child components on mount) already carry the right header.
    currentBrandSlug = initial;
    return initial;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load brands once at boot.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/brands`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data: Brand[] = await resp.json();
        if (cancelled) return;
        setBrands(data);
        // If the persisted slug is no longer valid (e.g. brand removed),
        // clear it so the user lands on the picker.
        if (activeBrandSlug && !data.some((b) => b.slug === activeBrandSlug)) {
          setActiveBrandSlugState(null);
          try { localStorage.removeItem(LS_KEY); } catch { /* noop */ }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load brands");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeBrand = useMemo(
    () => brands.find((b) => b.slug === activeBrandSlug) ?? null,
    [brands, activeBrandSlug],
  );

  // Apply the active brand's theme to the document root.
  useEffect(() => { applyBrandTheme(activeBrand); }, [activeBrand]);

  const setActiveBrandSlug = useCallback((slug: string | null) => {
    // Update the interceptor's slug synchronously so any fetches kicked off
    // by the same render cycle (e.g. a child page mounting after navigation)
    // already see the new brand. Relying on a useEffect would race against
    // child mount effects and leak the previous brand's data through.
    currentBrandSlug = slug;
    // Wipe every cached query so the next render of any page does NOT briefly
    // show the previous brand's data while a refetch is in flight. Query keys
    // are endpoint+params only — they don't include the brand — so without this
    // clear the cache would treat the same key as valid across brands.
    try { queryClient.clear(); } catch { /* noop */ }
    setActiveBrandSlugState(slug);
    try {
      if (slug) localStorage.setItem(LS_KEY, slug);
      else localStorage.removeItem(LS_KEY);
    } catch { /* noop */ }
  }, []);

  const value = useMemo<BrandContextValue>(
    () => ({ brands, activeBrand, activeBrandSlug, setActiveBrandSlug, isLoading, error }),
    [brands, activeBrand, activeBrandSlug, setActiveBrandSlug, isLoading, error],
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────
export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error("useBrand must be used inside <BrandProvider>");
  return ctx;
}

export function useBrands() {
  const { brands, isLoading, error } = useBrand();
  return { brands, isLoading, error };
}
