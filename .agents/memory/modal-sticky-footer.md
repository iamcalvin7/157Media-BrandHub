---
name: CardDetailModal sticky footer fix
description: How to make the modal footer stay pinned without inserting new wrapper divs that break Babel JSX parsing.
---

## Rule
Do NOT insert a new `<div>` wrapper around the scrollable content in a large JSX file. Instead, promote the `flex-1 overflow-y-auto min-h-0` classes directly onto the existing content div.

**Why:** The file has multi-line JSX div attributes (e.g. `<div\n  key={f.id}\n  className={...}\n>`). `awk` and manual counting tools miss these multi-line opens, so the balance appears wrong and every attempt to add a matching `</div>` close breaks Babel's parser with "Expected corresponding JSX closing tag for <div>".

**How to apply:** When you need a flex-col modal with pinned header + scrolling body + pinned footer:
1. Add `flex flex-col min-h-0` to the `<motion.div>` wrapper.
2. Add `shrink-0` to the header div.
3. Change the content div className to include `flex-1 overflow-y-auto overflow-x-hidden min-h-0` (merge, don't wrap).
4. Add `shrink-0` to the footer div.
5. Zero new div elements = zero JSX balance risk.

The floating portal Save pill (`createPortal` into `document.body`, `fixed bottom-6`, `z-[200]`, gated on `hasDraft`) is also present as a secondary affordance.
