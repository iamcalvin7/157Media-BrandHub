import { Router, type IRouter } from "express";
import * as ical from "node-ical";

const router: IRouter = Router();

const FEED_BASE = "https://eventsingozo.com/events";
const GHS_BRAND_SLUG = "gozo-highspeed";
const CACHE_TTL_MS = 60 * 60 * 1000;
// How many months ahead (incl. current) to fetch. Each month feed caps at ~30
// events so we merge several windows by UID to get a wider horizon.
const MONTHS_AHEAD = 6;

type GozoEvent = {
  uid: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  location: string | null;
  description: string | null;
  url: string | null;
  categories: string[];
};

let cache: { fetchedAt: number; events: GozoEvent[] } | null = null;
let inflight: Promise<GozoEvent[]> | null = null;

function toIsoDate(d: Date): string {
  return new Date(d).toISOString();
}

function stripHtml(s: string | undefined | null): string | null {
  if (!s) return null;
  const cleaned = s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

function buildFeedUrls(): string[] {
  // Always include the default upcoming list, then add month windows for
  // current month + next N months. The Events Calendar plugin caps each
  // response at ~30 events, so multiple windows give us a wider horizon.
  const urls: string[] = [`${FEED_BASE}/list/?ical=1`];
  const now = new Date();
  for (let i = 0; i < MONTHS_AHEAD; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    urls.push(`${FEED_BASE}/month/${yyyy}-${mm}/?ical=1`);
  }
  return urls;
}

function parseFeed(text: string): GozoEvent[] {
  const parsed = ical.sync.parseICS(text);
  const events: GozoEvent[] = [];
  for (const key of Object.keys(parsed)) {
    const item = parsed[key];
    if (!item || item.type !== "VEVENT") continue;
    if (!item.start || !item.summary) continue;

    const startDate = item.start as Date;
    const endDate = (item.end as Date | undefined) ?? null;
    const allDay =
      (item.start as { dateOnly?: boolean }).dateOnly === true ||
      (typeof item.datetype === "string" && item.datetype === "date");

    let url: string | null = null;
    if (typeof item.url === "string") {
      url = item.url;
    } else if (item.url && typeof (item.url as { val?: string }).val === "string") {
      url = (item.url as { val: string }).val;
    }

    let categories: string[] = [];
    if (Array.isArray(item.categories)) {
      categories = (item.categories as unknown[]).map(c => String(c));
    } else if (typeof item.categories === "string") {
      categories = (item.categories as string).split(",").map(c => c.trim()).filter(Boolean);
    }

    events.push({
      uid: typeof item.uid === "string" ? item.uid : key,
      title: String(item.summary).trim(),
      start: toIsoDate(startDate),
      end: endDate ? toIsoDate(endDate) : null,
      allDay,
      location: stripHtml(typeof item.location === "string" ? item.location : null),
      description: stripHtml(typeof item.description === "string" ? item.description : null),
      url,
      categories,
    });
  }
  return events;
}

async function fetchAndParse(): Promise<GozoEvent[]> {
  const urls = buildFeedUrls();
  const responses = await Promise.allSettled(
    urls.map(async u => {
      const resp = await fetch(u, {
        headers: { "User-Agent": "VirtuFerriesBrandHub/1.0 (events feed reader)" },
      });
      if (!resp.ok) throw new Error(`${u} responded ${resp.status}`);
      return resp.text();
    }),
  );

  const byUid = new Map<string, GozoEvent>();
  let okCount = 0;
  for (const r of responses) {
    if (r.status !== "fulfilled") continue;
    okCount++;
    for (const ev of parseFeed(r.value)) {
      // First write wins; subsequent feeds carrying the same UID are dupes.
      if (!byUid.has(ev.uid)) byUid.set(ev.uid, ev);
    }
  }

  if (okCount === 0) {
    throw new Error("All feed windows failed");
  }

  return Array.from(byUid.values()).sort((a, b) => a.start.localeCompare(b.start));
}

async function getEvents(): Promise<GozoEvent[]> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.events;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const events = await fetchAndParse();
      cache = { fetchedAt: Date.now(), events };
      return events;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

router.get("/gozo-events", async (req, res): Promise<void> => {
  if (req.brandSlug !== GHS_BRAND_SLUG) {
    res.status(404).json({ error: "Not available for this brand" });
    return;
  }

  const force = req.query.refresh === "1" || req.query.refresh === "true";
  if (force) cache = null;

  try {
    const events = await getEvents();
    res.json({
      source: `${FEED_BASE}/ (merged ${MONTHS_AHEAD + 1} feed windows)`,
      fetchedAt: cache ? new Date(cache.fetchedAt).toISOString() : new Date().toISOString(),
      cached: !force,
      count: events.length,
      events,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch Gozo events feed");
    res.status(502).json({ error: "Failed to fetch events feed" });
  }
});

export default router;
