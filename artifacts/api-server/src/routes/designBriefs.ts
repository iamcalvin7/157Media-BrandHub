import { Router, type IRouter } from "express";
import { requireBrandAccess } from "../middlewares/requireBrandAccess.js";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, designBriefSharesTable } from "@workspace/db";

const router: IRouter = Router();

function newToken(): string {
  return randomBytes(16).toString("base64url");
}

router.post("/design-briefs/share", requireBrandAccess('editor'), async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const brandSlug = typeof body.brandSlug === "string" ? body.brandSlug.trim() : "";
  const brandName = typeof body.brandName === "string" ? body.brandName.trim() : null;
  const briefText = typeof body.briefText === "string" ? body.briefText.trim() : "";
  const snapshot = (typeof body.snapshot === "object" && body.snapshot !== null)
    ? (body.snapshot as Record<string, unknown>)
    : {};
  const visualRefs = Array.isArray(body.visualRefs) ? body.visualRefs : [];

  if (!brandSlug || !briefText) {
    res.status(400).json({ error: "brandSlug and briefText are required." });
    return;
  }

  let token = newToken();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await db.insert(designBriefSharesTable).values({
        token,
        brand_slug: brandSlug,
        brand_name: brandName || null,
        brief_text: briefText,
        snapshot,
        visual_refs: visualRefs,
      });
      res.status(201).json({ token });
      return;
    } catch (err: unknown) {
      const pg = err as { code?: string };
      if (pg?.code === "23505") {
        token = newToken();
        continue;
      }
      throw err;
    }
  }
  res.status(500).json({ error: "Failed to create share link. Please try again." });
});

router.get("/design-briefs/share/:token", async (req, res): Promise<void> => {
  const { token } = req.params;
  if (!token) {
    res.status(400).json({ error: "Token required." });
    return;
  }

  const rows = await db
    .select()
    .from(designBriefSharesTable)
    .where(eq(designBriefSharesTable.token, token))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Brief not found or link has expired." });
    return;
  }

  const row = rows[0]!;
  res.json({
    token: row.token,
    brandSlug: row.brand_slug,
    brandName: row.brand_name,
    briefText: row.brief_text,
    snapshot: row.snapshot,
    visualRefs: row.visual_refs,
    createdAt: row.created_at,
  });
});

export default router;
