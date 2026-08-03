import {
  pgTable, text, serial, timestamp, index,
} from "drizzle-orm/pg-core";

/**
 * Tracks the processing state of uploaded videos.
 *
 * Every uploaded MP4/MOV gets a canonical browser-delivery MP4 derivative
 * (H.264/AAC, yuv420p, +faststart). The original upload is kept untouched;
 * only the canonical file is exposed as the playable public asset.
 *
 * status: "processing" | "ready" | "failed"
 */
export const videoDerivativesTable = pgTable(
  "video_derivatives",
  {
    id: serial("id").primaryKey(),
    /** Object path of the original upload, e.g. "/objects/uploads/<uuid>.mov" */
    source_path: text("source_path").notNull().unique(),
    /** Object path of the canonical MP4, e.g. "/objects/uploads/<uuid>__canonical.mp4" */
    canonical_path: text("canonical_path"),
    status: text("status").notNull().default("processing"),
    /** Human-readable failure reason when status = "failed" */
    error: text("error"),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("video_derivatives_status_idx").on(t.status),
  }),
);

export type VideoDerivative = typeof videoDerivativesTable.$inferSelect;
