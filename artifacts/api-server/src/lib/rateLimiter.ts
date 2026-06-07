import rateLimit from "express-rate-limit";

/**
 * General API limiter — applied to all /api/* routes.
 * 300 requests per 15 minutes per IP is generous enough for heavy UI usage
 * (≈ 1.3 req/s sustained) while deterring automated scraping.
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again in a few minutes." },
});

/**
 * AI / inference limiter — applied to every route that calls an LLM or
 * performs heavy AI work (OpenAI, Claude, tag enrichment, content ideas).
 * These calls are expensive; 30 per 15 minutes ≈ 2 per minute.
 */
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error:
      "AI request rate limit exceeded. Please wait before making more AI requests.",
  },
});

/**
 * Scraper limiter — web scraper jobs are network and CPU intensive.
 * 10 per 15 minutes keeps background crawl pressure manageable.
 */
export const scraperLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error:
      "Too many scraper jobs. Please wait before starting another crawl.",
  },
});
