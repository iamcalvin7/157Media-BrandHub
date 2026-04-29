import { pgTable, serial, text, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";

export const voiceProfilesTable = pgTable(
  "voice_profiles",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull(),
    post_type: text("post_type").notNull(),
    tone: text("tone").notNull().default(""),
    length: text("length").notNull().default(""),
    opening: text("opening").notNull().default(""),
    cta: text("cta").notNull().default(""),
    avoid: text("avoid").notNull().default(""),
    anchor_example: text("anchor_example").notNull().default(""),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uq_brand_posttype: uniqueIndex("voice_profiles_brand_posttype_uq").on(
      t.brand_id,
      t.post_type,
    ),
  }),
);
