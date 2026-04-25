import { Router, type IRouter } from "express";
import { db, changelogEntriesTable } from "@workspace/db";
import { brandKnowledgeChangelog } from "../lib/knowledgeChangelog.js";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/changelog", async (req, res): Promise<void> => {
  const entries = await db
    .select()
    .from(changelogEntriesTable)
    .where(eq(changelogEntriesTable.brand_id, req.brandId))
    .orderBy(changelogEntriesTable.sortKey);

  const sorted = [...entries].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
  res.json(sorted);
});

export async function seedChangelogFromStatic(): Promise<void> {
  for (const [brandId, entries] of brandKnowledgeChangelog) {
    for (const entry of entries) {
      const existing = await db
        .select()
        .from(changelogEntriesTable)
        .where(and(eq(changelogEntriesTable.brand_id, brandId), eq(changelogEntriesTable.sortKey, entry.sortKey)));
      if (existing.length === 0) {
        await db.insert(changelogEntriesTable).values({ ...entry, brand_id: brandId });
      }
    }
  }
}

export default router;
