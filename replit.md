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

Three distinct visual layers — never mix them:

1. **Sidebar + dark overlays** (persistent `SidebarLayout` sidebar + `BrandAgent` chat + brand picker `/` entry hero + Content Calendar shell & modals) keeps the dark recipe (lifted one notch in 2026-05-12-u, then *retained* against the page inversion in 2026-05-12-v):
   - Canvas `#0E0E0E`, panel `#121212`, surface `#161616`, alt surface `#181818`, subtle `#1A1A1A` / `#1C1C1C` (input bg) / `#222222` (divider)
   - Borders `#272727` (sidebar), `#2D2D2D` (cards), `#333333` (hover-quiet), `#454545` (hover-strong)
   - Text `#FAFAFA` / `#E4E4E7` / `#A1A1AA` / `#8E8E96` (muted labels) / `#6B6B73` (micro-copy)
   - Accent green `#39A15F` (with `/15`–`/20` tints)
2. **Hub product chrome page bodies** (the SaaS wrapper inside the sidebar) inverted to a soft off-white in 2026-05-12-v so there is clear visual separation from the dark sidebar — applied to `/dashboard` (home), `/settings`, `/settings-pillars`, `/knowledge-base`, `/changelog`, `/scraper`, `/nico`, and the `/social-media` sticky channel bar:
   - Page bg `#F5F5F5`, surface / card `#FFFFFF`, alt surface `#FAFAFA`, divider / hover bg `#F4F4F5`
   - Borders `#E4E4E7` (cards + sidebar-style), `#D4D4D8` (hover-quiet), `#A1A1AA` (hover-strong)
   - Text `#18181B` (primary) / `#27272A` (body) / `#71717A` (small muted) / `#A1A1AA` (micro)
   - Accent green stays `#39A15F`; brand `#1e82b4` keeps its tint system
   - 16px radii (`rounded-2xl`)
3. **Per-brand pages** (everything inside `/brand-identity`, `/brand-history`, `/fleet`, `/offers`, `/assets`, `/content-ideas`, `/content-calendar` *body* below the dark shell, `/copywriter*`, `/events`, `/resources`, `/travel-info`, `/onboard-experience`, `/saved`, `/media-library`, `/unique-selling-points`, `/monthly-planning`) keep a **light** theme using the active brand's own colors so each brand still feels like itself inside the hub. As of 2026-05-12-w these pages share the same surface tokens as layer 2 (page `#F5F5F5`, cards `#FFFFFF`, borders `#E4E4E7`, text scale `#18181B/#27272A/#3F3F46/#52525B/#71717A/#A1A1AA`) — the only difference from layer 2 is that brand-coloured tints (`bg-blue-50`, `bg-[var(--brand-primary)]/5`, gradient heroes) are allowed and encouraged.

Implementation note: `SidebarLayout`'s outer wrapper sits on `bg-[#F5F5F5]` (lifted from `bg-gray-50` in 2026-05-12-w so it matches the recipe page-bg token exactly). The sidebar inner stays `bg-[#121212]`, the BrandAgent chat (rendered inside `/dashboard`) stays dark, and the Content Calendar shell + modals stay dark — every other page sits on the off-white canvas. CSS `:root` tokens in `index.css` are deliberately untouched.

Per-brand pages with dark inserts: `/content-calendar` carries the dark calendar shell + modals (a deliberate dark workspace), and `/social-media` previously had a dark sticky channel bar but was inverted to light in 2026-05-12-v alongside the rest of the hub-chrome bodies.

## Brands

- **Virtu Ferries** — Malta ↔ Pozzallo, Sicily (1h45m). Brand colors: `#1e82b4` (blue), `#f6a610` (amber), `#e01814` (red, alerts only).
- **Gozo Highspeed** — Malta ↔ Gozo. Empty hub, populated over time.

Fonts (all brands): Montserrat only — ExtraBold 800 headings, SemiBold 600 sections, Light 300 body.

### Typography primitives (`index.css` `@layer components`)

Color-agnostic helper classes — caller picks the surface color so the same scale works on either theme:

- `.h-display` — page hero (h1): `font-extrabold text-4xl md:text-5xl tracking-tight leading-[1.04]`
- `.h-section` — section heading (h2): `text-2xl md:text-[1.6rem] font-extrabold tracking-tight`
- `.h-card` — card title (h3): `text-base font-extrabold tracking-tight`
- `.eyebrow` — uppercase kicker above a hero, paired with `.accent-bar`
- `.accent-bar` — 8×2px tinted bar (use `bg-[var(--brand-primary)]` on light pages, `bg-[#39A15F]` on hub chrome)
- `.hairline-light` / `.hairline-dark` — gradient 1px rule under hero subtitles

### Focus rings

All shared controls (`Button`, `Input`, `Textarea`) and raw nav buttons use `focus-visible:ring-2 ring-ring/70 ring-offset-0`. Do **not** add `ring-offset-{n}` with `ring-offset-background` here — `--background` resolves to the light theme token globally and would paint a white halo on the dark hub surfaces.

## Hub Sections

1. **Home** — Brand overview, quick-access cards, brand agent chat
2. **Brand Identity** — Tone of voice, brand story, key messages, dos/don'ts
3. **Assets** — Logo usage, colour palette, typography guide
4. **Social Media** — Platform channels, content pillars, posting cadence
5. **Content Ideas** — AI-generated content ideas (filterable by platform/theme)
6. **Resources** — Document library, templates, inspiration gallery
7. **Knowledge Changelog** — Running log of brand knowledge updates
8. **Onboard Experience** (`/onboard-experience`) — Per-brand source-of-truth for connectivity, premium tiers, comfort and food/drink amenities. Driven by `BrandContent.onboardExperience` (`OnboardExperienceContent` with `OnboardSection[]`); auto-feeds into the agent prompt via `formatBrandKnowledgeAsPrompt`. Page falls back to `EmptySection` when `sections` is empty.
9. **Client share links** — From the Content Calendar toolbar, "Share with client" enters a selection mode (checkbox UI on every PostRow + floating bottom action bar). Picking posts and clicking "Create share link" opens `ShareLinkModal` which POSTs to `/api/shares` (active brand inferred from `x-brand-slug` header). Server validates that all `postIds` belong to the active brand and stores `{token, brand_id, title, post_ids[], view_count, created_at}` in `shared_collections` (schema in `lib/db/src/schema/sharedCollections.ts`). Tokens are 16 random bytes base64url, retried up to 3x on collision. Public read at `GET /api/shares/:token` (no brand header needed) returns the brand metadata + sanitised posts (only `id, market, platform, pillar, title, format, caption, visual_direction, cta, media_url, link_url, drive_url, cross_post, scheduled_date, scheduled_time` — strips `status, notes, assigned_to, creative_status, tone_register, resources`). The public page lives at `/share/:token` (`pages/share-view.tsx`), registered in `App.tsx` **outside** the `BrandGuard` so anyone with the link can view without picking a brand. Header uses the share's brand `primaryColor` for accent.
10. **Site Scraper** (`/scraper`, hub-chrome light theme as of 2026-05-12-v) — In-admin BFS web crawler. POST `/api/scraper/jobs {rootUrl, maxPages?, maxDepth?}` kicks off a same-host crawl (defaults: 200 pages / depth 5, hard caps 500 / 8). Crawler runs in-process (`artifacts/api-server/src/lib/scraper/crawler.ts`), polls the DB so the UI watches `page_count` tick up. Schema: `scraper_jobs` + `scraper_pages` (cascade delete) in `lib/db/src/schema/scraperJobs.ts`. Brand-scoped on `req.brandId`. Stale running/queued jobs are reaped on server boot. Safety: (a) DNS-resolves every host and blocks RFC1918/loopback/link-local/CGNAT/IPv6-ULA + `localhost`/`*.local`/`*.internal` (SSRF guard), (b) follows redirects manually with re-validation at each hop, (c) parses robots.txt as plain text and enforces `User-agent: * Disallow`, (d) caps in-flight jobs at 2 (POST returns 429 if exceeded). UI shows raw archive only — no auto-suggestions, user manually copies content into brand pages.

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
6. **Dev → Prod data sync is automatic on every build/deploy.** The api-server has a `prebuild` step that runs `pnpm --filter @workspace/scripts run dump-snapshot`, which writes `artifacts/api-server/src/data-snapshot.json` (full dump of pillars, events, content_posts, brand_voice_notes, past_posts, copywriter_rules, copywriter_feedback, content_ideas, saved_items, media_assets, team_members — with a `version` ISO timestamp). esbuild inlines the JSON into the production bundle. On startup in production (`NODE_ENV=production`), `bootstrapFromSnapshot()` (in `artifacts/api-server/src/lib/bootstrapFromSnapshot.ts`) compares the bundled snapshot version to the `data_snapshot_version` row in the prod DB. If different: TRUNCATE all listed tables RESTART IDENTITY CASCADE, INSERT from JSON via `jsonb_populate_recordset`, reset sequences, record new version. In dev (`NODE_ENV=development`) the bootstrap is a no-op. **Workflow for the user: just republish.** Skipped tables: `changelog_entries` (code-seeded), `brands` (already seeded by `seedBrandsIfMissing`), `approval_decisions/conversations/messages` (runtime). If the user adds a new data table, add it to the `TABLES` array in BOTH `scripts/src/dump-data-snapshot.ts` AND `artifacts/api-server/src/lib/bootstrapFromSnapshot.ts`.

## Environment Variables

- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` — PostgreSQL
- `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` — Replit AI (auto-provisioned)
- `SESSION_SECRET` — Session secret
