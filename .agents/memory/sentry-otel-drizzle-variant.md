---
name: Sentry + OTel + Drizzle variant conflict
description: Installing @sentry/node v9 causes a drizzle-orm pnpm peer-dep variant split that breaks TypeScript and requires two fixes in the api-server + lib/db.
---

## The rule

When `@sentry/node@^9` is installed in this monorepo, apply both fixes below before running typecheck.

**Why:** `@sentry/node` v9 depends on `@opentelemetry/api`. `drizzle-orm` lists `@opentelemetry/api` as an optional peer dep. pnpm then creates two variants of drizzle-orm (with and without OTel), and TypeScript sees both, causing `Types have separate declarations of a private property 'shouldInlineParam'` errors across every file that touches drizzle columns.

## Fix 1 — Unify the drizzle-orm pnpm variant

Add `@opentelemetry/api@^1.9.1` as a direct dependency to **every workspace package** that depends on `drizzle-orm`. In this repo that is `api-server` and `lib/db`. This forces pnpm to resolve a single OTel-keyed variant for all consumers.

```
pnpm add --filter @workspace/api-server @opentelemetry/api@^1.9.1
pnpm add --filter @workspace/db @opentelemetry/api@^1.9.1
```

Verify with: `ls -la lib/db/node_modules/drizzle-orm` — both symlinks must point to the same `_@opentelemetry+api@1.9.1_...` variant.

**How to apply:** Any time a new workspace package is added that depends on drizzle-orm, also add `@opentelemetry/api` to that package.

## Fix 2 — Remove @opentelemetry/* from esbuild externals

`artifacts/api-server/build.mjs` pre-emptively externalizes `@opentelemetry/*`. This works before Sentry but breaks after: the bundled `dist/index.mjs` imports OTel packages that are only transitive deps of @sentry/node (not directly linked by pnpm into api-server/node_modules), so Node throws `ERR_MODULE_NOT_FOUND` at startup.

Remove the `"@opentelemetry/*"` line from the `external` array in `build.mjs`. OTel packages are pure JS — esbuild can bundle them safely. Bundle size increases from ~6.8MB to ~8.0MB, which is acceptable.

Keep `"@sentry/profiling-node"` in externals (native bindings).

**How to apply:** If the `@opentelemetry/*` line is ever re-added to externals (e.g. by a merge), remove it again.
