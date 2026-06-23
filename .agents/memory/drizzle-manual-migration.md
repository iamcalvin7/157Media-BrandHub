---
name: Drizzle manual migration ordering
description: Journal entry must be added AFTER the SQL runs, not before, or drizzle-kit skips the migration entirely.
---

**Rule:** When writing a Drizzle migration by hand, always run the SQL first, then add the journal entry. Never add the journal entry before the SQL executes.

**Why:** drizzle-kit reads the journal to decide which migrations are pending. If the entry exists, it assumes the migration was already applied and silently skips the SQL file. The column never gets created, and the app starts throwing `errorMissingColumn` at runtime.

**How to apply:**
1. Write the `.sql` file in `lib/db/drizzle/`.
2. Run `pnpm --filter @workspace/db migrate` — drizzle-kit will detect the new SQL file (journal entry absent) and execute it.
3. Only after confirming the migration succeeded, add the entry to `lib/db/drizzle/meta/_journal.json`.

If the migration was already skipped (journal entry written prematurely), apply the SQL directly:
```js
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('ALTER TABLE <table> ADD COLUMN IF NOT EXISTS <col> <type>')
  .then(r => { console.log('done', r.command); pool.end(); });
"
```
Then restart the API server to clear any in-memory rate-limit state caused by the 500 flood.
