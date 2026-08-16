import { Router, type IRouter } from "express";
import { requireSession } from "../middlewares/requireBrandAccess.js";
import { routeParam } from "../lib/routeParam.js";
import { db, adBoostsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

const MAX_URL_LENGTH = 2048;
const MAX_TEXT_LENGTH = 100;

/** Returns the trimmed URL if it is a valid http(s) URL, otherwise null. */
function sanitizeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return trimmed;
  } catch {
    return null;
  }
}

function sanitizeAmount(value: unknown): number | null {
  if (typeof value !== "number" || !isFinite(value) || value < 0) return null;
  return value;
}

/** Returns YYYY-MM-DD if the value is a valid date string, otherwise null. */
function sanitizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : trimmed;
}

function sanitizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_TEXT_LENGTH) return null;
  return trimmed;
}

router.get("/ad-boosts", requireSession, async (_req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(adBoostsTable)
      .orderBy(desc(adBoostsTable.created_at));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch ad boosts" });
  }
});

router.post("/ad-boosts", requireSession, async (req, res): Promise<void> => {
  const { brand_id, post_url, post_name, posted_on, boost_amount, boost_duration, target_audience } = req.body as {
    brand_id?: number;
    post_url?: string;
    post_name?: string | null;
    posted_on?: string | null;
    boost_amount?: number | null;
    boost_duration?: string | null;
    target_audience?: string | null;
  };
  const url = sanitizeUrl(post_url);
  if (!url) { res.status(400).json({ error: "post_url must be a valid http(s) link" }); return; }
  if (!brand_id || typeof brand_id !== "number" || !Number.isInteger(brand_id)) { res.status(400).json({ error: "brand_id is required" }); return; }
  try {
    const [row] = await db
      .insert(adBoostsTable)
      .values({
        brand_id,
        post_url: url,
        post_name: sanitizeText(post_name),
        posted_on: sanitizeDate(posted_on),
        boost_amount: sanitizeAmount(boost_amount),
        boost_duration: sanitizeText(boost_duration),
        target_audience: sanitizeText(target_audience),
      })
      .returning();
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add ad boost" });
  }
});

router.patch("/ad-boosts/:id", requireSession, async (req, res): Promise<void> => {
  const id = parseInt(routeParam(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const body = req.body as Partial<{
    brand_id: number;
    post_url: string;
    post_name: string | null;
    posted_on: string | null;
    boost_amount: number | null;
    boost_duration: string | null;
    target_audience: string | null;
    done: boolean;
  }>;
  const updates: Record<string, unknown> = {};
  if (typeof body.brand_id === "number" && Number.isInteger(body.brand_id)) updates.brand_id = body.brand_id;
  if ("post_url" in body) {
    const url = sanitizeUrl(body.post_url);
    if (!url) { res.status(400).json({ error: "post_url must be a valid http(s) link" }); return; }
    updates.post_url = url;
  }
  if ("post_name" in body) updates.post_name = sanitizeText(body.post_name);
  if ("posted_on" in body) updates.posted_on = sanitizeDate(body.posted_on);
  if ("boost_amount" in body) updates.boost_amount = sanitizeAmount(body.boost_amount);
  if ("boost_duration" in body) updates.boost_duration = sanitizeText(body.boost_duration);
  if ("target_audience" in body) updates.target_audience = sanitizeText(body.target_audience);
  if (typeof body.done === "boolean") updates.done = body.done;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "No valid fields to update" }); return; }
  try {
    const [row] = await db
      .update(adBoostsTable)
      .set(updates)
      .where(eq(adBoostsTable.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update ad boost" });
  }
});

router.delete("/ad-boosts/:id", requireSession, async (req, res): Promise<void> => {
  const id = parseInt(routeParam(req.params.id), 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await db
      .delete(adBoostsTable)
      .where(eq(adBoostsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete ad boost" });
  }
});

export default router;
