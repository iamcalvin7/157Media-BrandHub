import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const brandVoiceNotesTable = pgTable("brand_voice_notes", {
  id: serial("id").primaryKey(),
  source_post_id: integer("source_post_id"),
  note: text("note").notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BrandVoiceNote = typeof brandVoiceNotesTable.$inferSelect;
