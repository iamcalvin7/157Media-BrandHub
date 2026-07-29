import {
  pgTable, text, serial, timestamp, integer, index,
} from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";

export const evergreenContentTable = pgTable(
  "evergreen_content",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().references(() => brandsTable.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    link: text("link"),
    thumbnail_url: text("thumbnail_url"),
    media_type: text("media_type").notNull().default("image"), // "image" | "video"
    last_used_at: timestamp("last_used_at", { withTimezone: true }),
    notes: text("notes"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    brandIdx: index("evergreen_content_brand_idx").on(t.brand_id),
  }),
);

export type EvergreenContent = typeof evergreenContentTable.$inferSelect;
