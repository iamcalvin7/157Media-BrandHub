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
import { openai } from "@workspace/integrations-openai-ai-server";

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

// All publish times are stored as UTC (Facebook exports in UTC).
// Display and bucketing must use Malta local time (Europe/Malta handles CET/CEST automatically).
function maltaDayName(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Malta", weekday: "long" }).format(d);
}
function maltaHour(d: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Malta", hour: "numeric", hour12: false,
  }).formatToParts(d);
  const h = parts.find((p) => p.type === "hour")?.value;
  const n = Number(h);
  return isNaN(n) ? 0 : n % 24; // "24" → 0 (midnight edge case in some locales)
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

  // Best day and hour — bucketed in Malta local time (Europe/Malta, auto-DST).
  // Require ≥2 posts in a slot before it can rank; fall back to all slots if none qualify.
  const dayViews: Record<string, number[]> = {};
  const hourViews: Record<number, number[]> = {};
  for (const p of posts) {
    if (!p.publish_time || p.views === null) continue;
    const day = maltaDayName(p.publish_time);
    const hour = maltaHour(p.publish_time);
    dayViews[day] = [...(dayViews[day] ?? []), p.views];
    hourViews[hour] = [...(hourViews[hour] ?? []), p.views];
  }
  const avgByKey = (map: Record<string | number, number[]>, minPosts = 1) =>
    Object.entries(map)
      .filter(([, vals]) => vals.length >= minPosts)
      .map(([k, vals]) => ({ k, avg: vals.reduce((a, b) => a + b, 0) / vals.length }));

  const rankDays = avgByKey(dayViews, 2).sort((a, b) => b.avg - a.avg);
  const bestDayEntry = (rankDays.length > 0 ? rankDays : avgByKey(dayViews).sort((a, b) => b.avg - a.avg))[0];
  const rankHours = avgByKey(hourViews, 2).sort((a, b) => b.avg - a.avg);
  const bestHourEntry = (rankHours.length > 0 ? rankHours : avgByKey(hourViews).sort((a, b) => b.avg - a.avg))[0];

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

// ─── POST /api/reports/:id/analyze ───────────────────────────────────────────
router.post("/reports/:id/analyze", requireBrandAccess("viewer"), async (req: Request, res: Response): Promise<void> => {
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
    if (!summary) { res.status(400).json({ error: "No summary data available to analyse" }); return; }

    const posts = await db
      .select()
      .from(performanceReportPostsTable)
      .where(eq(performanceReportPostsTable.report_id, id));

    // Optional context from request body
    const {
      monthly_context = "",
      business_focus = "",
      manager_notes = "",
    } = (req.body ?? {}) as { monthly_context?: string; business_focus?: string; manager_notes?: string };

    // ── Previous month lookup ────────────────────────────────────────────────
    const [y, m] = report.month.split("-").map(Number);
    const prevDate = new Date(Date.UTC(y, m - 2, 1));
    const prevMonth = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const [prevReport] = await db
      .select({ id: performanceReportsTable.id })
      .from(performanceReportsTable)
      .where(and(
        eq(performanceReportsTable.brand_id, req.brandId),
        eq(performanceReportsTable.platform, report.platform),
        eq(performanceReportsTable.month, prevMonth),
      ));
    let prevSummary: typeof summary | null = null;
    if (prevReport) {
      const [ps] = await db.select().from(performanceReportSummariesTable).where(eq(performanceReportSummariesTable.report_id, prevReport.id));
      prevSummary = ps ?? null;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────
    const n = (v: number | null | undefined) => v?.toLocaleString() ?? "N/A";
    const r = (v: string | number | null | undefined) => v != null ? parseFloat(String(v)).toFixed(2) + "%" : "N/A";
    const pct = (cur: number | null | undefined, prev: number | null | undefined) => {
      if (cur == null || prev == null || prev === 0) return "N/A";
      const d = ((cur - prev) / prev) * 100;
      return (d >= 0 ? "+" : "") + d.toFixed(1) + "%";
    };
    const postEngRate = (p: typeof posts[0]) => {
      const eng = (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0) + (p.saves ?? 0);
      if (!p.reach || p.reach === 0) return "N/A";
      return (eng / p.reach * 100).toFixed(2) + "%";
    };
    const dayName = (ts: string | Date | null) => {
      if (!ts) return "N/A";
      return maltaDayName(new Date(ts));
    };
    const hourStr = (ts: string | Date | null) => {
      if (!ts) return "N/A";
      return String(maltaHour(new Date(ts)));
    };

    // ── Post type breakdown ──────────────────────────────────────────────────
    const typeMap = new Map<string, { count: number; views: number; reach: number; engSum: number; engCount: number; linkClicks: number }>();
    for (const p of posts) {
      const t = p.post_type ?? "Unknown";
      const existing = typeMap.get(t) ?? { count: 0, views: 0, reach: 0, engSum: 0, engCount: 0, linkClicks: 0 };
      const eng = (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0) + (p.saves ?? 0);
      const reach = p.reach ?? 0;
      typeMap.set(t, {
        count: existing.count + 1,
        views: existing.views + (p.views ?? 0),
        reach: existing.reach + reach,
        engSum: existing.engSum + (reach > 0 ? eng / reach * 100 : 0),
        engCount: existing.engCount + (reach > 0 ? 1 : 0),
        linkClicks: existing.linkClicks + (p.link_clicks ?? 0),
      });
    }
    const typeBreakdown = [...typeMap.entries()]
      .sort((a, b) => b[1].views - a[1].views)
      .map(([type, d]) => {
        const avgEng = d.engCount > 0 ? (d.engSum / d.engCount).toFixed(2) + "%" : "N/A";
        return `* ${type}: ${d.count} posts, ${n(d.views)} views, ${n(d.reach)} reach, ${avgEng} engagement rate, ${n(d.linkClicks)} link clicks`;
      })
      .join("\n") || "* No post type data available";

    // ── Top / bottom posts ───────────────────────────────────────────────────
    const topIds: number[] = (summary.top_post_ids as number[]) ?? [];
    const bottomIds: number[] = (summary.bottom_post_ids as number[]) ?? [];
    const formatPost = (pid: number, i: number) => {
      const p = posts.find((pp) => pp.id === pid);
      if (!p) return null;
      const type = p.post_type ?? "Unknown";
      const caption = p.caption ?? "(no caption)";
      return `${i + 1}. ${type} — ${caption} — ${n(p.views)} views — ${n(p.reach)} reach — ${postEngRate(p)} engagement rate — ${n(p.link_clicks)} link clicks — Published ${dayName(p.publish_time)} at ${hourStr(p.publish_time)}:00`;
    };
    const topPostLines = topIds.slice(0, 3).map(formatPost).filter(Boolean).join("\n") || "No data";
    const bottomPostLines = bottomIds.slice(0, 3).map(formatPost).filter(Boolean).join("\n") || "No data";

    // ── MoM section ──────────────────────────────────────────────────────────
    const momSection = prevSummary ? `
Previous month comparison

* Previous month: ${prevMonth}
* Previous posts published: ${n(prevSummary.total_posts)}
* Previous total views: ${n(prevSummary.total_views)}
* Views change: ${pct(summary.total_views, prevSummary.total_views)}
* Previous total reach: ${n(prevSummary.total_reach)}
* Reach change: ${pct(summary.total_reach, prevSummary.total_reach)}
* Previous engagement rate: ${r(prevSummary.engagement_rate)}
* Engagement rate change: ${pct(summary.engagement_rate != null ? parseFloat(String(summary.engagement_rate)) : null, prevSummary.engagement_rate != null ? parseFloat(String(prevSummary.engagement_rate)) : null)}
* Previous likes/reactions: ${n(prevSummary.total_likes)}
* Likes/reactions change: ${pct(summary.total_likes, prevSummary.total_likes)}
* Previous comments: ${n(prevSummary.total_comments)}
* Comments change: ${pct(summary.total_comments, prevSummary.total_comments)}
* Previous shares: ${n(prevSummary.total_shares)}
* Shares change: ${pct(summary.total_shares, prevSummary.total_shares)}
* Previous link clicks: ${n(prevSummary.total_link_clicks)}
* Link clicks change: ${pct(summary.total_link_clicks, prevSummary.total_link_clicks)}` : "\nNo previous month data available for comparison.";

    // ── Optional context section ─────────────────────────────────────────────
    const optionalContext = [
      monthly_context ? `* Campaigns or seasonal context this month: ${monthly_context}` : "",
      business_focus ? `* Key business focus this month: ${business_focus}` : "",
      manager_notes ? `* Notes from social media manager: ${manager_notes}` : "",
    ].filter(Boolean).join("\n") || "* No additional context provided.";

    const systemMessage = `You are a social media performance analyst for Virtu Ferries, a high-speed ferry service between Malta and Sicily with a 1h45m crossing.

Your audience is the internal social media team. The analysis will be read by the social media manager and used to brief content planning for the following month.

Write with the confidence, clarity, and warmth of Virtu Ferries: Mediterranean, approachable, practical, and direct. This is internal performance analysis, not public-facing marketing copy. Do not sound promotional. Avoid exaggerated claims, vague social media jargon, and generic phrases such as "great content performed well" or "continue engaging the audience."

Your job is to explain what happened, why it likely happened, and what the team should do next.

Use the data provided. Do not invent figures, campaign context, destinations, offers, or explanations that are not supported by the data. If a conclusion is uncertain, phrase it as a likely interpretation.

Focus on meaningful changes and patterns. Do not list every metric mechanically. Prioritise insights that help the team decide what to post next month.

Output requirements:
* Write in flowing prose, not bullet points.
* Use 4 short paragraphs.
* Target 350–450 words.
* Paragraph 1: Overall performance summary, including meaningful month-over-month changes.
* Paragraph 2: What worked well, including content themes, post types, timing, and likely reasons.
* Paragraph 3: What underperformed, including weaker content themes, post types, timing, and likely reasons.
* Paragraph 4: Clear recommendations for next month, with 2–3 specific actions.
* Be direct, specific, and useful for content planning.`;

    const userMessage = `Analyse the following ${report.platform} performance data for ${report.month}.

Current month summary

* Platform: ${report.platform}
* Month: ${report.month}
* Posts published: ${n(summary.total_posts)}
* Total views: ${n(summary.total_views)}
* Total reach: ${n(summary.total_reach)}
* Engagement rate: ${r(summary.engagement_rate)}
* Likes/Reactions: ${n(summary.total_likes)}
* Comments: ${n(summary.total_comments)}
* Shares: ${n(summary.total_shares)}
* Saves: ${n(summary.total_saves)}
* Link clicks: ${n(summary.total_link_clicks)}
* Best day to post: ${summary.best_day_of_week ?? "N/A"}
* Best time to post: ${summary.best_hour_of_day != null ? `${summary.best_hour_of_day}:00` : "N/A"}
${momSection}

Post type performance

${typeBreakdown}

Top performing posts by views

${topPostLines}

Lowest performing posts by views

${bottomPostLines}

Optional context

${optionalContext}

Write the analysis now.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 900,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
    });

    const analysis = response.choices[0]?.message?.content?.trim() ?? "";

    await db
      .update(performanceReportSummariesTable)
      .set({ ai_analysis: analysis, ai_analysis_generated_at: new Date() })
      .where(eq(performanceReportSummariesTable.report_id, id));

    res.json({ analysis, generated_at: new Date().toISOString() });
  } catch (err) {
    console.error("reports/analyze error:", err);
    res.status(500).json({ error: "Failed to generate analysis" });
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
