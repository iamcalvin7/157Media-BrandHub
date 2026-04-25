import { pgTable, text, serial, timestamp, integer, uniqueIndex } from "drizzle-orm/pg-core";

export const teamMembersTable = pgTable(
  "team_members",
  {
    id: serial("id").primaryKey(),
    brand_id: integer("brand_id").notNull().default(1),
    name: text("name").notNull(),
    role: text("role"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    brandNameIdx: uniqueIndex("team_members_brand_name_idx").on(table.brand_id, table.name),
  }),
);

export type TeamMember = typeof teamMembersTable.$inferSelect;
