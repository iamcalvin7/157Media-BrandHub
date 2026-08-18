---
name: iOS Safari form input quirks
description: Mobile overflow/zoom bugs specific to iPhone form inputs and how to fix them
---

Two iPhone-only input behaviors that desktop testing never reproduces:

1. **date/time inputs overflow narrow grid cells.** `input[type=date|time]` on iOS Safari has an intrinsic minimum width that ignores `width:100%` / `min-width:0` on the input and its cell. Grid math (`minmax(0,1fr)`) is correct — the input itself refuses to shrink and sticks out past the container.
   **Fix:** global CSS `input[type="date"], input[type="time"] { -webkit-appearance:none; appearance:none; min-width:0; max-width:100%; }` plus `input::-webkit-date-and-time-value { text-align:left; }` (iOS centers the value by default).

2. **Auto-zoom on focus when font < 16px.** iOS zooms the page when focusing any input/select/textarea with font-size below 16px, and stays zoomed (looks like the layout is cut off on the right). Use `text-base sm:text-sm` on form controls; `maximum-scale=1` in the viewport meta helps but is not reliable alone.

**How to apply:** any mobile "field is cut off / page shifted right" report — check these two before touching layout classes. Do not assume zoom vs overflow from a screenshot; a visible un-zoomed status bar means real overflow.
