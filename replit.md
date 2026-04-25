# Brand Hub (Multi-Brand)

## Overview

A multi-brand hub. Each brand has its own fully isolated calendar, posts, ideas, copywriter library, events, assets, and agent knowledge.

Brands:
- **Virtu Ferries** (id 1, slug `virtu-ferries`) — high-speed catamaran Malta ↔ Pozzallo, Sicily (1h45m). Existing seeded data.
- **Gozo Highspeed** (id 2, slug `gozo-highspeed`) — fast ferry Malta ↔ Gozo. Empty hub, populated over time.

Homepage (`/`) is a brand picker; the dashboard lives at `/dashboard`. Active brand is persisted in `localStorage` (`vfh.activeBrandSlug`) and sent on every `/api/*` request as `x-brand-slug` via a global `window.fetch` interceptor in `src/lib/brand.tsx`. The interceptor's slug is updated synchronously inside `setActiveBrandSlug` so child component mount effects after a brand switch already see the new brand.

## Architecture

pnpm monorepo with two main artifacts:
- `artifacts/virtu-ferries-brand-hub` — React + Vite frontend (at `/`)
- `artifacts/api-server` — Express 5 API server (at `/api`)

Shared libraries under `lib/`:
- `lib/api-spec` — OpenAPI spec + Orval codegen
- `lib/api-client-react` — Generated React Query hooks
- `lib/api-zod` — Generated Zod validation schemas
- `lib/db` — Drizzle ORM schema + PostgreSQL client
- `lib/integrations-openai-ai-server` — OpenAI client (Replit AI integration)
- `lib/brand-knowledge` — **Single source of truth for per-brand content**. Holds the typed registry (`BRAND_CONTENT[slug]`) consumed by the React UI (`useBrandContent`) AND the agent prompt builder (`formatBrandKnowledgeAsPrompt(slug)` in `prompt.ts`). Editing a section here automatically appears in both the brand page and the AI agent's system prompt — no second sync. Scaffold strings containing "not configured yet" are filtered out of the prompt so empty brands don't pollute the LLM context.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite, Wouter routing, Tailwind CSS, Framer Motion, TanStack Query
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (zod/v4), drizzle-zod
- **AI**: OpenAI GPT-5.2 via Replit AI Integrations (no API key needed)
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Theming Model

Two distinct visual layers — never mix them:

1. **Hub product chrome** (the SaaS wrapper) uses an x.ai-inspired dark/green palette:
   - Page bg `#0A0A0A`, surface `#141414`, panel header `#0F0F0F`, subtle `#1A1A1A`
   - Borders `#1F1F1F` (sidebar), `#262626` (cards), `#3A3A3A` (hover)
   - Text `#FAFAFA` / `#A1A1AA` / `#71717A`
   - Accent green `#39A15F` (with `/15`–`/20` tints)
   - 16px radii (`rounded-2xl`)
   - Applied to: brand picker (`/`), `/dashboard`, `/settings`, `/settings-pillars`, `/knowledge-base`, `/changelog`, the persistent sidebar, and `BrandAgent` chat component
2. **Per-brand pages** (everything inside `/brand-identity`, `/brand-history`, `/fleet`, `/offers`, `/assets`, `/social-media`, `/content-ideas`, `/content-calendar`, `/copywriter*`, `/events`, `/resources`, `/travel-info`, `/saved`, `/media-library`, `/unique-selling-points`, `/monthly-planning`) keep a **light** theme using the active brand's own colors so each brand still feels like itself inside the hub.

Implementation note: `SidebarLayout`'s outer wrapper stays `bg-gray-50` so the brand pages inherit a light background; only the sidebar inner and each hub-chrome page wrapper are `bg-[#0A0A0A]`. CSS `:root` tokens in `index.css` are deliberately untouched — the theme split is per-component, not global.

## Brands

- **Virtu Ferries** — Malta ↔ Pozzallo, Sicily (1h45m). Brand colors: `#1e82b4` (blue), `#f6a610` (amber), `#e01814` (red, alerts only).
- **Gozo Highspeed** — Malta ↔ Gozo. Empty hub, populated over time.

Fonts (all brands): Montserrat only — ExtraBold 800 headings, SemiBold 600 sections, Light 300 body.

## Hub Sections

1. **Home** — Brand overview, quick-access cards, brand agent chat
2. **Brand Identity** — Tone of voice, brand story, key messages, dos/don'ts
3. **Assets** — Logo usage, colour palette, typography guide
4. **Social Media** — Platform channels, content pillars, posting cadence
5. **Content Ideas** — AI-generated content ideas (filterable by platform/theme)
6. **Resources** — Document library, templates, inspiration gallery
7. **Knowledge Changelog** — Running log of brand knowledge updates

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Hard Rules

1. After every content change, add an entry to `artifacts/api-server/src/lib/knowledgeChangelog.ts` (top of array, sortKey YYYY-MM-DD-a/b/c, minimum 2 capabilities)
2. The brand guidelines system prompt in `artifacts/api-server/src/lib/brandGuidelines.ts` must be updated in the same session as any content change
3. Restart the API server workflow after every edit to brandGuidelines.ts
4. All image/asset URLs use `${import.meta.env.BASE_URL}path/file` — never root-relative
5. No placeholder or mock data — every section contains real brand information

## Environment Variables

- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — PostgreSQL
- `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` — Replit AI (auto-provisioned)
- `SESSION_SECRET` — Session secret
