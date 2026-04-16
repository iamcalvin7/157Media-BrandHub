# Virtu Ferries Brand Hub

## Overview

A brand hub for Virtu Ferries — a high-speed catamaran ferry service between Malta (Valletta Grand Harbour) and Pozzallo, Sicily (1h45m crossing). The hub includes a brand agent powered by OpenAI GPT, content idea generation, knowledge changelog, and all brand guidelines.

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

## Brand

- **Name**: Virtu Ferries
- **Route**: Malta (Valletta Grand Harbour) ↔ Pozzallo, Sicily (1h45m)
- **Primary**: #1e82b4 (blue)
- **Secondary**: #f6a610 (amber/gold)
- **Accent**: #e01814 (red, alerts only)
- **Background**: #0d0d0d (dark surface)
- **Card surface**: #141414
- **Fonts**: Montserrat (primary), Dancing Script (display/brand moments)

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
