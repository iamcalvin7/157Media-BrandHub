import { pgTable, serial, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";

export const copywriterFeedbackTable = pgTable(
  "copywriter_feedback",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().default(1).references(() => brandsTable.id, { onDelete: "restrict" }),
    type: text("type").notNull(), // "approved" | "rejected"
    caption: text("caption"),
    platform: text("platform"),
    market: text("market"),
    post_type: text("post_type"),
    note: text("note"),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    brandIdx: index("copywriter_feedback_brand_idx").on(t.brand_id),
  }),
);
