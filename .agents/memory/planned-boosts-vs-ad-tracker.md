---
name: Planned boosts vs Ad Tracker
description: Defines the boundary between boost planning on content posts and actual paid-social activity.
---

Calendar boost details represent the planned daily spend and planned campaign date range. The Ad Tracker represents actual paid-social activity. Do not automatically create or update tracker entries from calendar plans unless the product explicitly introduces a reconciliation flow.

**Why:** Plans can change, and one logical item can have multiple platform rows. Automatic tracker creation could double-count spend or turn an unapproved plan into an actual advertising record.

**How to apply:** Treat calendar boost data as optional planning metadata. Keep actual results and completed spending in the Ad Tracker; if linking is added later, use an explicit relationship and user-confirmed “start boost” or reconciliation action.