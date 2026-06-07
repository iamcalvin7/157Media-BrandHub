-- W1.D2A — Data cleanup (no schema changes)
-- Applied: 2026-06-07
-- Scope: fix three known data anomalies discovered by audit-integrity.ts
-- All statements are idempotent (safe to re-run, affect 0 rows if already clean).

-- 1. Normalize content_posts.status capitalisation.
--    "Draft" → "draft"  (1 row affected on first run)
UPDATE content_posts
SET    status = lower(status)
WHERE  status != lower(status);

--> statement-breakpoint

-- 2. Normalize events.market capitalisation.
--    Canonical set: 'both' (lowercase), 'English', 'Italian'.
--    NOTE: initcap() is intentionally NOT used here — initcap('both') = 'Both'
--    which is not canonical and would corrupt the 32 correct 'both' rows.
--    Only the two known bad values are explicitly targeted.
--    "english" → "English"  (1 row on first run)
UPDATE events SET market = 'English' WHERE market = 'english';

--> statement-breakpoint

--    "italian" → "Italian"  (1 row on first run)
UPDATE events SET market = 'Italian' WHERE market = 'italian';

--> statement-breakpoint

-- 3. Null-out brand_voice_notes.source_post_id orphan references.
--    Rows bvn.id=84,85 reference source_post_id=48 which no longer exists.
--    (2 rows affected on first run; idempotent — orphan check re-evaluates each time)
UPDATE brand_voice_notes
SET    source_post_id = NULL
WHERE  source_post_id IS NOT NULL
  AND  source_post_id NOT IN (SELECT id FROM content_posts);
