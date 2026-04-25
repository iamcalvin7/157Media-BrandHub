import app from "./app.js";
import { logger } from "./lib/logger.js";
import { seedChangelogFromStatic } from "./routes/changelog.js";
import { seedBrandsIfMissing } from "./lib/brandContext.js";

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
    await seedChangelogFromStatic();
    logger.info("Knowledge changelog seeded");
  } catch (err) {
    logger.error({ err }, "Failed to seed changelog");
  }
});
