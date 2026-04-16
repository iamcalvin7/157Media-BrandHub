import { Router, type IRouter } from "express";
import { db, teamMembersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/team-members", async (_req, res): Promise<void> => {
  try {
    const rows = await db.select().from(teamMembersTable).orderBy(teamMembersTable.name);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch team members" });
  }
});

router.post("/team-members", async (req, res): Promise<void> => {
  const { name, role } = req.body as { name: string; role?: string };
  if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
  try {
    const [row] = await db.insert(teamMembersTable).values({ name: name.trim(), role: role?.trim() || null }).onConflictDoNothing().returning();
    if (!row) {
      const existing = await db.select().from(teamMembersTable).where(eq(teamMembersTable.name, name.trim()));
      res.json(existing[0]);
    } else {
      res.json(row);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add team member" });
  }
});

router.delete("/team-members/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db.delete(teamMembersTable).where(eq(teamMembersTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete team member" });
  }
});

export default router;
