---
name: CardDetailModal sticky footer fix
description: How to make the modal footer stay pinned without inserting new wrapper divs that break Babel JSX parsing.
---

## Rule
Do NOT try to use `flex-1` on the content div to fill space — it only works if the parent has a **definite height** (explicit `height`, not just `max-height`). `max-h-[95vh]` alone does NOT create a definite height in the CSS flex spec, so `flex-1` is a no-op and the footer ends up clipped below the 95vh boundary.

**Why:** The flex algorithm distributes "remaining space" relative to the parent's definite size. `max-height` is a constraint, not a size — the browser does not know how much "remaining" space there is until content is laid out, so flex-grow children can't fill it.

**Correct approach:** Keep `overflow-y-auto overflow-x-hidden` on `motion.div` (the whole modal scrolls), and give the footer `sticky bottom-0` so it pins to the bottom of the scrollable container as the user scrolls through long content.

```
motion.div:   max-h-[95vh]  overflow-y-auto overflow-x-hidden  flex flex-col
Header div:   shrink-0      (optional, safe to keep)
Content div:  flex-1        p-4 sm:p-6 space-y-5                (no overflow-y-auto here)
Footer div:   sticky bottom-0  bg-white                         (pins as you scroll)
```

**How to apply:** Whenever you need a pinned footer inside a max-height scrollable modal — put `overflow-y-auto` on the container and `sticky bottom-0` on the footer. Never remove overflow-y-auto from the container in favour of flex tricks without also giving the container an explicit `height`.

**Gotcha:** Never insert a new `<div>` scroll wrapper into this file. The JSX has multi-line div attributes that awk/grep div-balance tools miss, causing all balance counts to be off by 1. Every structural div addition will trigger Babel "Expected corresponding JSX closing tag" even when tsc passes.
