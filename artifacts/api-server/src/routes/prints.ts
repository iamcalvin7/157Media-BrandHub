import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, brandPrintsTable } from "@workspace/db";

const router: IRouter = Router();

const ALLOWED_KINDS = new Set(["image", "pdf"]);

function cleanString(v: unknown, maxLen = 2000): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, maxLen);
}

function detectKind(media_url: string): "image" | "pdf" {
  if (/\.pdf(\?|$)/i.test(media_url)) return "pdf";
  return "image";
}

function safeExternalUrl(v: string | null): string | null {
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol === "http:" || u.protocol === "https:") return u.toString();
  } catch {
    /* not a parseable URL */
  }
  return null;
}

function safeMediaUrl(v: string | null): string | null {
  if (!v) return null;
  if (v.startsWith("/objects/") || v.startsWith("/api/storage/")) return v;
  return safeExternalUrl(v);
}

// Accept YYYY-MM-DD only — both <input type="date"> and the DB date column use
// this. Validates that the parts form a real calendar date (rejects 2026-99-99).
function cleanDate(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  const [, ys, ms, ds] = m;
  const y = Number(ys);
  const mo = Number(ms);
  const d = Number(ds);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) {
    return null;
  }
  return t;
}

router.get("/prints", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(brandPrintsTable)
    .where(eq(brandPrintsTable.brand_id, req.brandId))
    .orderBy(desc(brandPrintsTable.print_date), desc(brandPrintsTable.created_at));
  res.json(rows);
});

router.post("/prints", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const title = cleanString(body.title, 200);
  const media_url = safeMediaUrl(cleanString(body.media_url, 1000));
  if (!title || !media_url) {
    res.status(400).json({ error: "title and a valid media_url are required" });
    return;
  }
  const description = cleanString(body.description, 2000);
  const rawDrive = cleanString(body.drive_url, 1000);
  if (rawDrive && !safeExternalUrl(rawDrive)) {
    res.status(400).json({ error: "drive_url must be a http(s) URL" });
    return;
  }
  const drive_url = safeExternalUrl(rawDrive);
  let print_date: string | null = null;
  if (body.print_date != null && body.print_date !== "") {
    print_date = cleanDate(body.print_date);
    if (!print_date) {
      res.status(400).json({ error: "print_date must be a valid YYYY-MM-DD date" });
      return;
    }
  }
  let media_kind = typeof body.media_kind === "string" ? body.media_kind : detectKind(media_url);
  if (!ALLOWED_KINDS.has(media_kind)) media_kind = detectKind(media_url);

  const [created] = await db
    .insert(brandPrintsTable)
    .values({ brand_id: req.brandId, title, description, media_url, media_kind, drive_url, print_date })
    .returning();
  res.status(201).json(created);
});

router.patch("/prints/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if ("title" in body) {
    const v = cleanString(body.title, 200);
    if (!v) {
      res.status(400).json({ error: "title cannot be empty" });
      return;
    }
    patch.title = v;
  }
  if ("description" in body) patch.description = cleanString(body.description, 2000);
  if ("drive_url" in body) {
    const raw = cleanString(body.drive_url, 1000);
    if (raw && !safeExternalUrl(raw)) {
      res.status(400).json({ error: "drive_url must be a http(s) URL" });
      return;
    }
    patch.drive_url = safeExternalUrl(raw);
  }
  if ("print_date" in body) {
    if (body.print_date == null || body.print_date === "") {
      patch.print_date = null;
    } else {
      const d = cleanDate(body.print_date);
      if (!d) {
        res.status(400).json({ error: "print_date must be a valid YYYY-MM-DD date" });
        return;
      }
      patch.print_date = d;
    }
  }
  if ("media_url" in body) {
    const v = safeMediaUrl(cleanString(body.media_url, 1000));
    if (!v) {
      res.status(400).json({ error: "media_url must be a valid object path or http(s) URL" });
      return;
    }
    patch.media_url = v;
    patch.media_kind = detectKind(v);
  }

  const [updated] = await db
    .update(brandPrintsTable)
    .set(patch)
    .where(and(eq(brandPrintsTable.id, id), eq(brandPrintsTable.brand_id, req.brandId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

router.delete("/prints/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .delete(brandPrintsTable)
    .where(and(eq(brandPrintsTable.id, id), eq(brandPrintsTable.brand_id, req.brandId)));
  res.status(204).end();
});

export default router;
