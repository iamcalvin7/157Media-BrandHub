# Future Improvements

## Google Drive Auto-Folder on New GHS Post

When a new GHS post is created, automatically create a Google Drive folder for it and pre-fill the "Drive folder · Export + PSD" field with the link — so the designer sees the handoff location without any manual copy-paste.

**How it works:**
- A Google Cloud service account is granted access to a shared parent "Brand Hub" folder in Drive.
- When the `POST /api/content/posts` route saves a new GHS post, the server calls the Drive API to create a sub-folder (named after the post title + scheduled date).
- The resulting folder URL is written back into the `drive_url` field automatically.

**What's needed to build it:**
1. Create a Google Cloud project and enable the Drive API.
2. Generate a service account key and share the parent Drive folder with it.
3. Add the service account credentials as environment secrets.
4. Update the POST route to call Drive and patch `drive_url` after insert.

**Estimated effort:** ~1–2 hours once credentials are in place.

---

## Unified Calendar View

Currently there are 4 separate calendar views (one per channel/brand combination). The idea is to merge them into a single calendar with clear channel labels on each post card, so the whole content schedule is visible at a glance without switching tabs.

**What it would look like:**
- One calendar grid showing all posts across VF and GHS.
- Each post card carries a visible channel label (e.g. a colour-coded pill or brand logo mark) so it's instantly clear which brand/platform it belongs to.
- Filters at the top let the team narrow down to a specific brand or channel when needed, without leaving the unified view.

**What's needed to build it:**
1. Replace the current tab-per-view structure with a single calendar grid that queries posts across both brands.
2. Add a channel/brand indicator to each `PostCard` component.
3. Add filter controls (brand, platform, status) to the calendar toolbar.
4. Ensure the "New Post" flow still correctly scopes the post to the right brand based on the selected filter or a channel picker in the modal.

**Estimated effort:** ~3–5 hours.
