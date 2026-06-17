import { pgTable, text, serial, integer, timestamp, index } from "drizzle-orm/pg-core";
import { brandsTable } from "./brands";

export const brandVoiceNotesTable = pgTable(
  "brand_voice_notes",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().default(1).references(() => brandsTable.id, { onDelete: "restrict" }),
    source_post_id: integer("source_post_id"),
    note: text("note").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    brandIdx: index("brand_voice_notes_brand_idx").on(t.brand_id),
    sourcePostIdx: index("brand_voice_notes_source_post_idx").on(t.source_post_id),
  }),
);

export type BrandVoiceNote = typeof brandVoiceNotesTable.$inferSelect;
