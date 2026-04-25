import type { Request, Response, NextFunction } from "express";
import { db, brandsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      brandId: number;
      brandSlug: string;
    }
  }
}

const DEFAULT_BRAND_ID = 1;
const DEFAULT_BRAND_SLUG = "virtu-ferries";

let cachedBrands: { id: number; slug: string }[] = [];
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 30_000;

async function loadBrandCache() {
  const now = Date.now();
  if (now - cacheLoadedAt < CACHE_TTL_MS && cachedBrands.length > 0) {
    return cachedBrands;
  }
  const rows = await db.select({ id: brandsTable.id, slug: brandsTable.slug }).from(brandsTable);
  cachedBrands = rows;
  cacheLoadedAt = now;
  return rows;
}

export function invalidateBrandCache() {
  cacheLoadedAt = 0;
  cachedBrands = [];
}

export async function brandContextMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const brands = await loadBrandCache();

    const headerSlug = String(req.headers["x-brand-slug"] || "").trim();
    const headerId = Number(req.headers["x-brand-id"]);

    let resolved: { id: number; slug: string } | undefined;

    if (headerSlug) {
      resolved = brands.find((b) => b.slug === headerSlug);
    }
    if (!resolved && Number.isFinite(headerId) && headerId > 0) {
      resolved = brands.find((b) => b.id === headerId);
    }
    if (!resolved) {
      resolved = brands.find((b) => b.id === DEFAULT_BRAND_ID) ?? {
        id: DEFAULT_BRAND_ID,
        slug: DEFAULT_BRAND_SLUG,
      };
    }

    req.brandId = resolved.id;
    req.brandSlug = resolved.slug;
    next();
  } catch (err) {
    req.brandId = DEFAULT_BRAND_ID;
    req.brandSlug = DEFAULT_BRAND_SLUG;
    next();
  }
}

export async function seedBrandsIfMissing() {
  const existing = await db.select().from(brandsTable);
  const bySlug = new Map(existing.map((b) => [b.slug, b]));

  const seeds = [
    {
      id: 1,
      slug: "virtu-ferries",
      name: "Virtu Ferries",
      shortName: "Virtu",
      tagline: "High-speed catamaran · Malta ↔ Sicily",
      primaryColor: "#1e82b4",
      accentColor: "#f6a610",
      alertColor: "#e01814",
      systemPromptKey: "virtu-ferries",
    },
    {
      id: 2,
      slug: "gozo-highspeed",
      name: "Gozo Highspeed",
      shortName: "Gozo",
      tagline: "Fast ferry · Malta ↔ Gozo",
      primaryColor: "#0c6cae",
      accentColor: "#fbbf24",
      alertColor: "#dc2626",
      systemPromptKey: "gozo-highspeed",
    },
  ];

  for (const seed of seeds) {
    if (!bySlug.has(seed.slug)) {
      await db
        .insert(brandsTable)
        .values(seed)
        .onConflictDoNothing();
    }
  }

  // Reset the brands serial sequence so new brands inserted later get correct ids
  try {
    await db.execute(
      sql`SELECT setval(pg_get_serial_sequence('brands','id'), GREATEST((SELECT COALESCE(MAX(id),1) FROM brands), 1), true)`,
    );
  } catch {
    // best-effort, non-fatal
  }

  invalidateBrandCache();
}
