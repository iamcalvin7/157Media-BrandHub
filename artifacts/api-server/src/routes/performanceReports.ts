import { Router, type IRouter, type Request, type Response } from "express";
import { parse } from "csv-parse/sync";
import { requireBrandAccess } from "../middlewares/requireBrandAccess.js";
import {
  db,
  performanceReportsTable,
  performanceReportPostsTable,
  performanceReportSummariesTable,
  contentPostsTable,
} from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

const router: IRouter = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(v: string | undefined): number | null {
  if (v === undefined || v === null || v.trim() === "") return null;
  const n = Number(v.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

function parsePublishTime(raw: string | undefined): Date | null {
  if (!raw) return null;
  // Format from Meta exports: "MM/DD/YYYY HH:MM" (24h)
  const match = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, mm, dd, yyyy, hh, min] = match;
  const d = new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

function dayName(d: Date): string {
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d.getUTCDay()];
}

// Determine month string (YYYY-MM) from array of publish_time values
function inferMonth(dates: (Date | null)[]): string {
  const valid = dates.filter((d): d is Date => !!d);
  if (valid.length === 0) return "";
  // Use the most common month
  const counts: Record<string, number> = {};
  for (const d of valid) {
    const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

interface ParsedPost {
  post_id_external: string | null;
  permalink: string | null;
  publish_time: Date | null;
  post_type: string | null;
  caption: string | null;
  duration_sec: number | null;
  account_username: string | null;
  is_partner: boolean;
  is_crosspost: boolean;
  is_share: boolean;
  views: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  follows: number | null;
  link_clicks: number | null;
  total_clicks: number | null;
  raw_data: Record<string, string>;
}

function parseInstagramCsv(rows: Record<string, string>[], primaryAccountId: string): ParsedPost[] {
  return rows.map((r) => {
    const accountId = r["Account ID"]?.trim() ?? "";
    const isPartner = primaryAccountId !== "" && accountId !== "" && accountId !== primaryAccountId;
    return {
      post_id_external: r["Post ID"]?.trim() || null,
      permalink: r["Permalink"]?.trim() || null,
      publish_time: parsePublishTime(r["Publish time"]),
      post_type: r["Post type"]?.trim() || null,
      caption: r["Description"]?.trim() || null,
      duration_sec: parseNum(r["Duration (sec)"]),
      account_username: r["Account username"]?.trim() || null,
      is_partner: isPartner,
      is_crosspost: false,
      is_share: false,
      views: parseNum(r["Views"]),
      reach: parseNum(r["Reach"]),
      likes: parseNum(r["Likes"]),
      comments: parseNum(r["Comments"]),
      shares: parseNum(r["Shares"]),
      saves: parseNum(r["Saves"]),
      follows: parseNum(r["Follows"]),
      link_clicks: null,
      total_clicks: null,
      raw_data: r,
    };
  });
}

function parseFacebookCsv(rows: Record<string, string>[]): ParsedPost[] {
  return rows.map((r) => ({
    post_id_external: r["Post ID"]?.trim() || null,
    permalink: r["Permalink"]?.trim() || null,
    publish_time: parsePublishTime(r["Publish time"]),
    post_type: r["Post type"]?.trim() || null,
    caption: (r["Description"] || r["Title"] || "").trim() || null,
    duration_sec: parseNum(r["Duration (sec)"]),
    account_username: r["Page name"]?.trim() || null,
    is_partner: false,
    is_crosspost: r["Is crosspost"]?.trim() === "1",
    is_share: r["Is share"]?.trim() === "1",
    views: parseNum(r["Views"]),
    reach: parseNum(r["Reach"]),
    likes: parseNum(r["Reactions"]),
    comments: parseNum(r["Comments"]),
    shares: parseNum(r["Shares"]),
    saves: null,
    follows: null,
    link_clicks: parseNum(r["Link clicks"]),
    total_clicks: parseNum(r["Total clicks"]),
    raw_data: r,
  }));
}

function computeSummary(posts: ParsedPost[], insertedIds: number[]): {
  total_posts: number;
  total_views: number | null;
  total_reach: number | null;
  total_likes: number | null;
  total_comments: number | null;
  total_shares: number | null;
  total_saves: number | null;
  total_link_clicks: number | null;
  engagement_rate: string | null;
  top_post_ids: number[];
  bottom_post_ids: number[];
  best_day_of_week: string | null;
  best_hour_of_day: number | null;
} {
  const sum = (arr: (number | null)[]): number | null => {
    const vals = arr.filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  };

  const total_views = sum(posts.map((p) => p.views));
  const total_reach = sum(posts.map((p) => p.reach));
  const total_likes = sum(posts.map((p) => p.likes));
  const total_comments = sum(posts.map((p) => p.comments));
  const total_shares = sum(posts.map((p) => p.shares));
  const total_saves = sum(posts.map((p) => p.saves));
  const total_link_clicks = sum(posts.map((p) => p.link_clicks));

  // Engagement rate: (likes + comments + shares + saves) / reach * 100
  // Only calculate if reach > 0
  let engagement_rate: string | null = null;
  if (total_reach && total_reach > 0) {
    const eng = (total_likes ?? 0) + (total_comments ?? 0) + (total_shares ?? 0) + (total_saves ?? 0);
    engagement_rate = ((eng / total_reach) * 100).toFixed(4);
  }

  // Top/bottom by views — pair with insertedIds by index
  const withIds = posts.map((p, i) => ({ views: p.views ?? 0, id: insertedIds[i] }));
  const sorted = [...withIds].sort((a, b) => b.views - a.views);
  const nonZero = sorted.filter((p) => p.views > 0);
  const top_post_ids = nonZero.slice(0, 5).map((p) => p.id);
  const bottom_post_ids = nonZero.slice(-5).reverse().map((p) => p.id);

  // Best day and hour
  const dayViews: Record<string, number[]> = {};
  const hourViews: Record<number, number[]> = {};
  for (const p of posts) {
    if (!p.publish_time || p.views === null) continue;
    const day = dayName(p.publish_time);
    const hour = p.publish_time.getUTCHours();
    dayViews[day] = [...(dayViews[day] ?? []), p.views];
    hourViews[hour] = [...(hourViews[hour] ?? []), p.views];
  }
  const avgByKey = (map: Record<string | number, number[]>) =>
    Object.entries(map).map(([k, vals]) => ({ k, avg: vals.reduce((a, b) => a + b, 0) / vals.length }));

  const bestDayEntry = avgByKey(dayViews).sort((a, b) => b.avg - a.avg)[0];
  const bestHourEntry = avgByKey(hourViews).sort((a, b) => b.avg - a.avg)[0];

  return {
    total_posts: posts.length,
    total_views,
    total_reach,
    total_likes,
    total_comments,
    total_shares,
    total_saves,
    total_link_clicks,
    engagement_rate,
    top_post_ids,
    bottom_post_ids,
    best_day_of_week: bestDayEntry?.k ?? null,
    best_hour_of_day: bestHourEntry ? Number(bestHourEntry.k) : null,
  };
}

// ─── POST /api/reports/upload ─────────────────────────────────────────────────
// Body: multipart NOT used — client sends raw CSV text in JSON body.
// { platform: "Facebook"|"Instagram", csv: "<raw csv string>", filename?: string }
router.post("/reports/upload", requireBrandAccess("editor"), async (req: Request, res: Response): Promise<void> => {
  try {
    const { platform, csv, filename } = req.body as {
      platform?: string;
      csv?: string;
      filename?: string;
    };

    if (!platform || (platform !== "Facebook" && platform !== "Instagram")) {
      res.status(400).json({ error: "platform must be 'Facebook' or 'Instagram'" });
      return;
    }
    if (!csv || typeof csv !== "string" || csv.trim().length === 0) {
      res.status(400).json({ error: "csv is required" });
      return;
    }

    // Strip BOM if present
    const csvClean = csv.replace(/^\uFEFF/, "");

    let rows: Record<string, string>[];
    try {
      rows = parse(csvClean, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      }) as Record<string, string>[];
    } catch (e) {
      res.status(400).json({ error: "Failed to parse CSV. Please check the file format." });
      return;
    }

    if (rows.length === 0) {
      res.status(400).json({ error: "CSV contains no data rows." });
      return;
    }

    // Determine primary account ID for IG partner detection
    let primaryAccountId = "";
    if (platform === "Instagram") {
      // Find the most common Account ID — that's the VF account
      const idCounts: Record<string, number> = {};
      for (const r of rows) {
        const id = r["Account ID"]?.trim() ?? "";
        if (id) idCounts[id] = (idCounts[id] ?? 0) + 1;
      }
      primaryAccountId = Object.entries(idCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    }

    const parsedPosts: ParsedPost[] =
      platform === "Instagram"
        ? parseInstagramCsv(rows, primaryAccountId)
        : parseFacebookCsv(rows);

    const publishTimes = parsedPosts.map((p) => p.publish_time);
    const month = inferMonth(publishTimes);
    if (!month) {
      res.status(400).json({ error: "Could not determine month from CSV publish times. Check the Publish time column." });
      return;
    }

    const label = `${new Date(month + "-01").toLocaleString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })} — ${platform}`;

    await db.transaction(async (tx) => {
      // Delete existing report for this brand+platform+month (replace semantics)
      const existing = await tx
        .select({ id: performanceReportsTable.id })
        .from(performanceReportsTable)
        .where(
          and(
            eq(performanceReportsTable.brand_id, req.brandId),
            eq(performanceReportsTable.platform, platform),
            eq(performanceReportsTable.month, month),
          ),
        );
      if (existing.length > 0) {
        await tx
          .delete(performanceReportsTable)
          .where(eq(performanceReportsTable.id, existing[0].id));
      }

      // Insert report header
      const [report] = await tx
        .insert(performanceReportsTable)
        .values({
          brand_id: req.brandId,
          platform,
          month,
          label,
          uploaded_by: req.user?.id ?? null,
          source_file_name: filename ?? null,
          post_count: parsedPosts.length,
          status: "ready",
        })
        .returning();

      // Build post rows
      const postValues = parsedPosts.map((p) => ({
        report_id: report.id,
        brand_id: req.brandId,
        platform,
        post_id_external: p.post_id_external,
        permalink: p.permalink,
        publish_time: p.publish_time,
        post_type: p.post_type,
        caption: p.caption,
        duration_sec: p.duration_sec,
        account_username: p.account_username,
        is_partner: p.is_partner,
        is_crosspost: p.is_crosspost,
        is_share: p.is_share,
        views: p.views,
        reach: p.reach,
        likes: p.likes,
        comments: p.comments,
        shares: p.shares,
        saves: p.saves,
        follows: p.follows,
        link_clicks: p.link_clicks,
        total_clicks: p.total_clicks,
        raw_data: p.raw_data,
        content_post_id: null as number | null,
      }));

      const insertedPosts = await tx
        .insert(performanceReportPostsTable)
        .values(postValues)
        .returning({ id: performanceReportPostsTable.id });

      // Auto-link to content_posts by permalink
      const permalinks = parsedPosts
        .map((p, i) => ({ permalink: p.permalink, idx: i }))
        .filter((x) => x.permalink);

      if (permalinks.length > 0) {
        const calendarPosts = await tx
          .select({ id: contentPostsTable.id, posted_url: contentPostsTable.posted_url, posted_url_ig: contentPostsTable.posted_url_ig })
          .from(contentPostsTable)
          .where(eq(contentPostsTable.brand_id, req.brandId));

        for (const { permalink, idx } of permalinks) {
          const match = calendarPosts.find(
            (cp) => cp.posted_url === permalink || cp.posted_url_ig === permalink,
          );
          if (match) {
            await tx
              .update(performanceReportPostsTable)
              .set({ content_post_id: match.id })
              .where(eq(performanceReportPostsTable.id, insertedPosts[idx].id));
          }
        }
      }

      // Compute and insert summary
      const insertedIds = insertedPosts.map((p) => p.id);
      const summary = computeSummary(parsedPosts, insertedIds);
      await tx.insert(performanceReportSummariesTable).values({
        report_id: report.id,
        ...summary,
      });

      res.status(201).json({ reportId: report.id, month, platform, postCount: parsedPosts.length });
    });
  } catch (err) {
    console.error("reports/upload error:", err);
    res.status(500).json({ error: "Failed to upload report" });
  }
});

// ─── GET /api/reports ─────────────────────────────────────────────────────────
router.get("/reports", requireBrandAccess("viewer"), async (req: Request, res: Response): Promise<void> => {
  try {
    const reports = await db
      .select()
      .from(performanceReportsTable)
      .where(eq(performanceReportsTable.brand_id, req.brandId))
      .orderBy(performanceReportsTable.month);
    res.json(reports);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// ─── GET /api/reports/:id ─────────────────────────────────────────────────────
router.get("/reports/:id", requireBrandAccess("viewer"), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [report] = await db
      .select()
      .from(performanceReportsTable)
      .where(and(eq(performanceReportsTable.id, id), eq(performanceReportsTable.brand_id, req.brandId)));
    if (!report) { res.status(404).json({ error: "Report not found" }); return; }

    const [summary] = await db
      .select()
      .from(performanceReportSummariesTable)
      .where(eq(performanceReportSummariesTable.report_id, id));

    const posts = await db
      .select()
      .from(performanceReportPostsTable)
      .where(eq(performanceReportPostsTable.report_id, id));

    // Hydrate top/bottom posts by ID for quick access
    const topIds: number[] = (summary?.top_post_ids as number[]) ?? [];
    const bottomIds: number[] = (summary?.bottom_post_ids as number[]) ?? [];
    const highlightIds = [...new Set([...topIds, ...bottomIds])];

    let highlightPosts: typeof posts = [];
    if (highlightIds.length > 0) {
      highlightPosts = posts.filter((p) => highlightIds.includes(p.id));
    }

    const topPosts = topIds.map((id) => highlightPosts.find((p) => p.id === id)).filter(Boolean);
    const bottomPosts = bottomIds.map((id) => highlightPosts.find((p) => p.id === id)).filter(Boolean);

    // ── Previous month lookup for MoM comparison ──────────────────────────────
    // Compute previous YYYY-MM string
    const [y, m] = report.month.split("-").map(Number);
    const prevDate = new Date(Date.UTC(y, m - 2, 1)); // m-2 because months are 0-indexed
    const prevMonth = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}`;

    const [prevReport] = await db
      .select({ id: performanceReportsTable.id, month: performanceReportsTable.month, post_count: performanceReportsTable.post_count })
      .from(performanceReportsTable)
      .where(
        and(
          eq(performanceReportsTable.brand_id, req.brandId),
          eq(performanceReportsTable.platform, report.platform),
          eq(performanceReportsTable.month, prevMonth),
        ),
      );

    let prevSummary = null;
    if (prevReport) {
      const [s] = await db
        .select()
        .from(performanceReportSummariesTable)
        .where(eq(performanceReportSummariesTable.report_id, prevReport.id));
      prevSummary = s ?? null;
    }

    res.json({ report, summary: summary ?? null, posts, topPosts, bottomPosts, prevSummary, prevMonth });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch report" });
  }
});

// ─── DELETE /api/reports/:id ──────────────────────────────────────────────────
router.delete("/reports/:id", requireBrandAccess("editor"), async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const deleted = await db
      .delete(performanceReportsTable)
      .where(and(eq(performanceReportsTable.id, id), eq(performanceReportsTable.brand_id, req.brandId)))
      .returning({ id: performanceReportsTable.id });
    if (deleted.length === 0) { res.status(404).json({ error: "Report not found" }); return; }
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete report" });
  }
});

export default router;
