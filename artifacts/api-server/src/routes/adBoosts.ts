import { Router, type IRouter } from "express";
import { requireSession } from "../middlewares/requireBrandAccess.js";
import { routeParam } from "../lib/routeParam.js";
import { db, adBoostsTable, brandsTable, userBrandAccessTable } from "@workspace/db";
import { and, eq, desc, inArray } from "drizzle-orm";

const router: IRouter = Router();

const MAX_URL_LENGTH = 2048;
const MAX_TEXT_LENGTH = 100;
const REPORTING_PAGES = ["GHS", "VF-EN", "VF-IT"] as const;
const ROLE_RANK: Record<string, number> = { viewer: 1, editor: 2, admin: 3 };

function pageForBrand(brandSlug: string, audience: string | null): typeof REPORTING_PAGES[number] {
  if (brandSlug === "gozo-highspeed") return "GHS";
  return (audience ?? "").includes("IT") ? "VF-IT" : "VF-EN";
}

async function brandAccess(userId: string, brandId: number) {
  const [access] = await db
    .select({ slug: brandsTable.slug, role: userBrandAccessTable.role })
    .from(brandsTable)
    .innerJoin(userBrandAccessTable, eq(userBrandAccessTable.brand_id, brandsTable.id))
    .where(and(
      eq(brandsTable.id, brandId),
      eq(userBrandAccessTable.user_id, userId),
    ));
  return access;
}

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

router.get("/ad-boosts", requireSession, async (req, res): Promise<void> => {
  try {
    const access = await db
      .select({ brandId: userBrandAccessTable.brand_id })
      .from(userBrandAccessTable)
      .where(eq(userBrandAccessTable.user_id, req.user!.id));
    if (access.length === 0) { res.json([]); return; }
    const rows = await db
      .select()
      .from(adBoostsTable)
      .where(inArray(adBoostsTable.brand_id, access.map((row) => row.brandId)))
      .orderBy(desc(adBoostsTable.spend_month), desc(adBoostsTable.created_at));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch ad boosts" });
  }
});

router.post("/ad-boosts", requireSession, async (req, res): Promise<void> => {
  const { brand_id, post_url, post_name, posted_on, boost_amount, boost_duration, target_audience, spend_month, page } = req.body as {
    brand_id?: number;
    post_url?: string;
    post_name?: string | null;
    posted_on?: string | null;
    boost_amount?: number | null;
    boost_duration?: string | null;
    target_audience?: string | null;
    spend_month?: string | null;
    page?: string | null;
  };
  const url = sanitizeUrl(post_url);
  if (!url) { res.status(400).json({ error: "post_url must be a valid http(s) link" }); return; }
  if (!brand_id || typeof brand_id !== "number" || !Number.isInteger(brand_id)) { res.status(400).json({ error: "brand_id is required" }); return; }
  if (spend_month != null && !/^\d{4}-\d{2}$/.test(spend_month)) { res.status(400).json({ error: "spend_month must be YYYY-MM" }); return; }
  if (page != null && !REPORTING_PAGES.includes(page as typeof REPORTING_PAGES[number])) { res.status(400).json({ error: "Invalid reporting page" }); return; }
  try {
    const access = await brandAccess(req.user!.id, brand_id);
    if (!access || ROLE_RANK[access.role] < ROLE_RANK.editor) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const resolvedPage = pageForBrand(access.slug, sanitizeText(target_audience));
    if (page != null && page !== resolvedPage) {
      res.status(400).json({ error: "The reporting page does not match the selected brand" });
      return;
    }
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
        spend_month: spend_month ?? sanitizeDate(posted_on)?.slice(0, 7) ?? new Date().toISOString().slice(0, 7),
        page: resolvedPage,
        source: "manual",
        // Adding a row records spend that has already happened; the Done
        // control remains available if the team needs to correct it later.
        done: true,
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
    spend_month: string | null;
    page: string | null;
  }>;
  const [owned] = await db
    .select({
      boost: adBoostsTable,
      role: userBrandAccessTable.role,
      brandSlug: brandsTable.slug,
    })
    .from(adBoostsTable)
    .innerJoin(userBrandAccessTable, eq(userBrandAccessTable.brand_id, adBoostsTable.brand_id))
    .innerJoin(brandsTable, eq(brandsTable.id, adBoostsTable.brand_id))
    .where(and(
      eq(adBoostsTable.id, id),
      eq(userBrandAccessTable.user_id, req.user!.id),
    ));
  if (!owned) { res.status(404).json({ error: "Not found" }); return; }
  if (ROLE_RANK[owned.role] < ROLE_RANK.editor) { res.status(403).json({ error: "Forbidden" }); return; }
  const existing = owned.boost;
  if (existing.source === "calendar") {
    res.status(400).json({ error: "Calendar-linked boosts must be updated from the content calendar" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if ("brand_id" in body && (typeof body.brand_id !== "number" || !Number.isInteger(body.brand_id))) {
    res.status(400).json({ error: "brand_id must be an integer" }); return;
  }
  const targetBrandId = body.brand_id ?? existing.brand_id;
  const targetAccess = targetBrandId === existing.brand_id
    ? { slug: owned.brandSlug, role: owned.role }
    : await brandAccess(req.user!.id, targetBrandId);
  if (!targetAccess || ROLE_RANK[targetAccess.role] < ROLE_RANK.editor) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  if (body.brand_id !== undefined) updates.brand_id = body.brand_id;
  if ("post_url" in body) {
    const url = sanitizeUrl(body.post_url);
    if (!url) { res.status(400).json({ error: "post_url must be a valid http(s) link" }); return; }
    updates.post_url = url;
  }
  if ("post_name" in body) updates.post_name = sanitizeText(body.post_name);
  if ("posted_on" in body) updates.posted_on = sanitizeDate(body.posted_on);
  if ("boost_amount" in body) updates.boost_amount = sanitizeAmount(body.boost_amount);
  if ("boost_duration" in body) updates.boost_duration = sanitizeText(body.boost_duration);
  const resolvedAudience = "target_audience" in body ? sanitizeText(body.target_audience) : existing.target_audience;
  if ("target_audience" in body) updates.target_audience = resolvedAudience;
  if (typeof body.done === "boolean") updates.done = body.done;
  if ("spend_month" in body) {
    if (body.spend_month != null && !/^\d{4}-\d{2}$/.test(body.spend_month)) {
      res.status(400).json({ error: "spend_month must be YYYY-MM" }); return;
    }
    updates.spend_month = body.spend_month;
  }
  if ("page" in body && body.page != null && !REPORTING_PAGES.includes(body.page as typeof REPORTING_PAGES[number])) {
    res.status(400).json({ error: "Invalid reporting page" }); return;
  }
  if ("page" in body || "brand_id" in body || "target_audience" in body) {
    const resolvedPage = pageForBrand(targetAccess.slug, resolvedAudience);
    if (body.page != null && body.page !== resolvedPage) {
      res.status(400).json({ error: "The reporting page does not match the selected brand" }); return;
    }
    updates.page = resolvedPage;
  }
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
    const [owned] = await db
      .select({ source: adBoostsTable.source, role: userBrandAccessTable.role })
      .from(adBoostsTable)
      .innerJoin(userBrandAccessTable, eq(userBrandAccessTable.brand_id, adBoostsTable.brand_id))
      .where(and(
        eq(adBoostsTable.id, id),
        eq(userBrandAccessTable.user_id, req.user!.id),
      ));
    if (!owned) { res.status(404).json({ error: "Not found" }); return; }
    if (ROLE_RANK[owned.role] < ROLE_RANK.editor) { res.status(403).json({ error: "Forbidden" }); return; }
    if (owned.source === "calendar") {
      res.status(400).json({ error: "Calendar-linked boosts must be removed from the content calendar" });
      return;
    }
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
