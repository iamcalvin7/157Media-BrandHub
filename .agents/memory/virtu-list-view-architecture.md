---
name: VF content calendar view architecture
description: VF defaults to list view (VirtuListRow), not the calendar grid (PostRow). Adding UI to the wrong one means users never see it.
---

**Rule:** Always trace the render path from `ContentCalendarPage` before touching any row/card component.

**Why:** The calendar page has two distinct row components:
- `PostRow` — used only in the monthly calendar/grid view (`viewMode === "calendar"`)
- `VirtuListRow` — used in `VirtuListView`, which is the **default view** for VF (`viewMode` initialises to `"list"`)

Adding a feature to `PostRow` alone means VF users in list view (the default) never see it.

**How to apply:**
1. Find the `viewMode` state in `ContentCalendarPage` (initialised to `"list"`).
2. Follow the branch: `isVirtu && viewMode === "list"` → `VirtuListView` → `VirtuListRow`.
3. Implement in `VirtuListRow` first (list view), then optionally in `PostRow` (calendar view).
4. The `CardDetailModal` is shared across both views — changes there apply everywhere.
