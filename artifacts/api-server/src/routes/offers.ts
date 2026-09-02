import { Router, type IRouter } from "express";
import { brandOffersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { OffersContent } from "@workspace/brand-knowledge";
import { db } from "@workspace/db";
import { requireBrandAccess } from "../middlewares/requireBrandAccess.js";

const router: IRouter = Router();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function normalizeOffersContent(value: unknown): OffersContent | null {
  if (!isRecord(value) || !isString(value.headerSubtitle) || !Array.isArray(value.offers) || !Array.isArray(value.notes)) {
    return null;
  }
  const normalizeOffer = (raw: unknown) => {
    if (!isRecord(raw)) return null;
    if (![raw.id, raw.name, raw.badge, raw.badgeColor, raw.description, raw.validity, raw.hook].every(isString)) return null;
    if (!Array.isArray(raw.prices) || !Array.isArray(raw.notes)) return null;
    const prices = raw.prices.map((price) => {
      if (!isRecord(price) || !isString(price.label) || !isString(price.value)) return null;
      const iconName = price.iconName;
      return {
        label: price.label,
        value: price.value,
        iconName: iconName === "Car" || iconName === "Bike" || iconName === "Truck" ? iconName : "Users",
      } as const;
    });
    if (prices.some((price) => price === null)) return null;
    const notes = raw.notes.filter(isString);
    const schedule = raw.schedule === undefined
      ? undefined
      : Array.isArray(raw.schedule)
        ? raw.schedule.map((item) => isRecord(item) && isString(item.label) && isString(item.value)
          ? { label: item.label, value: item.value }
          : null)
        : null;
    if (schedule === null || (schedule !== undefined && schedule.some((item) => item === null))) return null;
    return {
      id: raw.id,
      name: raw.name,
      badge: raw.badge,
      badgeColor: raw.badgeColor,
      description: raw.description,
      validity: raw.validity,
      hook: raw.hook,
      prices: prices as NonNullable<typeof prices>,
      ...(schedule === undefined ? {} : { schedule }),
      notes,
    };
  };

  const offers = value.offers.map(normalizeOffer);
  const yearSections = value.yearSections === undefined
    ? undefined
    : Array.isArray(value.yearSections)
      ? value.yearSections.map((section) => {
        if (!isRecord(section) || !isString(section.year) || !Array.isArray(section.offers)) return null;
        const sectionOffers = section.offers.map(normalizeOffer);
        if (sectionOffers.some((offer) => offer === null)) return null;
        return { year: section.year, offers: sectionOffers };
      })
      : null;
  if (offers.some((offer) => offer === null) || yearSections === null || yearSections?.some((section) => section === null)) {
    return null;
  }

  const notes = value.notes.map((note) => {
    if (!isRecord(note) || !isString(note.title) || !isString(note.body) || !isString(note.color)) return null;
    return {
      title: note.title,
      body: note.body,
      color: note.color,
      ...(isString(note.group) ? { group: note.group } : {}),
    };
  });
  if (notes.some((note) => note === null)) return null;

  return {
    headerSubtitle: value.headerSubtitle,
    offers: offers as OffersContent["offers"],
    ...(yearSections === undefined ? {} : { yearSections: yearSections as OffersContent["yearSections"] }),
    notes: notes as OffersContent["notes"],
  };
}

router.get("/offers", requireBrandAccess("viewer"), async (req, res): Promise<void> => {
  const [row] = await db
    .select({ content: brandOffersTable.content })
    .from(brandOffersTable)
    .where(eq(brandOffersTable.brand_id, req.brandId!));
  res.json(row?.content ?? null);
});

router.put("/offers", requireBrandAccess("editor"), async (req, res): Promise<void> => {
  const content = normalizeOffersContent(req.body?.content);
  if (!content) {
    res.status(400).json({ error: "Invalid offers content" });
    return;
  }
  try {
    const [row] = await db
      .insert(brandOffersTable)
      .values({ brand_id: req.brandId!, content })
      .onConflictDoUpdate({
        target: brandOffersTable.brand_id,
        set: { content, updated_at: new Date() },
      })
      .returning({ content: brandOffersTable.content });
    res.json(row?.content ?? content);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save offers" });
  }
});

export default router;