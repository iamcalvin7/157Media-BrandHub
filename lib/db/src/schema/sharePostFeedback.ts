import { pgTable, text, serial, integer, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";
import { contentPostsTable } from "./contentPosts";

// Client feedback on a single post inside a shared collection. Public clients
// post here from /share/:token — see artifacts/api-server/src/routes/shares.ts.
// `brand_id` is denormalised so the calendar can fetch feedback per brand
// without joining through `shared_collections` every time.
export const sharePostFeedbackTable = pgTable(
  "share_post_feedback",
  {
    id: serial("id").primaryKey(),
    share_token: varchar("share_token", { length: 64 }).notNull(),
    brand_id: integer("brand_id").notNull().references(() => brandsTable.id, { onDelete: "restrict" }),
    post_id: integer("post_id").notNull().references(() => contentPostsTable.id, { onDelete: "cascade" }),
    // 'approved' | 'changes_requested' — null when the client only commented
    decision: text("decision"),
    // Legacy single free-text comment field — kept for old rows created
    // before the copy/visual split. New submissions use the two fields below.
    comment: text("comment"),
    copy_comment: text("copy_comment"),
    visual_comment: text("visual_comment"),
    client_name: text("client_name"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    amended_at: timestamp("amended_at", { withTimezone: true }),
    // Set by any team member who presses "Done" in the notification bell.
    // Rows with dismissed_at are excluded from the feedback bell globally
    // so all colleagues see the notification disappear at the same time.
    dismissed_at: timestamp("dismissed_at", { withTimezone: true }),
  },
  (t) => ({
    by_post: index("share_post_feedback_post_idx").on(t.post_id),
    by_brand: index("share_post_feedback_brand_idx").on(t.brand_id),
    by_token: index("share_post_feedback_token_idx").on(t.share_token),
  }),
);

export type SharePostFeedback = typeof sharePostFeedbackTable.$inferSelect;
