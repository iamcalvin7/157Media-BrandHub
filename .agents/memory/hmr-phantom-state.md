---
name: HMR phantom UI state during heavy iteration
description: Why an on-screen UI change can appear without a corresponding server request/DB change during active dev sessions, and how to diagnose it.
---

When a component file is hot-reloaded many times in one browser tab during an active debugging/fix session, the on-screen state can visually show something (e.g. a "done"/"amended" badge) that never actually happened on the server. React Fast Refresh preserves component state across edits, but repeated edits to conditionals/handlers touching that state can leave the rendered UI inconsistent with reality.

**Why:** Encountered this while wiring up a client-feedback "Amend" action — a screenshot showed a feedback item already marked "Amended" with the badge and no button, but grepping the API server logs for that time range showed **zero** PATCH requests for that specific feedback id. The badge was leftover visual state from HMR churn, not a real bug in the amend logic itself.

**How to apply:** When a user reports "I did X but Y didn't happen" partway through a session where you've been iterating on the same file, don't trust the screenshot alone — grep the actual server request logs for the expected endpoint/id around that timestamp first. If nothing hit the server, ask the user to hard-refresh the page and retry before assuming the server-side logic is broken.
