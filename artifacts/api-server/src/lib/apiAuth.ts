/**
 * TEMPORARY API KEY PROTECTION
 *
 * This middleware provides a simple shared-secret guard while proper
 * authentication (Replit Auth / session-based) is not yet in place.
 *
 * To enable:
 *   - Set API_KEY (server secret) in the deployment environment.
 *   - Set VITE_API_KEY to the same value in the frontend environment
 *     so the fetch interceptor in brand.tsx injects it automatically.
 *
 * To remove: delete this file and its usage in app.ts when real auth ships.
 */

import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger.js";

const API_KEY = process.env["API_KEY"];
const isProd = process.env["NODE_ENV"] === "production";

if (isProd && !API_KEY) {
  logger.warn(
    "API_KEY is not set in production — all non-public API routes are " +
      "unprotected. Set API_KEY (server) and VITE_API_KEY (frontend) to " +
      "enable temporary API key protection.",
  );
}

/**
 * Routes accessible without an API key (public-facing, used by external viewers).
 * Paths are relative to /api (i.e. without the /api prefix).
 */
const PUBLIC_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: /^\/healthz$/ },
  { method: "GET", pattern: /^\/shares\/[^/]+$/ },
  { method: "POST", pattern: /^\/shares\/[^/]+\/feedback$/ },
  { method: "GET", pattern: /^\/design-briefs\/share\/[^/]+$/ },
  { method: "GET", pattern: /^\/storage\/public-objects\// },
];

function isPublicRoute(req: Request): boolean {
  return PUBLIC_ROUTES.some(
    (r) => r.method === req.method && r.pattern.test(req.path),
  );
}

/**
 * Middleware that enforces the temporary API key on all non-public /api routes.
 *
 * Behaviour when API_KEY env var is NOT set: warns at startup and lets all
 * requests through (no-op), so the server never crashes due to missing config.
 */
export function apiAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (isPublicRoute(req)) {
    next();
    return;
  }

  if (!API_KEY) {
    next();
    return;
  }

  const provided = req.headers["x-api-key"];
  if (provided === API_KEY) {
    next();
    return;
  }

  res.status(401).json({ error: "Unauthorized" });
}
