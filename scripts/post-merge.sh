#!/bin/bash
# post-merge.sh — runs automatically after every task merge.
#
# Schema changes are applied via `drizzle-kit migrate`, NOT `drizzle-kit push`.
#
# WHY push IS PROHIBITED:
#   drizzle-kit push compares the live DB against the TypeScript schema and
#   applies the diff immediately — no file output, no review step, no history.
#   For destructive changes (DROP TABLE, DROP COLUMN, renames) it prompts
#   interactively, which in a non-TTY post-merge context either silently skips
#   the destructive operation or hangs. It leaves no auditable migration trail.
#
#   The migration-file workflow replaces this with a committed .sql file per
#   change that is reviewed in PRs before anything touches the database.
#   See docs/SCHEMA_GOVERNANCE.md for the full process.

set -e

pnpm install --frozen-lockfile

# ── DROP guard ───────────────────────────────────────────────────────────────
# Scan every committed migration file for destructive DDL. If any is found,
# abort and require an operator to explicitly set ALLOW_DROP=1 after reviewing
# the migration. This guard runs even on already-applied migrations so that any
# file that slipped through review is caught before the next migration run.
#
# Override: ALLOW_DROP=1 pnpm --filter db migrate:force
# Only use after manually reviewing the DROP statement and confirming no data
# loss. Document the decision in the PR that introduced the migration.

MIGRATION_DIR="lib/db/drizzle"

if [ -d "$MIGRATION_DIR" ] && ls "$MIGRATION_DIR"/*.sql 2>/dev/null | head -1 | grep -q .; then
  DESTRUCTIVE_FILES=$(grep -liE "(^|;)[[:space:]]*(DROP[[:space:]]+TABLE|DROP[[:space:]]+COLUMN|ALTER[[:space:]]+TABLE[^;]+DROP[[:space:]]+(COLUMN|CONSTRAINT))" "$MIGRATION_DIR"/*.sql 2>/dev/null || true)

  if [ -n "$DESTRUCTIVE_FILES" ]; then
    if [ "${ALLOW_DROP:-0}" != "1" ]; then
      echo ""
      echo "ERROR: The following migration file(s) contain DROP TABLE, DROP COLUMN,"
      echo "or ALTER TABLE ... DROP. This is a destructive operation."
      echo ""
      echo "$DESTRUCTIVE_FILES" | sed 's/^/  /'
      echo ""
      echo "Review the migration carefully and confirm no data will be lost."
      echo "If intentional, an operator must run:"
      echo "  ALLOW_DROP=1 pnpm --filter db migrate:force"
      echo ""
      echo "See docs/SCHEMA_GOVERNANCE.md for the drop procedure."
      exit 1
    else
      echo "WARNING: ALLOW_DROP=1 set — proceeding despite destructive DDL in migration files."
      echo "$DESTRUCTIVE_FILES" | sed 's/^/  /'
    fi
  fi
fi

# ── Apply pending migrations ──────────────────────────────────────────────────
# drizzle-kit migrate reads lib/db/drizzle/meta/_journal.json, compares it
# against drizzle.__drizzle_migrations on the target DB, and applies only the
# pending files in sequence. If no migration directory exists yet (e.g. before
# the baseline is generated and committed), this is a no-op.

if [ -d "$MIGRATION_DIR" ]; then
  pnpm --filter db migrate
else
  echo "No migration directory found at $MIGRATION_DIR — skipping migrate step."
  echo "Run 'pnpm --filter db generate' to create the baseline migration."
fi
