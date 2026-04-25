import * as cheerio from "cheerio";
import dns from "node:dns/promises";
import net from "node:net";
import { db, scraperJobsTable, scraperPagesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { logger } from "../logger.js";

const USER_AGENT = "VirtuBrandHubBot/1.0 (+https://brandhub.replit.app)";
const FETCH_TIMEOUT_MS = 15_000;
const CONCURRENCY = 4;
const MAX_REDIRECTS = 5;
const MAX_CONCURRENT_JOBS = 2;

let runningJobCount = 0;
export function activeJobCount(): number {
  return runningJobCount;
}
export const MAX_CONCURRENT_JOBS_LIMIT = MAX_CONCURRENT_JOBS;

type RobotsRules = { disallow: string[] };

// ─── SSRF guard ──────────────────────────────────────────────────────────────
// Block hostnames that resolve to private, loopback, link-local, or otherwise
// reserved address ranges so a user-submitted URL can't pivot the api-server
// into the cloud metadata endpoint or the local network.
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "ip6-localhost",
  "ip6-loopback",
  "broadcasthost",
]);
const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".intranet"];

function isBlockedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 10) return true;                                // 10.0.0.0/8
  if (a === 127) return true;                               // loopback
  if (a === 0) return true;                                 // this network
  if (a === 169 && b === 254) return true;                  // link-local + AWS metadata
  if (a === 172 && b >= 16 && b <= 31) return true;         // 172.16.0.0/12
  if (a === 192 && b === 168) return true;                  // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true;        // CGNAT 100.64.0.0/10
  if (a >= 224) return true;                                // multicast + reserved
  return false;
}

function isBlockedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;       // unspecified, loopback
  if (lower.startsWith("fe80:") || lower.startsWith("fe80::")) return true; // link-local
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true;        // unique local fc00::/7
  if (lower.startsWith("ff")) return true;                  // multicast
  // IPv4-mapped IPv6 like ::ffff:127.0.0.1
  const v4mapped = lower.match(/^::ffff:([0-9.]+)$/);
  if (v4mapped) return isBlockedIPv4(v4mapped[1]);
  return false;
}

async function assertSafeHost(hostname: string): Promise<void> {
  const h = hostname.toLowerCase();
  if (!h) throw new Error("Empty hostname");
  if (BLOCKED_HOSTNAMES.has(h)) throw new Error(`Hostname not allowed: ${hostname}`);
  for (const suf of BLOCKED_HOST_SUFFIXES) {
    if (h.endsWith(suf)) throw new Error(`Hostname not allowed: ${hostname}`);
  }
  // If the hostname is already an IP literal, validate directly.
  const ipFamily = net.isIP(h);
  if (ipFamily === 4) {
    if (isBlockedIPv4(h)) throw new Error(`IP address not allowed: ${hostname}`);
    return;
  }
  if (ipFamily === 6) {
    if (isBlockedIPv6(h)) throw new Error(`IP address not allowed: ${hostname}`);
    return;
  }
  // Otherwise resolve the name and check every returned address.
  let records: { address: string; family: number }[] = [];
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch (err) {
    throw new Error(`DNS lookup failed for ${hostname}`);
  }
  if (records.length === 0) throw new Error(`No DNS records for ${hostname}`);
  for (const r of records) {
    if (r.family === 4 && isBlockedIPv4(r.address)) {
      throw new Error(`Hostname ${hostname} resolves to blocked address ${r.address}`);
    }
    if (r.family === 6 && isBlockedIPv6(r.address)) {
      throw new Error(`Hostname ${hostname} resolves to blocked address ${r.address}`);
    }
  }
}

// ─── Fetch primitives ────────────────────────────────────────────────────────
type FetchOk = { status: number; body: string; finalUrl: URL };

async function fetchOnce(url: URL): Promise<Response | null> {
  await assertSafeHost(url.hostname);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url.toString(), {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,text/plain;q=0.9" },
      signal: ctrl.signal,
      redirect: "manual",
    });
  } catch (err) {
    logger.debug({ url: url.toString(), err: String(err) }, "scraper raw fetch failed");
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Manually-followed fetch that re-validates each redirect hop against the SSRF
 * guard. Returns null on network failure. Caller filters on content-type.
 */
async function fetchWithRedirects(initial: URL): Promise<FetchOk | null> {
  let current = initial;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetchOnce(current);
    if (!res) return null;
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      let next: URL;
      try { next = new URL(loc, current); } catch { return null; }
      if (next.protocol !== "http:" && next.protocol !== "https:") return null;
      current = next;
      continue;
    }
    let body = "";
    try { body = await res.text(); } catch { /* leave empty */ }
    return { status: res.status, body, finalUrl: current };
  }
  return null;
}

async function fetchHtml(url: URL): Promise<FetchOk | null> {
  const res = await fetchWithRedirects(url);
  if (!res) return null;
  // Allow even if body is non-html — caller decides what to keep.
  return res;
}

async function fetchText(url: URL): Promise<FetchOk | null> {
  // Same as fetchHtml — kept separate for clarity at call sites.
  return fetchWithRedirects(url);
}

// ─── Robots ──────────────────────────────────────────────────────────────────
async function loadRobots(originUrl: URL): Promise<RobotsRules> {
  const robotsUrl = new URL("/robots.txt", originUrl);
  const rules: RobotsRules = { disallow: [] };
  const res = await fetchText(robotsUrl);
  if (!res || !res.body) return rules;
  // robots.txt is text/plain — we now read the body regardless of content-type.
  const lines = res.body.split(/\r?\n/);
  let inWildcardBlock = false;
  for (const raw of lines) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const val = m[2].trim();
    if (key === "user-agent") {
      inWildcardBlock = val === "*";
    } else if (inWildcardBlock && key === "disallow" && val) {
      rules.disallow.push(val);
    }
  }
  return rules;
}

function isAllowed(pathname: string, rules: RobotsRules): boolean {
  for (const rule of rules.disallow) {
    if (rule === "/") return false;
    if (pathname.startsWith(rule)) return false;
  }
  return true;
}

// ─── URL normalization + content extraction ──────────────────────────────────
function normalizeUrl(href: string, base: URL): URL | null {
  try {
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"].forEach((p) =>
      u.searchParams.delete(p),
    );
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u;
  } catch {
    return null;
  }
}

function extractContent(html: string): { title: string; text: string; links: string[] } {
  const $ = cheerio.load(html);
  const title = ($("title").first().text() || $("h1").first().text() || "").trim().slice(0, 500);
  $("script, style, noscript, svg, iframe, nav, footer, header, form").remove();
  const text = $("main, article, body")
    .first()
    .text()
    .replace(/[\t\r]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ ]{2,}/g, " ")
    .trim()
    .slice(0, 50_000);
  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (href) links.push(href);
  });
  return { title, text, links };
}

async function workerPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  });
  await Promise.all(runners);
}

export type CrawlOptions = {
  jobId: number;
  rootUrl: string;
  maxPages: number;
  maxDepth: number;
};

/**
 * BFS same-host crawl. Streams progress into the DB so the admin UI can watch
 * page_count tick up while it's running. Marks job done/failed at the end.
 *
 * Safety:
 *  - Every fetched URL passes an SSRF guard (no private/loopback/link-local IPs).
 *  - Redirects are followed manually and re-validated at each hop.
 *  - robots.txt User-agent: * Disallow rules are enforced.
 *  - Same-host policy uses the FINAL response URL host, not just the request URL.
 */
export async function runCrawl({ jobId, rootUrl, maxPages, maxDepth }: CrawlOptions): Promise<void> {
  runningJobCount += 1;
  const startedAt = new Date();
  await db.update(scraperJobsTable)
    .set({ status: "running", started_at: startedAt, error: null })
    .where(eq(scraperJobsTable.id, jobId));

  let root: URL;
  try {
    root = new URL(rootUrl);
    if (root.protocol !== "http:" && root.protocol !== "https:") throw new Error("Unsupported protocol");
    await assertSafeHost(root.hostname);
  } catch (err) {
    await db.update(scraperJobsTable)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : "Invalid URL",
        finished_at: new Date(),
      })
      .where(eq(scraperJobsTable.id, jobId));
    runningJobCount = Math.max(0, runningJobCount - 1);
    return;
  }

  const robots = await loadRobots(root);

  const visited = new Set<string>();
  const queue: { url: URL; depth: number }[] = [{ url: root, depth: 0 }];
  visited.add(root.toString());
  let savedCount = 0;

  try {
    while (queue.length > 0 && savedCount < maxPages) {
      const batch: { url: URL; depth: number }[] = [];
      while (batch.length < CONCURRENCY && queue.length > 0 && savedCount + batch.length < maxPages) {
        batch.push(queue.shift()!);
      }

      await workerPool(batch, CONCURRENCY, async ({ url, depth }) => {
        if (savedCount >= maxPages) return;
        if (!isAllowed(url.pathname, robots)) return;

        const res = await fetchHtml(url).catch((err) => {
          logger.debug({ url: url.toString(), err: String(err) }, "scraper hop blocked");
          return null;
        });
        if (!res) return;

        // Same-host policy: enforce on the FINAL URL after redirects too.
        if (res.finalUrl.host !== root.host) return;

        let title = "";
        let text = "";
        let links: string[] = [];
        if (res.body) {
          ({ title, text, links } = extractContent(res.body));
        }

        await db.insert(scraperPagesTable).values({
          job_id: jobId,
          url: res.finalUrl.toString(),
          title: title || null,
          content: text || null,
          status_code: res.status,
          depth,
        });
        savedCount += 1;
        await db.update(scraperJobsTable)
          .set({ page_count: savedCount })
          .where(eq(scraperJobsTable.id, jobId));

        if (depth >= maxDepth) return;

        for (const href of links) {
          const next = normalizeUrl(href, res.finalUrl);
          if (!next) continue;
          if (next.host !== root.host) continue;
          const key = next.toString();
          if (visited.has(key)) continue;
          visited.add(key);
          queue.push({ url: next, depth: depth + 1 });
        }
      });
    }

    await db.update(scraperJobsTable)
      .set({
        status: "done",
        finished_at: new Date(),
        page_count: savedCount,
      })
      .where(eq(scraperJobsTable.id, jobId));
    logger.info({ jobId, savedCount }, "scraper job complete");
  } catch (err) {
    logger.error({ jobId, err }, "scraper job failed");
    await db.update(scraperJobsTable)
      .set({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        finished_at: new Date(),
        page_count: savedCount,
      })
      .where(eq(scraperJobsTable.id, jobId));
  } finally {
    runningJobCount = Math.max(0, runningJobCount - 1);
  }
}

/**
 * Reset any jobs left in 'running' or 'queued' state from a previous process
 * (crash/restart). Called on server boot.
 */
export async function reapStaleScraperJobs(): Promise<void> {
  await db.execute(sql`
    UPDATE scraper_jobs
    SET status = 'failed', error = 'Server restarted while job was running', finished_at = NOW()
    WHERE status IN ('running', 'queued')
  `);
}
