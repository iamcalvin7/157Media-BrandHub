/**
 * authMiddleware — runs on every request after clerkMiddleware().
 *
 * clerkMiddleware() (registered in app.ts) verifies the Clerk session JWT from
 * the Authorization: Bearer header and populates req.auth. This middleware
 * reads req.auth.userId, resolves it to our internal users record via
 * user_identities, and sets req.user.
 *
 * This middleware NEVER blocks a request on its own. Route handlers use
 * req.isAuthenticated() to enforce authentication themselves.
 *
 * If the user has a valid Clerk session but has not yet called POST /auth/provision,
 * resolveClerkUser returns null and the request continues without req.user.
 * The provision route itself handles that bootstrap case.
 */

import { type Request, type Response, type NextFunction } from "express";
import { getAuth } from "@clerk/express";
import type { AuthUser } from "../lib/auth.js";
import { resolveClerkUser } from "../lib/auth.js";

// ---------------------------------------------------------------------------
// Global Express type augmentation
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;
      user?: User | undefined;
    }

    export interface AuthedRequest extends Request {
      user: User;
    }
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const { userId } = getAuth(req);

  if (!userId) {
    next();
    return;
  }

  const user = await resolveClerkUser(userId);
  if (user) {
    req.user = user;
  }

  next();
}
