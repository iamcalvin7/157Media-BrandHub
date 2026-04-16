import { Router, type IRouter } from "express";
import { db, changelogEntriesTable } from "@workspace/db";
import { knowledgeChangelog } from "../lib/knowledgeChangelog.js";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/changelog", async (_req, res): Promise<void> => {
  const entries = await db
    .select()
    .from(changelogEntriesTable)
    .orderBy(changelogEntriesTable.sortKey);

  const sorted = [...entries].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  res.json(sorted);
});

export async function seedChangelogFromStatic(): Promise<void> {
  for (const entry of knowledgeChangelog) {
    const existing = await db
      .select()
      .from(changelogEntriesTable)
      .where(eq(changelogEntriesTable.sortKey, entry.sortKey));
    if (existing.length === 0) {
      await db.insert(changelogEntriesTable).values(entry);
    }
  }
}

export default router;
