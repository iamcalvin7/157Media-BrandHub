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
