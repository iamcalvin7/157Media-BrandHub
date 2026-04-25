// Client wrapper around the shared @workspace/brand-knowledge registry.
//
// All types and data live in the shared package so the api-server's agent
// prompt builder reads from the SAME source the pages render from. That is
// the auto-feed contract: any new field added to the registry is
// automatically part of what the AI knows for that brand — no second sync.
//
// This file exists only to provide the React-side hook that resolves the
// active brand and returns the matching slice. Add a new section? Add the
// type + data in the shared package, then read it from useBrandContent()
// here.

import { useBrand } from "./brand";
import {
  BRAND_CONTENT,
  EMPTY_BRAND_CONTENT,
  type BrandContent,
} from "@workspace/brand-knowledge";

// Re-export everything pages already import from this module so existing
// imports keep working without changes.
export * from "@workspace/brand-knowledge";

/**
 * Returns the static-content slice for the active brand. If the active brand
 * has no entry in the registry, returns an empty scaffold so pages render
 * "Not configured yet" everywhere instead of leaking another brand's content.
 */
export function useBrandContent(): BrandContent {
  const { activeBrand } = useBrand();
  if (!activeBrand) return EMPTY_BRAND_CONTENT;
  return BRAND_CONTENT[activeBrand.slug] ?? EMPTY_BRAND_CONTENT;
}
