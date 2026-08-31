import { afterEach, describe, expect, it } from "vitest";
import {
  adBoostsTable,
  brandsTable,
  contentPostsTable,
  db,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";
import { syncBoostAllocationsForPost } from "./adBoostSync.js";

const createdPostIds: number[] = [];
const createdBoostIds: number[] = [];

async function virtuBrandId() {
  const [brand] = await db
    .select({ id: brandsTable.id })
    .from(brandsTable)
    .where(eq(brandsTable.slug, "virtu-ferries"));
  if (!brand) throw new Error("Virtu Ferries test brand is missing");
  return brand.id;
}

async function createPost(
  brandId: number,
  overrides: Partial<typeof contentPostsTable.$inferInsert> = {},
) {
  const [post] = await db
    .insert(contentPostsTable)
    .values({
      brand_id: brandId,
      market: "Maltese Market",
      platform: "Facebook",
      pillar: "Test",
      title: "Boost sync integration test",
      format: "Post",
      caption: "",
      visual_direction: "",
      month: "2026-08",
      scheduled_date: "2026-08-29",
      status: "posted",
      posted_url: "https://example.com/boost-sync-test",
      boost_daily_budget: "10.00",
      boost_start_date: "2026-08-30",
      boost_end_date: "2026-09-02",
      boosted: false,
      ...overrides,
    })
    .returning();
  createdPostIds.push(post.id);
  return post;
}

async function linkedAllocations(postIds: number[]) {
  return db
    .select()
    .from(adBoostsTable)
    .where(and(
      eq(adBoostsTable.source, "calendar"),
      inArray(adBoostsTable.content_post_id, postIds),
    ));
}

afterEach(async () => {
  if (createdBoostIds.length) {
    await db.delete(adBoostsTable).where(inArray(adBoostsTable.id, createdBoostIds.splice(0)));
  }
  if (createdPostIds.length) {
    await db.delete(contentPostsTable).where(inArray(contentPostsTable.id, createdPostIds.splice(0)));
  }
});

describe("calendar boost synchronization", () => {
  it("splits, replaces, and removes monthly spend without touching manual rows", async () => {
    const brandId = await virtuBrandId();
    const post = await createPost(brandId);
    const [manual] = await db
      .insert(adBoostsTable)
      .values({
        brand_id: brandId,
        post_url: "https://example.com/manual-boost-test",
        post_name: "Manual test row",
        boost_amount: 99,
        source: "manual",
      })
      .returning();
    createdBoostIds.push(manual.id);

    await db.transaction(async (tx) => {
      await tx.update(contentPostsTable).set({ boosted: true }).where(eq(contentPostsTable.id, post.id));
      await syncBoostAllocationsForPost(post.id, brandId, tx);
    });

    let allocations = await linkedAllocations([post.id]);
    expect(allocations.map((row) => [row.spend_month, row.boost_amount]).sort()).toEqual([
      ["2026-08", 20],
      ["2026-09", 20],
    ]);

    await db.transaction(async (tx) => {
      await tx
        .update(contentPostsTable)
        .set({
          boost_daily_budget: "5.00",
          boost_start_date: "2026-09-30",
          boost_end_date: "2026-10-02",
        })
        .where(eq(contentPostsTable.id, post.id));
      await syncBoostAllocationsForPost(post.id, brandId, tx);
    });

    allocations = await linkedAllocations([post.id]);
    expect(allocations.map((row) => [row.spend_month, row.boost_amount]).sort()).toEqual([
      ["2026-09", 5],
      ["2026-10", 10],
    ]);

    await db.transaction(async (tx) => {
      await tx.update(contentPostsTable).set({ boosted: false }).where(eq(contentPostsTable.id, post.id));
      await syncBoostAllocationsForPost(post.id, brandId, tx);
    });

    expect(await linkedAllocations([post.id])).toHaveLength(0);
    expect(await db.select().from(adBoostsTable).where(eq(adBoostsTable.id, manual.id))).toHaveLength(1);
  });

  it("rolls back the calendar edit when synchronization fails", async () => {
    const brandId = await virtuBrandId();
    const post = await createPost(brandId);

    await expect(db.transaction(async (tx) => {
      await tx
        .update(contentPostsTable)
        .set({ boosted: true, boost_daily_budget: null })
        .where(eq(contentPostsTable.id, post.id));
      await syncBoostAllocationsForPost(post.id, brandId, tx);
    })).rejects.toThrow("daily boost budget");

    const [unchanged] = await db
      .select({
        boosted: contentPostsTable.boosted,
        budget: contentPostsTable.boost_daily_budget,
      })
      .from(contentPostsTable)
      .where(eq(contentPostsTable.id, post.id));
    expect(unchanged).toEqual({ boosted: false, budget: "10.00" });
    expect(await linkedAllocations([post.id])).toHaveLength(0);
  });

  it("deduplicates same-page grouped channels", async () => {
    const brandId = await virtuBrandId();
    const groupId = `boost-sync-test-${Date.now()}`;
    const facebook = await createPost(brandId, { group_id: groupId, boosted: true });
    const instagram = await createPost(brandId, {
      group_id: groupId,
      platform: "Instagram",
      boosted: true,
    });

    await syncBoostAllocationsForPost(facebook.id, brandId);
    await syncBoostAllocationsForPost(instagram.id, brandId);

    const allocations = await linkedAllocations([facebook.id, instagram.id]);
    expect(allocations).toHaveLength(2);
    expect(new Set(allocations.map((row) => row.spend_month))).toEqual(new Set(["2026-08", "2026-09"]));
    expect(allocations.every((row) => row.page === "VF-EN")).toBe(true);
  });
});