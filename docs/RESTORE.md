# Restore Runbook — Virtu Ferries Brand Hub

> **Danger:** Restore operations modify or replace the target database.
> Always run without `--confirm` first (dry-run mode) and confirm the target is NOT production.
> Read the entire relevant tier section before executing any command.

---

## Recovery Tiers

| Tier | Trigger | Mechanism | Target RTO |
|---|---|---|---|
| 1 — Soft | Single table corrupted or accidentally deleted | Restore that table from yesterday's backup | 30 min |
| 2 — Medium | Multiple tables lost or corrupted | Full restore from latest daily backup | 1 hour |
| 3 — Hard | Database dropped or unrecoverable | Fresh schema via migrate + full restore | 2 hours |

---

## Contact Replit First

Before attempting any self-recovery, check:

1. Is the Replit PostgreSQL service itself reporting an outage? Check [Replit status](https://status.replit.com).
2. Was the database deleted in the last few hours? **Contact Replit support immediately** — they may have platform-level snapshots before you attempt any self-recovery that could interfere.
3. If the database is accessible but data is missing, proceed with the tier procedures below.

---

## Prerequisites

You need access to:
- The Replit environment (to run commands)
- `DATABASE_URL` — the production connection string (Replit Secret)
- `PRIVATE_OBJECT_DIR` — Object Storage env var (Replit Secret)
- A temporary test database URL (`TEST_DATABASE_URL`) for the drill

---

## Tier 1 — Single Table Restore

**When to use:** `content_posts` deleted by accident, `events` table corrupted, etc.

Not yet scripted (W1.C). Interim procedure:

1. Download the latest backup manifest to identify the most recent backup:
   ```
   GET /api/admin/backup-status  (x-api-key: $API_KEY)
   ```
2. Note the `backup_id` from the manifest.
3. Download the backup from Object Storage using the GCS console or gsutil:
   ```
   gsutil cp gs://{bucket}/backups/daily/{backup_id}.dump /tmp/restore.dump
   ```
4. Restore a single table using `pg_restore --table`:
   ```
   pg_restore --table=content_posts --clean --if-exists --no-owner --no-privileges \
     --dbname=$DATABASE_URL /tmp/restore.dump
   ```
5. Verify row count:
   ```sql
   SELECT COUNT(*) FROM content_posts;
   ```

---

## Tier 2 — Full Restore

**When to use:** Multiple tables are lost or corrupted; the database is intact but data is wrong.

```bash
# Step 1: Identify the backup to restore from
curl -H "x-api-key: $API_KEY" https://{domain}/api/admin/backup-status | jq .manifest.backup_id

# Step 2: Provision a temporary test database and verify first (always)
TEST_DATABASE_URL=... tsx scripts/src/verify-restore.ts \
  --backup backups/daily/{backup_id}.dump \
  --target-url $TEST_DATABASE_URL \
  --confirm

# Step 3: If verification passes, stop the api-server workflow in Replit

# Step 4: Run pg_restore against production (destructive — no undo)
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname=$DATABASE_URL /tmp/restore.dump

# Step 5: Restart the api-server workflow

# Step 6: Confirm health
curl https://{domain}/api/healthz
```

---

## Tier 3 — Full Schema + Data Restore (Database Dropped)

**When to use:** The PostgreSQL database itself is gone.

```bash
# Step 1: Provision a new PostgreSQL database in Replit
# Step 2: Note the new DATABASE_URL secret — update it in Replit Secrets

# Step 3: Download the latest backup
# (Use the GCS console or a temporary script that reads PRIVATE_OBJECT_DIR)

# Step 4: pg_restore into the new database
pg_restore --clean --if-exists --no-owner --no-privileges \
  --dbname=$NEW_DATABASE_URL /tmp/restore.dump

# Step 5: Stamp the migration journal (backup pre-dates stamp or stamp was not in dump)
DATABASE_URL="$NEW_DATABASE_URL" pnpm --filter @workspace/scripts stamp-baseline

# Step 6: Restart the api-server workflow (bootstrapFromSnapshot will run)

# Step 7: Confirm health check and spot-check key tables
curl https://{domain}/api/healthz
```

---

## Quarterly Restore Drill Procedure

The drill validates that the backup is restorable and all post-restore checks pass.
Run quarterly, or before any major schema migration.

### Step 1 — Confirm backup is OK

```bash
curl -H "x-api-key: $API_KEY" https://{domain}/api/admin/backup-status
# status must be "ok"
```

### Step 2 — Provision a test database

**Option A — New Replit PostgreSQL database (preferred):**
1. Open the Replit workspace
2. Tools → Database → Create new
3. Copy the connection string
4. `export TEST_DATABASE_URL="<copied-url>"`

**Option B — createdb on the same server (fallback if Option A unavailable):**
```bash
createdb --username=$PGUSER vfh_drill
export TEST_DATABASE_URL="postgresql://$PGUSER:<password>@$PGHOST/$PGDATABASE_vfh_drill"
```
> ⚠ Option B shares a server with production. Use Option A whenever possible.

### Step 3 — Dry-run (no --confirm — safe, non-destructive)

```bash
tsx scripts/src/verify-restore.ts \
  --backup latest \
  --target-url "$TEST_DATABASE_URL"
```

Review the printed plan. Confirm the target host is the test database, not production.

### Step 4 — Execute the drill

```bash
tsx scripts/src/verify-restore.ts \
  --backup latest \
  --target-url "$TEST_DATABASE_URL" \
  --confirm
```

The script:
- Refuses to run if `--target-url` resolves to the production `DATABASE_URL`
- Downloads the backup from GCS, verifies SHA256
- Runs `pg_restore --clean --if-exists` against the test database
- Verifies row counts (all tables vs manifest)
- Verifies restored table count matches manifest
- Verifies all FK constraints are valid (`convalidated = true`)
- Verifies sequences are ≥ `max(id)` for all tables
- Checks `drizzle.__drizzle_migrations` (SKIPPED for pre-stamp backups — expected)
- Checks `data_snapshot_version` and `deleted_row_tombstones` existence
- Writes result to `docs/restore-drill-results.jsonl`
- Updates the Drill Log table below

### Step 5 — Review RESTORE DRILL SUMMARY

All checks should show `PASS` or `SKIPPED`/`WARN` with an "(expected)" note.
A `FAIL` on any check means the backup should not be used for a production restore
until the failure is investigated.

### Step 6 — Manual app boot verification

```bash
# Point a local api-server instance at the test database
NODE_ENV=production DATABASE_URL="$TEST_DATABASE_URL" \
  pnpm --filter @workspace/api-server run dev &

sleep 5
curl http://localhost:$PORT/api/healthz
# Expected: {"status":"ok"}

# Kill the process when done
kill %1
```

### Step 7 — Commit results

```bash
git add docs/RESTORE.md docs/restore-drill-results.jsonl
git commit -m "chore: restore drill result $(date +%Y-%m-%d)"
```

### Step 8 — Drop the test database

- **Option A:** Replit → Tools → Database → Delete the test database
- **Option B:** `dropdb --username=$PGUSER vfh_drill`

Confirm `$TEST_DATABASE_URL` is no longer connectable.

---

## Drill Log

| Date | Backup Tested | Result | Tables | Total Rows | Operator |
|---|---|---|---|---|---|
| *(First drill pending)* | | | | | |

Machine-readable records: [`docs/restore-drill-results.jsonl`](./restore-drill-results.jsonl)
(created automatically by `verify-restore.ts` on first successful drill execution)

---

## Backup Status Endpoint

```
GET /api/admin/backup-status
x-api-key: {API_KEY}
```

**Response `status` values:**

| Value | Meaning |
|---|---|
| `ok` | Latest backup < 25 hours old, integrity check PASSED |
| `stale` | Latest backup is 25–48 hours old |
| `critical` | Latest backup > 48 hours old OR integrity check FAILED |
| `unavailable` | Cannot reach Object Storage or no backup exists yet |

---

## Backup Storage Layout

```
GCS Bucket: {DEFAULT_OBJECT_STORAGE_BUCKET_ID}
  backups/
    daily/
      prod-{timestamp}.dump           ← pg_dump custom format (compressed)
      prod-{timestamp}.manifest.json  ← row counts, SHA256, metadata
      ... (30 most recent)
    latest/
      prod.dump                       ← always the most recent
      prod.manifest.json              ← always the most recent
```

**Retention:** 30 daily backups. Older ones are pruned automatically after each successful backup.

---

## Known Limitations (updated W1.C)

1. **`/tmp` is ephemeral** — the fallback local dump is lost if the container restarts mid-backup.
2. **No Tier 1 script yet** — single-table restore is a manual procedure (scripted in a future wave).
3. **App boot verification is manual** — `verify-restore.ts` cannot spin up the api-server itself; Step 6 above must be run by the operator.
4. **Production-only data risk window** — if Object Storage is unavailable for longer than the container uptime and the container restarts, the backup window is lost for that day.
5. **drizzle schema check skips pre-stamp backups** — backups taken before 2026-06-07T15:16:56Z do not contain `drizzle.__drizzle_migrations`. The drill script detects this automatically and marks the check SKIPPED (expected). From the next daily backup onward, the check runs fully.
