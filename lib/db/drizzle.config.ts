import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  // Migration files are written here by `drizzle-kit generate` and read by
  // `drizzle-kit migrate`. This directory must be committed to the repo.
  // Never run `drizzle-kit push` — it bypasses the migration file review step.
  out: path.join(__dirname, "./drizzle"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
