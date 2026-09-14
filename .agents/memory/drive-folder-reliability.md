---
name: Drive folder reliability
description: Reliability rules for automatic Google Drive folders attached to calendar posts.
---

Calendar post folders are mandatory infrastructure, not an optional enhancement. The API must fail closed before accepting traffic if required parent configuration is missing, inaccessible, not a folder, or not writable. Runtime readiness must verify actual access with a bounded check rather than merely checking that variables are nonblank.

**Why:** Missing runtime configuration previously caused calendar posts to save normally while folder creation was silently skipped. This produced a large backlog with no immediate operational signal.

**How to apply:** Keep Drive failures explicit for every affected post, use a partial-success response after database insertion so clients do not blindly retry the whole create request, and make folder creation idempotent so a retry can reuse a folder created before a database update failed. Never log parent IDs or raw provider responses.