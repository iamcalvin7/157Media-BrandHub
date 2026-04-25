import { Router, type IRouter } from "express";
import { db, brandsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/brands", async (_req, res) => {
  try {
    const brands = await db.select().from(brandsTable);
    brands.sort((a, b) => a.id - b.id);
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: "Failed to load brands", detail: String(err) });
  }
});

export default router;
