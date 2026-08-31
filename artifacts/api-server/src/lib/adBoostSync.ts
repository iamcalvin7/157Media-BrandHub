import {
  adBoostsTable,
  brandsTable,
  contentPostsTable,
  db,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";

export type BoostReportingPage = "GHS" | "VF-EN" | "VF-IT";

export class BoostSyncValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BoostSyncValidationError";
  }
}

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function isHttpUrl(value: string | null | undefined): value is string {
  if (!value?.trim()) return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function reportingPage(brandSlug: string, market: string): BoostReportingPage {
  if (brandSlug === "gozo-highspeed") return "GHS";
  return market.toLowerCase().includes("italian") ? "VF-IT" : "VF-EN";
}

function pageAudience(page: BoostReportingPage): string | null {
  if (page === "VF-IT") return "IT";
  if (page === "VF-EN") return "EN";
  return null;
}

type BoostablePost = Pick<
  typeof contentPostsTable.$inferSelect,
  | "platform"
  | "posted_url"
  | "posted_url_ig"
  | "posted_links"
  | "boost_daily_budget"
  | "boost_start_date"
  | "boost_end_date"
>;

function preferredLiveUrl(post: BoostablePost): string | null {
  const platform = post.platform.toLowerCase();
  const candidates = platform.includes("instagram")
    ? [post.posted_url_ig, post.posted_url, ...(post.posted_links ?? [])]
    : [post.posted_url, post.posted_url_ig, ...(post.posted_links ?? [])];
  return candidates.find(isHttpUrl)?.trim() ?? null;
}

function monthAllocations(startDate: string, endDate: string, dailyBudget: number) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) {
    throw new BoostSyncValidationError("The boost end date cannot be before the start date.");
  }

  const daysByMonth = new Map<string, number>();
  const cursor = new Date(start);
  let totalDays = 0;
  while (cursor <= end) {
    const month = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
    daysByMonth.set(month, (daysByMonth.get(month) ?? 0) + 1);
    totalDays += 1;
    if (totalDays > 3660) {
      throw new BoostSyncValidationError("The boost period cannot be longer than 10 years.");
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return [...daysByMonth.entries()].map(([month, days]) => ({
    month,
    days,
    amount: Number((dailyBudget * days).toFixed(2)),
  }));
}

export function validateBoostedPostDetails(post: BoostablePost) {
  const budget = Number(post.boost_daily_budget);
  if (!Number.isFinite(budget) || budget <= 0) {
    throw new BoostSyncValidationError("Enter a daily boost budget greater than €0 before marking Boosted.");
  }
  if (!post.boost_start_date || !post.boost_end_date) {
    throw new BoostSyncValidationError("Choose both a boost start date and end date before marking Boosted.");
  }
  const liveUrl = preferredLiveUrl(post);
  if (!liveUrl) {
    throw new BoostSyncValidationError("Add a valid live post link before marking Boosted.");
  }
  return {
    liveUrl,
    allocations: monthAllocations(post.boost_start_date, post.boost_end_date, budget),
  };
}

/**
 * Rebuild the automatic Ad Tracker allocations for one calendar row.
 * Same-page siblings in a grouped post share boosted state and are deleted
 * together before insert, so repeated saves and multi-channel rows cannot
 * double count spend.
 */
export async function syncBoostAllocationsForPost(
  postId: number,
  brandId: number,
  transaction?: DbTransaction,
) {
  const execute = async (tx: DbTransaction) => {
    const rows = await tx
      .select({ post: contentPostsTable, brandSlug: brandsTable.slug })
      .from(contentPostsTable)
      .innerJoin(brandsTable, eq(brandsTable.id, contentPostsTable.brand_id))
      .where(and(eq(contentPostsTable.id, postId), eq(contentPostsTable.brand_id, brandId)));
    const target = rows[0];
    if (!target) throw new BoostSyncValidationError("Post not found.");

    const targetPage = reportingPage(target.brandSlug, target.post.market);
    const groupRows = target.post.group_id
      ? await tx
        .select({ post: contentPostsTable, brandSlug: brandsTable.slug })
        .from(contentPostsTable)
        .innerJoin(brandsTable, eq(brandsTable.id, contentPostsTable.brand_id))
        .where(and(
          eq(contentPostsTable.brand_id, brandId),
          eq(contentPostsTable.group_id, target.post.group_id),
        ))
      : [target];
    const samePagePosts = groupRows
      .filter((row) => reportingPage(row.brandSlug, row.post.market) === targetPage)
      .map((row) => row.post);
    const samePageIds = samePagePosts.map((post) => post.id);

    let allocations: Array<{ month: string; days: number; amount: number }> = [];
    let liveUrl: string | null = null;
    if (target.post.boosted) {
      const validated = validateBoostedPostDetails(target.post);
      liveUrl = validated.liveUrl;
      allocations = validated.allocations;
    }

    await tx
      .update(contentPostsTable)
      .set({
        boosted: target.post.boosted,
        boost_daily_budget: target.post.boost_daily_budget,
        boost_start_date: target.post.boost_start_date,
        boost_end_date: target.post.boost_end_date,
      })
      .where(inArray(contentPostsTable.id, samePageIds));

    await tx
      .delete(adBoostsTable)
      .where(and(
        eq(adBoostsTable.source, "calendar"),
        inArray(adBoostsTable.content_post_id, samePageIds),
      ));

    if (target.post.boosted && liveUrl) {
      await tx.insert(adBoostsTable).values(
        allocations.map((allocation) => ({
          brand_id: target.post.brand_id,
          content_post_id: target.post.id,
          post_url: liveUrl,
          post_name: target.post.title?.trim() || target.post.pillar,
          posted_on: target.post.scheduled_date ?? target.post.boost_start_date,
          boost_amount: allocation.amount,
          boost_duration: `${allocation.days} ${allocation.days === 1 ? "day" : "days"}`,
          target_audience: pageAudience(targetPage),
          spend_month: allocation.month,
          page: targetPage,
          source: "calendar",
          done: true,
        })),
      );
    }

    return {
      boosted: target.post.boosted,
      page: targetPage,
      months: allocations,
      total: allocations.reduce((sum, allocation) => sum + allocation.amount, 0),
    };
  };

  return transaction ? execute(transaction) : db.transaction(execute);
}