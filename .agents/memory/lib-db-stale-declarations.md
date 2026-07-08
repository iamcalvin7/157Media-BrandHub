---
name: lib/db stale TypeScript declarations after schema edits
description: tsc reports "property does not exist" on drizzle table columns even after schema.ts is correctly updated and the DB migration applied.
---

`lib/db` is a composite TS project (`composite: true`, `emitDeclarationOnly`) with a `dist/` folder
of `.d.ts` files checked by consumers like `artifacts/api-server` via project references. Editing
`lib/db/src/schema/*.ts` does NOT update `lib/db/dist/schema/*.d.ts` automatically — only a
`tsc -b` rebuild does.

**Why:** Runtime (tsx/esbuild) reads the `.ts` source directly via the package's `exports` field, so
the app works fine and hides the problem. But `tsc --noEmit` in a consumer package resolves types
through the stale `dist/*.d.ts`, producing "Property 'x' does not exist" errors that look like the
schema edit didn't take, even though it did.

**How to apply:** After adding/renaming columns in `lib/db/src/schema/*.ts`, always run
`cd lib/db && rm -f tsconfig.tsbuildinfo && pnpm exec tsc -b .` to regenerate `dist/*.d.ts` before
trusting `tsc --noEmit` results in a consumer package. Same fix applies to the consumer's own stale
`tsconfig.tsbuildinfo` if errors persist after that.
