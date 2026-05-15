import { Router, type IRouter } from "express";

const router: IRouter = Router();

const FEED_BASE = "https://www.visitsicily.info/en/category/categorie-en/evento-en/feed/";
const VF_BRAND_SLUG = "virtu-ferries";
const CACHE_TTL_MS = 60 * 60 * 1000;
// How many RSS pages to walk. Each page returns ~10 items. We walk a
// broader window than the most-recent pages because the visitsicily RSS is
// ordered by *publish* date — a Sicilian summer festival announced in
// January sits on a later RSS page than a winter market announced in April.
// 15 pages × 10 = ~150 events, enough to surface all upcoming events for
// the next ~6 months without overwhelming visitsicily's server (any larger
// and visitsicily starts throttling individual detail-page fetches).
const RSS_PAGES = 15;
// Max parallel detail-page fetches; visitsicily is a public WP site, keep
// the load polite. With ~150 events the first crawl takes ~25s; subsequent
// requests within the 1h cache window are instant. Boot warmup
// (`warmSicilyEventsCache`) ensures real users almost always hit a warm
// cache.
const DETAIL_CONCURRENCY = 8;
// Per-request timeout for detail pages (some are >190 KB rendered HTML).
const DETAIL_TIMEOUT_MS = 12_000;

const UA = "VirtuFerriesBrandHub/1.0 (events feed reader)";

// SSRF guard: only fetch from the official visitsicily.info host over HTTPS.
// Even though RSS links *should* always be on this host, we don't trust the
// upstream feed — a compromise or theme drift could otherwise turn this
// scraper into a redirector for internal targets.
const ALLOWED_HOSTS = new Set(["www.visitsicily.info", "visitsicily.info"]);
const MAX_REDIRECTS = 5;

function isAllowedSourceUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

// Returns http/https URL string or null. Used to sanitise WEBSITE / SOCIAL /
// rss link fields that are echoed to the client, so we never render `javascript:`
// or other exotic schemes as clickable links.
function sanitiseExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

// Manual-redirect fetch with per-hop host re-validation. Mirrors the SSRF
// pattern used by the in-admin scraper.
async function safeFetchVisitSicily(initialUrl: string, signal: AbortSignal): Promise<Response | null> {
  let url = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!isAllowedSourceUrl(url)) return null;
    const resp = await fetch(url, {
      headers: { "User-Agent": UA },
      redirect: "manual",
      signal,
    });
    if (resp.status >= 300 && resp.status < 400) {
      const loc = resp.headers.get("location");
      if (!loc) return null;
      url = new URL(loc, url).toString();
      continue;
    }
    return resp;
  }
  return null;
}

export type SicilyEvent = {
  id: string;            // canonical event URL — used for dedupe + as React key
  title: string;
  start: string | null;  // ISO datetime
  end: string | null;
  location: string | null;
  description: string | null;
  url: string;           // public visitsicily.info link
  image: string | null;
  website: string | null;
  social: string | null;
  categories: string[];
};

let cache: { fetchedAt: number; events: SicilyEvent[] } | null = null;
let inflight: Promise<SicilyEvent[]> | null = null;

// ─── helpers ─────────────────────────────────────────────────────────────────

function decodeEntities(s: string): string {
  return s
    .replace(/&#8217;|&#x2019;/g, "'")
    .replace(/&#8216;|&#x2018;/g, "'")
    .replace(/&#8220;|&#8221;|&#x201C;|&#x201D;/g, '"')
    .replace(/&#8211;|&#x2013;/g, "–")
    .replace(/&#8212;|&#x2014;/g, "—")
    .replace(/&#8230;|&hellip;/g, "…")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'");
}

function stripHtml(s: string | null | undefined): string {
  if (!s) return "";
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function unwrapCdata(s: string): string {
  const m = s.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  return m ? m[1] : s;
}

function tag(item: string, name: string): string | null {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i");
  const m = item.match(re);
  return m ? unwrapCdata(m[1]).trim() : null;
}

function parseDdmmyyyy(s: string): string | null {
  // Inputs from the page footer come as "dd/mm/yyyy hh:mm".
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!m) return null;
  const [, dd, mm, yyyy, hh, mi] = m;
  const day = String(dd).padStart(2, "0");
  const mon = String(mm).padStart(2, "0");
  const hour = hh ? String(hh).padStart(2, "0") : "00";
  const min = mi ? String(mi).padStart(2, "0") : "00";
  // Anchor everything to UTC — visitsicily times are nominal local; the UI
  // re-formats with toLocaleString so the offset is irrelevant for display.
  return `${yyyy}-${mon}-${day}T${hour}:${min}:00.000Z`;
}

// ─── RSS layer ───────────────────────────────────────────────────────────────

type RssRef = { title: string; url: string; categories: string[] };

async function fetchRssPage(page: number): Promise<RssRef[]> {
  const url = page === 1 ? FEED_BASE : `${FEED_BASE}?paged=${page}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), DETAIL_TIMEOUT_MS);
  try {
    const resp = await safeFetchVisitSicily(url, ctrl.signal);
    // 404 = past the last RSS page; return [] so the parallel walk just
    // stops naturally instead of throwing. Anything else is a real error.
    if (!resp) return [];
    if (resp.status === 404) return [];
    if (!resp.ok) throw new Error(`${url} → ${resp.status}`);
    const text = await resp.text();
    const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
    const out: RssRef[] = [];
    for (const item of items) {
      const link = tag(item, "link");
      const title = tag(item, "title");
      if (!link || !title) continue;
      const refUrl = link.trim();
      // Drop any RSS entry whose link isn't on the trusted host — the
      // detail-page fetcher would reject it anyway, but filtering here keeps
      // the dedupe set + UI link list clean.
      if (!isAllowedSourceUrl(refUrl)) continue;
      const categories = [...item.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/g)]
        .map(m => unwrapCdata(m[1]).trim())
        .filter(c => c && c.toLowerCase() !== "event");
      out.push({ title: decodeEntities(title), url: refUrl, categories });
    }
    return out;
  } finally {
    clearTimeout(t);
  }
}

// ─── Detail-page parser ──────────────────────────────────────────────────────

function extractOg(html: string, prop: string): string | null {
  const re = new RegExp(`<meta\\s+property=["']og:${prop}["']\\s+content=["']([^"']+)["']`, "i");
  const m = html.match(re);
  if (!m) return null;
  const value = decodeEntities(m[1]);
  // og:image is rendered into an <img src> on the client, so only let through
  // safe schemes.
  return prop === "image" ? sanitiseExternalUrl(value) : value;
}

/**
 * The visitsicily detail pages render a structured footer block of the form:
 *
 *   LOCATION
 *   START 20/05/2026 00:00
 *   END   24/05/2026 00:00
 *   WEBSITE https://...
 *   E-MAIL  info@...
 *   SOCIAL  https://...
 *   PLACES  San Vito lo Capo
 *   CATEGORIES Event , Festival
 *   AROUND  ← this section is "related events", we cut it.
 *
 * We strip HTML, grab the labels, and slice out the body description before
 * "Share this content!".
 */
function parseDetail(html: string, ref: RssRef): SicilyEvent {
  const flat = stripHtml(html);

  // Body description: between the "Detail" heading and "Share this content!"
  // (Avada theme universally includes both phrases on event pages).
  let description: string | null = null;
  const detailIdx = flat.indexOf(" Detail ");
  const shareIdx = flat.indexOf(" Share this content!");
  if (detailIdx !== -1 && shareIdx !== -1 && shareIdx > detailIdx) {
    description = flat.slice(detailIdx + 8, shareIdx).trim();
  }

  // Footer fields. We anchor by the label, then read until the next label.
  const labels = ["LOCATION", "START", "END", "WEBSITE", "E-MAIL", "CONTACTS", "SOCIAL", "PLACES", "CATEGORIES", "AROUND"];
  const labelRe = new RegExp(`\\b(${labels.join("|")})\\b`);
  const footer = (() => {
    const aroundIdx = flat.indexOf(" AROUND ");
    const slice = flat.slice(shareIdx === -1 ? 0 : shareIdx);
    return aroundIdx !== -1 ? slice.slice(0, slice.indexOf(" AROUND ")) : slice;
  })();
  const fields: Record<string, string> = {};
  let rest = footer;
  while (rest.length) {
    const m = rest.match(labelRe);
    if (!m || m.index === undefined) break;
    const label = m[1];
    const after = rest.slice(m.index + label.length);
    const next = after.match(labelRe);
    const value = (next && next.index !== undefined ? after.slice(0, next.index) : after).trim();
    if (!fields[label]) fields[label] = value;
    rest = next && next.index !== undefined ? after.slice(next.index) : "";
  }

  const start = fields["START"] ? parseDdmmyyyy(fields["START"]) : null;
  const end = fields["END"] ? parseDdmmyyyy(fields["END"]) : null;
  const place = fields["PLACES"]?.trim() || null;
  // Sanitise outbound links — only http/https survive into the API response,
  // so the UI can never render `javascript:` or other exotic schemes that a
  // hijacked event page might inject.
  const website = sanitiseExternalUrl(fields["WEBSITE"]);
  const social = sanitiseExternalUrl(fields["SOCIAL"]);
  const categoriesFromPage = fields["CATEGORIES"]
    ? fields["CATEGORIES"].split(",").map(c => c.trim()).filter(c => c && c.toLowerCase() !== "event")
    : [];

  // Description sanity: cap to 1200 chars so we don't blow up the agent prompt
  // when a page goes long. The UI has its own "Read more" expander.
  if (description && description.length > 1200) {
    description = description.slice(0, 1200).trimEnd() + "…";
  }

  return {
    id: ref.url,
    title: ref.title,
    start,
    end,
    location: place,
    description,
    url: ref.url,
    image: extractOg(html, "image"),
    website,
    social,
    categories: categoriesFromPage.length > 0 ? categoriesFromPage : ref.categories,
  };
}

async function fetchDetail(ref: RssRef): Promise<SicilyEvent | null> {
  if (!isAllowedSourceUrl(ref.url)) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), DETAIL_TIMEOUT_MS);
  try {
    const resp = await safeFetchVisitSicily(ref.url, ctrl.signal);
    if (!resp || !resp.ok) return null;
    const html = await resp.text();
    return parseDetail(html, ref);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Lightweight bounded-concurrency map. Avoids pulling in p-limit for one use.
async function mapPool<T, U>(items: T[], limit: number, fn: (x: T) => Promise<U>): Promise<U[]> {
  const out: U[] = new Array(items.length);
  let cursor = 0;
  const workers: Promise<void>[] = [];
  for (let i = 0; i < Math.min(limit, items.length); i++) {
    workers.push((async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= items.length) return;
        out[idx] = await fn(items[idx]);
      }
    })());
  }
  await Promise.all(workers);
  return out;
}

async function fetchAndParse(): Promise<SicilyEvent[]> {
  // Walk the RSS pages in parallel.
  const pages = await Promise.allSettled(
    Array.from({ length: RSS_PAGES }, (_, i) => fetchRssPage(i + 1)),
  );
  const seen = new Set<string>();
  const refs: RssRef[] = [];
  for (const r of pages) {
    if (r.status !== "fulfilled") continue;
    for (const ref of r.value) {
      if (seen.has(ref.url)) continue;
      seen.add(ref.url);
      refs.push(ref);
    }
  }
  if (refs.length === 0) throw new Error("RSS returned no events");

  const detailed = await mapPool(refs, DETAIL_CONCURRENCY, fetchDetail);
  const events = detailed.filter((e): e is SicilyEvent => e !== null);

  // Sort: events with a future start come first (chronologically), then
  // dateless / past events at the bottom. The page itself groups by month so
  // ordering is mostly cosmetic for raw API consumers.
  const today = new Date().toISOString().slice(0, 10);
  return events.sort((a, b) => {
    const aFuture = a.start && a.start.slice(0, 10) >= today;
    const bFuture = b.start && b.start.slice(0, 10) >= today;
    if (aFuture && !bFuture) return -1;
    if (!aFuture && bFuture) return 1;
    if (a.start && b.start) return a.start.localeCompare(b.start);
    if (a.start) return -1;
    if (b.start) return 1;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Non-blocking accessor: returns whatever's already in cache (possibly
 * empty) and never triggers a crawl. Used by the chat route so a cold
 * cache can never block a chat response on a 25 s scrape.
 */
export function getSicilyEventsCached(): { events: SicilyEvent[]; fetchedAt: number } | null {
  return cache ? { events: cache.events, fetchedAt: cache.fetchedAt } : null;
}

/**
 * Fire-and-forget cache warmer. Called on server boot so the first user
 * request hits a populated cache. Logs to console only — never throws.
 */
export function warmSicilyEventsCache(): void {
  // Only warm if nothing is cached and nothing is in flight.
  if (cache || inflight) return;
  void getSicilyEvents(false).catch(err => {
    console.warn("Sicily events cache warmup failed", err);
  });
}

export async function getSicilyEvents(force = false): Promise<{ events: SicilyEvent[]; fetchedAt: number; cached: boolean }> {
  const now = Date.now();
  if (!force && cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { events: cache.events, fetchedAt: cache.fetchedAt, cached: true };
  }
  if (force) cache = null;
  if (inflight) {
    const events = await inflight;
    return { events, fetchedAt: cache?.fetchedAt ?? Date.now(), cached: false };
  }

  inflight = (async () => {
    try {
      const events = await fetchAndParse();
      cache = { fetchedAt: Date.now(), events };
      return events;
    } finally {
      inflight = null;
    }
  })();

  const events = await inflight;
  return { events, fetchedAt: cache?.fetchedAt ?? Date.now(), cached: false };
}

router.get("/sicily-events", async (req, res): Promise<void> => {
  if (req.brandSlug !== VF_BRAND_SLUG) {
    res.status(404).json({ error: "Not available for this brand" });
    return;
  }

  const force = req.query["refresh"] === "1" || req.query["refresh"] === "true";

  try {
    const { events, fetchedAt, cached } = await getSicilyEvents(force);
    res.json({
      source: FEED_BASE,
      fetchedAt: new Date(fetchedAt).toISOString(),
      cached,
      count: events.length,
      events,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to fetch Sicily events feed");
    res.status(502).json({ error: "Failed to fetch events feed" });
  }
});

export default router;
