---
name: Drizzle schema change process
description: Hard rules for schema changes — generate migration file, manual psql application, journal ordering, and pre-deploy checklist.
---

## HARD RULE: run `generate` after every schema change, before deploying

After every edit to any file in `lib/db/src/schema/`, run:
```
pnpm --filter db generate
```
This creates a `.sql` file in `lib/db/drizzle/` AND updates `_journal.json`. Commit both files. Without this, Replit's provisioner must infer the diff itself and will show conflict prompts for any ambiguous change (e.g. drop + add in the same deploy).

**Why:** The provisioner compares dev DB to prod DB schema. An explicit SQL migration file gives it unambiguous instructions. Without it, it guesses — and gets it wrong on renames/table swaps.

**How to apply:**
1. Edit `lib/db/src/schema/*.ts`
2. Apply to dev immediately: `psql "$DATABASE_URL" -c "ALTER TABLE ..."`  (drizzle-kit migrate silently fails — never use it for dev application)
3. Run `pnpm --filter db generate` — creates `lib/db/drizzle/NNNN_<name>.sql` and updates `_journal.json`
4. Commit both the `.sql` file and the updated `_journal.json`
5. Deploy — the provisioner applies the committed SQL cleanly

---

## Journal ordering rule (manual migrations only)

When writing a migration SQL file by hand (not via generate), add the journal entry ONLY AFTER the SQL has been confirmed to run.

**Why:** drizzle-kit reads the journal to decide what's pending. A pre-existing entry causes it to silently skip the file — the column never gets created.

---

## If `drizzle-kit migrate` silently fails

Apply the SQL directly instead:
```bash
psql "$DATABASE_URL" -c "ALTER TABLE <table> ADD COLUMN IF NOT EXISTS <col> <type>"
```
Then restart the API server.

**Numbering gotcha:** manually-created migration SQL files (e.g. brand_prints 0021/0022) exist that are NOT in drizzle's `meta/_journal.json`, so `pnpm --filter db generate` can emit a colliding file number. After generating, check `ls lib/db/drizzle/*.sql` for duplicates and, if needed, rename the new file + its `meta/NNNN_snapshot.json` and fix its tag/idx in `_journal.json` to the next free number.
