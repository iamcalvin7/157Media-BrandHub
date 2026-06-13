import express, { type Express } from "express";
import cors, { type CorsOptions } from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import * as Sentry from "@sentry/node";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";
import { brandContextMiddleware } from "./lib/brandContext";
import { generalLimiter } from "./lib/rateLimiter";

const isProd = process.env["NODE_ENV"] === "production";

const allowedOrigins: string[] = (process.env["CORS_ORIGIN"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (isProd && allowedOrigins.length === 0) {
  logger.warn(
    "CORS_ORIGIN is not set in production. " +
      "All cross-origin requests will be rejected. " +
      "Set CORS_ORIGIN to a comma-separated list of allowed origins " +
      "(e.g. https://157media.replit.app).",
  );
}

const corsOptions: CorsOptions = {
  origin(requestOrigin, callback) {
    if (!isProd) {
      callback(null, true);
      return;
    }
    if (!requestOrigin || allowedOrigins.includes(requestOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin '${requestOrigin}' is not allowed`));
    }
  },
  credentials: true,
  exposedHeaders: ["x-brand-id", "x-brand-slug"],
};

const app: Express = express();

// Trust the Replit proxy (one hop in front). Required for correct req.ip
// resolution by the rate limiter. Safe — Replit always has exactly one proxy.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(cors(corsOptions));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
// cookieParser must run before authMiddleware so req.cookies is populated.
app.use(cookieParser());
// authMiddleware loads the user from the session cookie on every request.
// It never blocks — routes enforce authentication with req.isAuthenticated().
app.use(authMiddleware);
// brandContextMiddleware runs after auth so req.user is available for W2.B.
app.use(brandContextMiddleware);

app.use("/api", generalLimiter, router);

Sentry.setupExpressErrorHandler(app);

export default app;
