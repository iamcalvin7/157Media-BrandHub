/**
 * Extract an Express 5 route parameter as a plain string.
 *
 * @types/express@5 types req.params values as `string | string[]` to cover
 * all possible param configurations, but named route segments (e.g. `:id`,
 * `:postType`) are always plain strings at runtime. This helper narrows the
 * type without using `any`.
 */
export function routeParam(p: string | string[]): string {
  return Array.isArray(p) ? (p[0] ?? "") : p;
}
