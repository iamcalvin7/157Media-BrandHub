---
name: Planned boosts vs Ad Tracker
description: Defines the boundary between boost planning on content posts and actual paid-social activity.
---

Calendar boost details represent the planned daily spend and planned campaign date range. The Ad Tracker represents actual paid-social activity. Planning fields alone never create tracker spend; the explicit **Boosted** action is the reconciliation point that confirms the campaign as actual.

**Why:** Plans can change, so they must not count as spend until a user confirms Boosted. One logical item can also have multiple platform rows and cross month boundaries, so actual spend must be source-linked, deduplicated by reporting page, and split into monthly allocations.

**How to apply:** Treat boost budget/dates as optional planning metadata until Boosted is enabled. Then maintain source-linked automatic tracker allocations by month and reporting page; mutate the calendar post and tracker allocations in one database transaction so they cannot diverge. Repeated saves replace allocations idempotently, and unmarking Boosted removes only linked automatic rows. Never alter manual tracker entries.

Manual Ad Tracker rows remain pending until the user marks them Done. Monthly budgets are separate records per reporting page and month; remaining balance is budget minus completed spend, while pending manual rows do not reduce it.

**Why:** A manual tracker row may be a planned or not-yet-confirmed activity, while Boosted is an explicit confirmation of calendar spend. Keeping the states separate avoids reducing a budget before the spend is confirmed.

**How to apply:** Use the budget controls for GHS, VF–EN, and VF IT by month. Calendar-linked rows count immediately when Boosted; manual rows reduce the corresponding budget only after Done is selected.