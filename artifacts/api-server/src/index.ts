import app from "./app.js";
import { logger } from "./lib/logger.js";
import { seedChangelogFromStatic } from "./routes/changelog.js";
import { seedBrandsIfMissing } from "./lib/brandContext.js";
import { reapStaleScraperJobs } from "./lib/scraper/crawler.js";
import { warmSicilyEventsCache } from "./routes/sicilyEvents.js";
import { bootstrapFromSnapshot } from "./lib/bootstrapFromSnapshot.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  try {
    await seedBrandsIfMissing();
    logger.info("Brands seeded");
  } catch (err) {
    logger.error({ err }, "Failed to seed brands");
  }

  try {
    await bootstrapFromSnapshot();
  } catch (err) {
    logger.error({ err }, "Failed to bootstrap from snapshot");
  }

  try {
    await seedChangelogFromStatic();
    logger.info("Knowledge changelog seeded");
  } catch (err) {
    logger.error({ err }, "Failed to seed changelog");
  }

  try {
    await reapStaleScraperJobs();
    logger.info("Stale scraper jobs reaped");
  } catch (err) {
    logger.error({ err }, "Failed to reap stale scraper jobs");
  }

  // Kick off the Sicily events scraper in the background so the cache is
  // warm by the time the first user opens the Events page. Non-blocking —
  // server is already listening.
  warmSicilyEventsCache();
  logger.info("Sicily events cache warmup started");
});
