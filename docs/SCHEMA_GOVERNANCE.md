# Schema Governance

How to make database schema changes safely in this project.

---

## The rule in one sentence

**Every schema change requires a migration file committed in the same PR as the TypeScript change. `drizzle-kit push` is permanently prohibited.**

---

## Why

`drizzle-kit push` compares the live database against the Drizzle schema and applies the diff immediately, with no file output and no review step. For additive changes it silently succeeds. For destructive changes (DROP TABLE, DROP COLUMN, column renames) it prompts interactively — which in a non-TTY deployment context either silently skips the destructive operation or hangs. It leaves no auditable history.

The migration-file workflow replaces this with:

- A committed `.sql` file per change, reviewable in PRs before anything touches the database.
- An auditable journal in `drizzle.__drizzle_migrations` on every database.
- A DROP guard in `post-merge.sh` that aborts on destructive DDL unless explicitly overridden by an operator.
- A reproducible path from zero to the current schema on any fresh database.

---

## Tools

| Command | What it does | When to run |
|---|---|---|
| `pnpm --filter db generate` | Compares the TypeScript schema against the last migration snapshot; writes a new `.sql` file to `lib/db/drizzle/` | After every TypeScript schema change, before opening a PR |
| `pnpm --filter db migrate` | Applies any pending migration files to the target database; records each in `drizzle.__drizzle_migrations` | Automatically by `post-merge.sh` after every merge |
| `pnpm --filter db check` | Reports schema drift (TypeScript schema vs last migration snapshot) without touching the database | Any time you want to verify no uncommitted changes exist |
| `pnpm --filter db migrate:force` | Same as `migrate` but skips the DROP guard — for operator use only after manual review | Only when a DROP statement has been explicitly reviewed and approved |

**Never run:**
- `drizzle-kit push` — bypasses migration files entirely
- `drizzle-kit push --force` — bypasses migration files AND all safety prompts

Both `push` and `push-force` have been removed from `lib/db/package.json`. If you find yourself about to run `pnpm dlx drizzle-kit push`, stop.

---

## How to add a new table

1. Create a new file in `lib/db/src/schema/` (e.g., `lib/db/src/schema/myTable.ts`).
2. Define the table using `pgTable`.
3. Export the table and its inferred types.
4. Add `export * from "./myTable"` to `lib/db/src/schema/index.ts`.
5. Run `pnpm --filter db generate`.
6. Review the generated `.sql` file in `lib/db/drizzle/`. Confirm it contains only `CREATE TABLE` and no `DROP` statements.
7. Commit both the schema file and the migration file in the same PR.

---

## How to add a column

1. Add the column to the existing `pgTable` definition in `lib/db/src/schema/`.
   - Additive columns should be **nullable** or have a **`DEFAULT`** so existing rows remain valid.
   - Do not add `NOT NULL` without a `DEFAULT` unless you are also providing a data migration.
2. Run `pnpm --filter db generate`.
3. Review the generated `.sql` file. Confirm it contains `ALTER TABLE ... ADD COLUMN` and no `DROP`.
4. Commit both files in the same PR.

---

## How to rename a column

Drizzle has no native rename — a rename generates `DROP COLUMN` + `ADD COLUMN`, which is destructive and loses data.

Safe rename procedure:
1. Add the new column (nullable) — commit this as its own migration.
2. Write a data migration script that copies data from the old column to the new column.
3. Update all application code to read/write the new column.
4. After verifying no application code reads the old column, remove it — commit this as its own migration. This migration will trigger the DROP guard; an operator must run `migrate:force` after explicit review.

Never rename a column in a single migration unless the column is empty and was added in the same release.

---

## How to drop a table or column

Dropping is irreversible. Follow this procedure:

1. Verify the column or table is unused in all application code (routes, queries, hooks).
2. Write the migration manually or via `drizzle-kit generate`.
3. The DROP guard in `post-merge.sh` will abort on `DROP TABLE` or `DROP COLUMN`. **This is intentional.**
4. An operator reviews the migration file and the code diff, confirms no data loss, and runs:
   ```bash
   ALLOW_DROP=1 pnpm --filter db migrate:force
   ```
5. Document the drop in a PR comment explaining why the data is safe to discard.

---

## How migrations are applied in production

`post-merge.sh` runs after every task merge:

```bash
pnpm install --frozen-lockfile
# DROP guard (aborts if any *.sql in lib/db/drizzle/ contains DROP TABLE or DROP COLUMN)
pnpm --filter db migrate
```

`drizzle-kit migrate` reads `lib/db/drizzle/meta/_journal.json`, compares it against `drizzle.__drizzle_migrations` on the target database, and applies only the pending files in order. Each applied migration is recorded in the journal table.

---

## Migration file conventions

Every migration file lives in `lib/db/drizzle/` and is named by drizzle-kit automatically (e.g., `0001_add_group_id.sql`). Do not rename migration files after they have been committed — the journal matches by file hash.

Each migration file should include a DOWN migration comment block for emergency manual rollback:

```sql
-- Up migration (applied automatically by drizzle-kit migrate)
ALTER TABLE content_posts ADD COLUMN new_col TEXT;

-- Down migration (manual only — run via scripts/src/rollback-migration.ts or psql)
-- ALTER TABLE content_posts DROP COLUMN new_col;
```

---

## What `drizzle-kit check` tells you

| Output | Meaning | Action |
|---|---|---|
| "No schema changes detected" | TypeScript schema matches last migration snapshot | Nothing needed |
| "X changes detected" (additive) | Schema was changed without running `generate` | Run `pnpm --filter db generate` and commit the output |
| "X changes detected" (destructive) | Schema has drops or renames without a migration file | Run `generate`, review carefully, follow the rename/drop procedure above |

---

## Migration journal table

Applied migrations are recorded in:

```
Schema:  drizzle
Table:   __drizzle_migrations
Columns: id (serial), hash (text), created_at (bigint ms timestamp)
```

Do not manually modify this table. If the journal gets out of sync with the migration files (e.g., a file was deleted after being applied), contact an operator — this is a recoverable situation but requires manual intervention.

---

## Baseline (Wave 1.B context)

The baseline migration (`0000_baseline.sql`) was generated from the schema as it existed on 2026-06-07, after 27 tables had been built up via the previous `push`-based workflow. Because those tables already existed on both the dev and production databases, the baseline was **stamped** (recorded in `drizzle.__drizzle_migrations` without being executed) rather than applied. This means:

- Running `drizzle-kit migrate` on an existing database with the baseline already stamped: zero migrations applied (correct).
- Running `drizzle-kit migrate` on a fresh database: all migrations apply from the beginning, including the baseline, creating the full schema from scratch (correct).

Every migration file committed after the baseline is a genuine incremental change and will be applied on all existing databases.
