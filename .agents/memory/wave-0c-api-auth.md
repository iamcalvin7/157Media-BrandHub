---
name: Wave 0C API protection pattern
description: Temporary shared-secret API key + rate limiting design — decisions worth keeping when replacing with Replit Auth.
---

## The rule
`apiAuthMiddleware` is a no-op when `API_KEY` env var is absent (dev stays frictionless). In production it enforces `x-api-key` header on all `/api/*` routes except a fixed public allowlist. Rate limiters are layered: `generalLimiter` (300/15 min) wraps the entire router; `aiLimiter` (30/15 min) and `scraperLimiter` (10/15 min) are applied per-route as extra middleware.

**Why:** Stack needs some temporary protection before Replit Auth lands. Shared secret in the bundle is accepted because this is an internal tool — the tradeoff is documented and explicit.

**How to apply:**
- Server: set `API_KEY` secret.
- Frontend: set `VITE_API_KEY` to the same value — the fetch interceptor in `brand.tsx` injects it automatically on all `/api/` calls.
- When real auth ships: remove `apiAuthMiddleware` from `app.ts` and delete `src/lib/apiAuth.ts`. Keep the rate limiters.

## Public allowlist (paths relative to /api)
- `GET /healthz`
- `GET /shares/:token`
- `POST /shares/:token/feedback`
- `GET /design-briefs/share/:token`
- `GET /storage/public-objects/*`

## trust proxy
`app.set("trust proxy", 1)` is set — Replit has exactly one proxy hop. Required for correct `req.ip` resolution by express-rate-limit.

## Key middleware order (app.ts)
pinoHttp → helmet → cors → json → urlencoded → brandContextMiddleware → `/api`: apiAuthMiddleware → generalLimiter → router (AI/scraper limiters inline per route)
