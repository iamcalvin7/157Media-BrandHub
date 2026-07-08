---
name: Draft-accumulator modals must auto-save (or warn) on close
description: A modal that stages field edits into local `draft` state (only flushed by an explicit "Save" button) silently drops all staged edits if the user closes/navigates away instead of clicking Save — even if each field showed a "saved" checkmark.
---

## The bug pattern
Content-calendar's CardDetailModal accumulates per-field edits into a local `draft` object; nothing reaches the server until "Save changes" is clicked. Each field's inline `Editable` component still shows a "saved" checkmark the instant its `onSave` (which just calls `updateDraft`) resolves — so users believe the edit is already persisted. The modal's X/Close buttons called `onClose` directly with no check for unsaved `draft` state, silently discarding it.

**Why this matters:** Verified via `auth_audit_log` and production request logs that the server-side PATCH endpoint was never failing (no DENY/error rows) — the "sometimes doesn't save, need to save twice" symptom was 100% client-side data loss from closing before the explicit Save, not a network/auth/brand-header bug.

**How to apply:** Any UI with a local draft/staging pattern (edits accumulate in state, one explicit "Save" button flushes to the server) must not allow silent close-to-discard. Guard the close handler: if there's unsaved draft state, auto-save before closing (and surface an error inline if the save fails, don't close), and add a `beforeunload` listener for tab-close/refresh. Don't rely on per-field "saved" indicators alone — they can mean "staged locally," not "persisted."
