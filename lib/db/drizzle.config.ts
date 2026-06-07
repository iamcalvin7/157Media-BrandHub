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
  //
  // NOTE: Use a relative path here, not path.join(__dirname, ...). drizzle-kit
  // check prepends "./" to absolute paths causing a double-slash path error.
  // All drizzle-kit commands are run from lib/db/ via pnpm --filter db, so
  // "./drizzle" resolves correctly to lib/db/drizzle/ in every case.
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
