import { Router, type IRouter } from "express";
import { db, scraperJobsTable, scraperPagesTable } from "@workspace/db";
import { eq, and, desc, asc } from "drizzle-orm";
import { runCrawl, activeJobCount, MAX_CONCURRENT_JOBS_LIMIT } from "../lib/scraper/crawler.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const HARD_MAX_PAGES = 500;
const HARD_MAX_DEPTH = 8;

router.get("/scraper/jobs", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(scraperJobsTable)
      .where(eq(scraperJobsTable.brand_id, req.brandId))
      .orderBy(desc(scraperJobsTable.created_at))
      .limit(50);
    res.json(rows);
  } catch (err) {
    logger.error({ err }, "list scraper jobs failed");
    res.status(500).json({ error: "Failed to list scraper jobs" });
  }
});

router.get("/scraper/jobs/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [job] = await db
      .select()
      .from(scraperJobsTable)
      .where(and(eq(scraperJobsTable.id, id), eq(scraperJobsTable.brand_id, req.brandId)));
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    const pages = await db
      .select()
      .from(scraperPagesTable)
      .where(eq(scraperPagesTable.job_id, id))
      .orderBy(asc(scraperPagesTable.depth), asc(scraperPagesTable.id));
    res.json({ job, pages });
  } catch (err) {
    logger.error({ err }, "get scraper job failed");
    res.status(500).json({ error: "Failed to load job" });
  }
});

router.post("/scraper/jobs", async (req, res): Promise<void> => {
  const rootUrl = String(req.body?.rootUrl ?? "").trim();
  const maxPagesRaw = Number(req.body?.maxPages);
  const maxDepthRaw = Number(req.body?.maxDepth);

  if (!rootUrl) {
    res.status(400).json({ error: "rootUrl is required" });
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(rootUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
  } catch {
    res.status(400).json({ error: "rootUrl must be a valid http(s) URL" });
    return;
  }

  const maxPages = Math.min(
    HARD_MAX_PAGES,
    Math.max(1, Number.isFinite(maxPagesRaw) && maxPagesRaw > 0 ? maxPagesRaw : 200),
  );
  const maxDepth = Math.min(
    HARD_MAX_DEPTH,
    Math.max(0, Number.isFinite(maxDepthRaw) && maxDepthRaw >= 0 ? maxDepthRaw : 5),
  );

  if (activeJobCount() >= MAX_CONCURRENT_JOBS_LIMIT) {
    res.status(429).json({
      error: `Too many crawls already running (max ${MAX_CONCURRENT_JOBS_LIMIT}). Try again once one finishes.`,
    });
    return;
  }

  try {
    const [job] = await db
      .insert(scraperJobsTable)
      .values({
        brand_id: req.brandId,
        root_url: parsed.toString(),
        status: "queued",
        max_pages: maxPages,
        max_depth: maxDepth,
      })
      .returning();

    // Fire and forget — the crawler updates the job row as it progresses.
    // Returning early lets the UI start polling immediately instead of blocking.
    runCrawl({
      jobId: job.id,
      rootUrl: job.root_url,
      maxPages,
      maxDepth,
    }).catch((err) => {
      logger.error({ jobId: job.id, err }, "background crawl crashed");
    });

    res.json(job);
  } catch (err) {
    logger.error({ err }, "create scraper job failed");
    res.status(500).json({ error: "Failed to create scraper job" });
  }
});

router.delete("/scraper/jobs/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const result = await db
      .delete(scraperJobsTable)
      .where(and(eq(scraperJobsTable.id, id), eq(scraperJobsTable.brand_id, req.brandId)))
      .returning({ id: scraperJobsTable.id });
    if (result.length === 0) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "delete scraper job failed");
    res.status(500).json({ error: "Failed to delete scraper job" });
  }
});

export default router;
