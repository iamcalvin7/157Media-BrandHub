import { pgTable, text, serial, integer, timestamp, varchar, index } from "drizzle-orm/pg-core";

// Client feedback on a single post inside a shared collection. Public clients
// post here from /share/:token — see artifacts/api-server/src/routes/shares.ts.
// `brand_id` is denormalised so the calendar can fetch feedback per brand
// without joining through `shared_collections` every time.
export const sharePostFeedbackTable = pgTable(
  "share_post_feedback",
  {
    id: serial("id").primaryKey(),
    share_token: varchar("share_token", { length: 64 }).notNull(),
    brand_id: integer("brand_id").notNull(),
    post_id: integer("post_id").notNull(),
    // 'approved' | 'changes_requested' — null when the client only commented
    decision: text("decision"),
    comment: text("comment"),
    client_name: text("client_name"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    by_post: index("share_post_feedback_post_idx").on(t.post_id),
    by_brand: index("share_post_feedback_brand_idx").on(t.brand_id),
    by_token: index("share_post_feedback_token_idx").on(t.share_token),
  }),
);

export type SharePostFeedback = typeof sharePostFeedbackTable.$inferSelect;
