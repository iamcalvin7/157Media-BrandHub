/**
 * allowedEmails.ts — Platform-wide allowed-email management.
 *
 * Endpoints:
 *   GET    /api/admin/allowed-emails          — list all entries
 *   POST   /api/admin/allowed-emails          — add an email
 *   DELETE /api/admin/allowed-emails/:email   — remove an email
 *
 * All routes require brand-level admin.
 */

import { Router, type IRouter } from "express";
import { requireBrandAccess } from "../middlewares/requireBrandAccess.js";
import { db, allowedEmailsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.get(
  "/admin/allowed-emails",
  requireBrandAccess("admin"),
  async (req, res): Promise<void> => {
    try {
      const rows = await db
        .select()
        .from(allowedEmailsTable)
        .orderBy(allowedEmailsTable.addedAt);
      res.json(rows);
    } catch (err) {
      logger.error({ err }, "allowedEmails: failed to list");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.post(
  "/admin/allowed-emails",
  requireBrandAccess("admin"),
  async (req, res): Promise<void> => {
    const { email, note } = req.body as { email?: string; note?: string };
    const trimmed = email?.trim().toLowerCase() ?? "";
    if (!trimmed || !trimmed.includes("@")) {
      res.status(400).json({ error: "A valid email address is required" });
      return;
    }
    try {
      const [row] = await db
        .insert(allowedEmailsTable)
        .values({
          email: trimmed,
          addedBy: req.user!.id,
          note: note?.trim() || null,
        })
        .onConflictDoNothing()
        .returning();
      res.status(row ? 201 : 200).json(row ?? { email: trimmed });
    } catch (err) {
      logger.error({ err }, "allowedEmails: failed to add");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.delete(
  "/admin/allowed-emails/:email",
  requireBrandAccess("admin"),
  async (req, res): Promise<void> => {
    const email = decodeURIComponent(req.params.email as string).toLowerCase();
    try {
      await db
        .delete(allowedEmailsTable)
        .where(eq(allowedEmailsTable.email, email));
      res.sendStatus(204);
    } catch (err) {
      logger.error({ err }, "allowedEmails: failed to remove");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
