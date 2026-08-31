---
name: Planned boosts vs Ad Tracker
description: Defines the boundary between boost planning on content posts and actual paid-social activity.
---

Calendar boost details represent the planned daily spend and planned campaign date range. The Ad Tracker represents actual paid-social activity. Planning fields alone never create tracker spend; the explicit **Boosted** action is the reconciliation point that confirms the campaign as actual.

**Why:** Plans can change, so they must not count as spend until a user confirms Boosted. One logical item can also have multiple platform rows and cross month boundaries, so actual spend must be source-linked, deduplicated by reporting page, and split into monthly allocations.

**How to apply:** Treat boost budget/dates as optional planning metadata until Boosted is enabled. Then maintain source-linked automatic tracker allocations by month and reporting page; mutate the calendar post and tracker allocations in one database transaction so they cannot diverge. Repeated saves replace allocations idempotently, and unmarking Boosted removes only linked automatic rows. Never alter manual tracker entries.