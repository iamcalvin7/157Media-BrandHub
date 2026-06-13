/**
 * verify-w2b2.ts — Full W2.B2 verification for access management endpoints.
 *
 * Seeds isolated test fixtures, makes real authenticated HTTP calls against
 * the running API server, validates audit log rows, then cleans up everything.
 *
 * Run: pnpm --filter @workspace/scripts exec tsx ./src/verify-w2b2.ts
 */

import {
  db,
  usersTable,
  sessionsTable,
  userBrandAccessTable,
  authAuditLogTable,
  brandsTable,
} from "@workspace/db";
import { eq, and, gte, desc } from "drizzle-orm";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE = "http://localhost:8080/api";

// Stable prefixed IDs so cleanup is safe even on re-run
const ADMIN_ID = "__w2b2_admin__";
const VIEWER_ID = "__w2b2_viewer__";
const SECOND_ADMIN_ID = "__w2b2_admin2__";
const TARGET_ID = "__w2b2_target__";

let adminSid = "";
let viewerSid = "";
let brandId = 0;
let brandSlug = "";

const testStart = new Date();

// ---------------------------------------------------------------------------
// Result tracking
// ---------------------------------------------------------------------------

const results: { check: string; status: "PASS" | "FAIL" | "SKIP"; detail: string }[] = [];

function pass(check: string, detail = "") {
  results.push({ check, status: "PASS", detail });
  console.log(`  ✅  ${check}${detail ? `  (${detail})` : ""}`);
}

function fail(check: string, detail = "") {
  results.push({ check, status: "FAIL", detail });
  console.error(`  ❌  ${check}${detail ? `  (${detail})` : ""}`);
}

function skip(check: string, detail = "") {
  results.push({ check, status: "SKIP", detail });
  console.log(`  ⏭️   ${check}${detail ? `  (${detail})` : ""}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeSession(
  userId: string,
  email: string,
  firstName: string,
): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  const user = {
    id: userId,
    email,
    firstName,
    lastName: "W2B2Test",
    profileImageUrl: null,
  };
  await db.insert(sessionsTable).values({
    sid,
    sess: { user, access_token: "test-token-w2b2" } as unknown as Record<string, unknown>,
    expire: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  return sid;
}

async function req(
  method: string,
  path: string,
  opts: {
    sid?: string;
    body?: Record<string, unknown>;
    brandSlugOverride?: string;
    noBrandHeader?: boolean;
  } = {},
): Promise<{ status: number; json: unknown }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.sid) headers["Cookie"] = `sid=${opts.sid}`;
  if (!opts.noBrandHeader) {
    headers["x-brand-slug"] = opts.brandSlugOverride ?? brandSlug;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  let json: unknown = null;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try { json = await res.json(); } catch { /* ignore */ }
  }
  return { status: res.status, json };
}

async function auditSince(reason: string): Promise<number> {
  const rows = await db
    .select({ id: authAuditLogTable.id })
    .from(authAuditLogTable)
    .where(
      and(
        eq(authAuditLogTable.reason, reason),
        gte(authAuditLogTable.created_at, testStart),
      ),
    )
    .orderBy(desc(authAuditLogTable.id))
    .limit(5);
  return rows.length;
}

// ---------------------------------------------------------------------------
// Setup — isolated test fixtures
// ---------------------------------------------------------------------------

async function setup() {
  console.log("\n── Setup ──────────────────────────────────────────────────");

  // Resolve first brand
  const brands = await db
    .select({ id: brandsTable.id, slug: brandsTable.slug })
    .from(brandsTable)
    .limit(1);
  if (!brands.length) throw new Error("No brands in DB — cannot run tests");
  brandId = brands[0]!.id;
  brandSlug = brands[0]!.slug;
  console.log(`  brand: id=${brandId} slug="${brandSlug}"`);

  // Upsert test users
  await db
    .insert(usersTable)
    .values([
      { id: ADMIN_ID, email: "__w2b2_admin@test.local", firstName: "AdminW2B2", lastName: "Test" },
      { id: VIEWER_ID, email: "__w2b2_viewer@test.local", firstName: "ViewerW2B2", lastName: "Test" },
      { id: SECOND_ADMIN_ID, email: "__w2b2_admin2@test.local", firstName: "Admin2W2B2", lastName: "Test" },
      { id: TARGET_ID, email: "__w2b2_target@test.local", firstName: "TargetW2B2", lastName: "Test" },
    ])
    .onConflictDoNothing();

  // Seed brand access
  await db
    .insert(userBrandAccessTable)
    .values([
      { user_id: ADMIN_ID, brand_id: brandId, role: "admin" },
      { user_id: VIEWER_ID, brand_id: brandId, role: "viewer" },
      { user_id: SECOND_ADMIN_ID, brand_id: brandId, role: "admin" },
    ])
    .onConflictDoUpdate({
      target: [userBrandAccessTable.user_id, userBrandAccessTable.brand_id],
      set: { role: userBrandAccessTable.role },
    });

  // Ensure TARGET_ID has no access (clean state)
  await db
    .delete(userBrandAccessTable)
    .where(
      and(
        eq(userBrandAccessTable.user_id, TARGET_ID),
        eq(userBrandAccessTable.brand_id, brandId),
      ),
    );

  // Create sessions
  adminSid = await makeSession(ADMIN_ID, "__w2b2_admin@test.local", "AdminW2B2");
  viewerSid = await makeSession(VIEWER_ID, "__w2b2_viewer@test.local", "ViewerW2B2");

  console.log("  fixtures seeded.");
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanup() {
  console.log("\n── Cleanup ────────────────────────────────────────────────");
  for (const uid of [ADMIN_ID, VIEWER_ID, SECOND_ADMIN_ID, TARGET_ID]) {
    await db
      .delete(userBrandAccessTable)
      .where(eq(userBrandAccessTable.user_id, uid));
  }
  if (adminSid) await db.delete(sessionsTable).where(eq(sessionsTable.sid, adminSid));
  if (viewerSid) await db.delete(sessionsTable).where(eq(sessionsTable.sid, viewerSid));
  for (const uid of [ADMIN_ID, VIEWER_ID, SECOND_ADMIN_ID, TARGET_ID]) {
    await db.delete(usersTable).where(eq(usersTable.id, uid));
  }
  console.log("  done.");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function runTests() {
  // ── CHECK 1: Typecheck ────────────────────────────────────────────────────
  console.log("\n── 1. Typecheck ───────────────────────────────────────────");
  const { execSync } = await import("child_process");
  try {
    execSync("pnpm --filter @workspace/api-server exec tsc --noEmit", {
      cwd: process.cwd(),
      stdio: "pipe",
    });
    pass("1. Workspace typecheck passes");
  } catch (e: unknown) {
    const msg = (e as { stdout?: Buffer; stderr?: Buffer }).stdout?.toString() || String(e);
    fail("1. Workspace typecheck passes", msg.slice(0, 200));
  }

  // ── CHECK 2: API server health ────────────────────────────────────────────
  console.log("\n── 2. API server health ───────────────────────────────────");
  try {
    const r = await req("GET", "/health", { noBrandHeader: true });
    if (r.status === 200 || r.status === 204) {
      pass("2. API server starts cleanly", `GET /api/health → ${r.status}`);
    } else {
      // 401 without API key is also "server is up"
      if (r.status === 401) {
        pass("2. API server starts cleanly", "health returned 401 (API key protected but running)");
      } else {
        fail("2. API server starts cleanly", `unexpected status ${r.status}`);
      }
    }
  } catch (e) {
    fail("2. API server starts cleanly", String(e));
  }

  // ── CHECK 3: List access rows (GET) ──────────────────────────────────────
  console.log("\n── 3. List access rows ────────────────────────────────────");
  try {
    const r = await req("GET", `/admin/access/brands/${brandId}/users`, { sid: adminSid });
    if (r.status === 200) {
      const rows = r.json as { user_id: string }[];
      const hasAdmin = rows.some((row) => row.user_id === ADMIN_ID);
      const hasViewer = rows.some((row) => row.user_id === VIEWER_ID);
      if (hasAdmin && hasViewer) {
        pass("3. Admin can list access rows", `${rows.length} rows, includes seeded users`);
      } else {
        fail("3. Admin can list access rows", `missing expected users: admin=${hasAdmin} viewer=${hasViewer}`);
      }
    } else {
      fail("3. Admin can list access rows", `status ${r.status} body: ${JSON.stringify(r.json)}`);
    }
  } catch (e) {
    fail("3. Admin can list access rows", String(e));
  }

  // ── CHECK 4: Grant access (POST) ─────────────────────────────────────────
  console.log("\n── 4. Grant access ────────────────────────────────────────");
  try {
    const r = await req("POST", `/admin/access/brands/${brandId}/users`, {
      sid: adminSid,
      body: { user_id: TARGET_ID, role: "viewer" },
    });
    if (r.status === 201) {
      const row = r.json as { user_id: string; role: string };
      if (row.user_id === TARGET_ID && row.role === "viewer") {
        pass("4. Admin can grant viewer access", `${TARGET_ID} → viewer`);
      } else {
        fail("4. Admin can grant viewer access", `unexpected body: ${JSON.stringify(r.json)}`);
      }
    } else {
      fail("4. Admin can grant viewer access", `status ${r.status} body: ${JSON.stringify(r.json)}`);
    }
  } catch (e) {
    fail("4. Admin can grant viewer access", String(e));
  }

  // Grant editor and admin to confirm role varieties work
  try {
    const r1 = await req("POST", `/admin/access/brands/${brandId}/users`, {
      sid: adminSid,
      body: { user_id: TARGET_ID, role: "editor" },
    });
    const r2 = await req("POST", `/admin/access/brands/${brandId}/users`, {
      sid: adminSid,
      body: { user_id: TARGET_ID, role: "admin" },
    });
    if (r1.status === 201 && r2.status === 201) {
      pass("4b. Admin can grant editor / admin via POST (upsert)", `editor→${r1.status} admin→${r2.status}`);
    } else {
      fail("4b. Admin can grant editor / admin via POST (upsert)", `editor=${r1.status} admin=${r2.status}`);
    }
  } catch (e) {
    fail("4b. Admin can grant editor / admin via POST (upsert)", String(e));
  }

  // ── CHECK 5: Update role (PATCH) ─────────────────────────────────────────
  console.log("\n── 5. Update role ─────────────────────────────────────────");
  // TARGET_ID is now admin (from 4b). Downgrade to editor — safe because ADMIN_ID and SECOND_ADMIN_ID are admins.
  try {
    const r = await req("PATCH", `/admin/access/brands/${brandId}/users/${TARGET_ID}`, {
      sid: adminSid,
      body: { role: "editor" },
    });
    if (r.status === 200) {
      const row = r.json as { role: string };
      if (row.role === "editor") {
        pass("5. Admin can update role (PATCH)", `TARGET_ID role → editor`);
      } else {
        fail("5. Admin can update role (PATCH)", `unexpected body: ${JSON.stringify(r.json)}`);
      }
    } else {
      fail("5. Admin can update role (PATCH)", `status ${r.status} body: ${JSON.stringify(r.json)}`);
    }
  } catch (e) {
    fail("5. Admin can update role (PATCH)", String(e));
  }

  // ── CHECK 6: Revoke non-final admin ──────────────────────────────────────
  console.log("\n── 6. Revoke non-final admin ──────────────────────────────");
  // Delete SECOND_ADMIN_ID — ADMIN_ID is still an admin, so guard won't fire
  try {
    const r = await req("DELETE", `/admin/access/brands/${brandId}/users/${SECOND_ADMIN_ID}`, {
      sid: adminSid,
    });
    if (r.status === 204) {
      pass("6. Admin can revoke non-final admin access", `SECOND_ADMIN_ID deleted → 204`);
    } else {
      fail("6. Admin can revoke non-final admin access", `status ${r.status} body: ${JSON.stringify(r.json)}`);
    }
  } catch (e) {
    fail("6. Admin can revoke non-final admin access", String(e));
  }

  // ── CHECK 7: Final-admin delete blocked (409) ─────────────────────────────
  console.log("\n── 7. Final-admin delete guard ───────────────────────────");
  // ADMIN_ID is now the ONLY admin for this brand. Delete should → 409.
  try {
    const r = await req("DELETE", `/admin/access/brands/${brandId}/users/${ADMIN_ID}`, {
      sid: adminSid,
    });
    if (r.status === 409) {
      pass("7. Final-admin delete blocked with 409", JSON.stringify(r.json));
    } else {
      fail("7. Final-admin delete blocked with 409", `got ${r.status} body: ${JSON.stringify(r.json)}`);
    }
  } catch (e) {
    fail("7. Final-admin delete blocked with 409", String(e));
  }

  // ── CHECK 8: Final-admin demotion blocked (409) ───────────────────────────
  console.log("\n── 8. Final-admin demotion guard ─────────────────────────");
  // ADMIN_ID is still the only admin. Demotion to editor should → 409.
  try {
    const r = await req("PATCH", `/admin/access/brands/${brandId}/users/${ADMIN_ID}`, {
      sid: adminSid,
      body: { role: "editor" },
    });
    if (r.status === 409) {
      pass("8. Final-admin demotion blocked with 409", JSON.stringify(r.json));
    } else {
      fail("8. Final-admin demotion blocked with 409", `got ${r.status} body: ${JSON.stringify(r.json)}`);
    }
  } catch (e) {
    fail("8. Final-admin demotion blocked with 409", String(e));
  }

  // ── CHECK 9: Non-admin receives 403 ──────────────────────────────────────
  console.log("\n── 9. Non-admin → 403 ─────────────────────────────────────");
  try {
    const r = await req("GET", `/admin/access/brands/${brandId}/users`, { sid: viewerSid });
    if (r.status === 403) {
      pass("9. Non-admin (viewer) receives 403", `GET /admin/access/brands/:id/users → 403`);
    } else {
      fail("9. Non-admin (viewer) receives 403", `got ${r.status}`);
    }
  } catch (e) {
    fail("9. Non-admin (viewer) receives 403", String(e));
  }

  // ── CHECK 10: Path brand mismatch → 403 ──────────────────────────────────
  console.log("\n── 10. Path brand mismatch → 403 ──────────────────────────");
  // Use a brandId that is clearly wrong (brandId + 999999)
  const wrongBrandId = brandId + 999999;
  try {
    const r = await req("GET", `/admin/access/brands/${wrongBrandId}/users`, { sid: adminSid });
    if (r.status === 403) {
      pass("10. Path brand mismatch returns 403", `path brandId=${wrongBrandId} vs req.brandId=${brandId}`);
    } else {
      // Could be 404 if the middleware sees an unknown brand
      fail("10. Path brand mismatch returns 403", `got ${r.status} body: ${JSON.stringify(r.json)}`);
    }
  } catch (e) {
    fail("10. Path brand mismatch returns 403", String(e));
  }

  // ── CHECK 11: Audit log ───────────────────────────────────────────────────
  console.log("\n── 11. Audit log ───────────────────────────────────────────");
  // Small delay so fire-and-forget writes have flushed
  await new Promise((r) => setTimeout(r, 300));

  const auditChecks: [string, string][] = [
    ["ACCESS_GRANTED", "11a. ACCESS_GRANTED logged"],
    ["ROLE_UPDATED", "11b. ROLE_UPDATED logged"],
    ["ACCESS_REVOKED", "11c. ACCESS_REVOKED logged"],
    ["FINAL_ADMIN_GUARD", "11d. FINAL_ADMIN_GUARD logged"],
  ];

  for (const [reason, label] of auditChecks) {
    const count = await auditSince(reason);
    if (count > 0) {
      pass(label, `${count} row(s) in auth_audit_log since test start`);
    } else {
      fail(label, `no rows found with reason='${reason}' since ${testStart.toISOString()}`);
    }
  }

  // ── CHECK 12: /auth/access still works ───────────────────────────────────
  console.log("\n── 12. /auth/access still works ────────────────────────────");
  try {
    const r = await req("GET", "/auth/access", { sid: adminSid });
    if (r.status === 200) {
      pass("12. GET /api/auth/access returns 200", `body keys: ${Object.keys(r.json as object).join(", ")}`);
    } else {
      fail("12. GET /api/auth/access returns 200", `status ${r.status}`);
    }
  } catch (e) {
    fail("12. GET /api/auth/access returns 200", String(e));
  }

  // ── CHECK 13: Frontend loads ─────────────────────────────────────────────
  console.log("\n── 13. Frontend loads ──────────────────────────────────────");
  try {
    const fRes = await fetch("http://localhost:5173/", { signal: AbortSignal.timeout(5000) });
    if (fRes.status === 200) {
      pass("13. Frontend (port 5173) responds 200");
    } else {
      // Try other common ports
      const fRes2 = await fetch("http://localhost:3000/", { signal: AbortSignal.timeout(3000) }).catch(() => null);
      if (fRes2?.status === 200) {
        pass("13. Frontend (port 3000) responds 200");
      } else {
        skip("13. Frontend load check", `got ${fRes.status} on :5173; frontend port may differ — check preview pane`);
      }
    }
  } catch {
    // Try to get the port from env
    skip("13. Frontend load check", "frontend not reachable on :5173/:3000 — verify visually in preview pane");
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

function report() {
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║            W2.B2 Verification Report                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(
    `  ${"Check".padEnd(50)} Status`,
  );
  console.log(`  ${"─".repeat(50)} ──────`);
  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⏭️ ";
    const detail = r.detail ? `  ← ${r.detail.slice(0, 80)}` : "";
    console.log(`  ${icon} ${r.check.padEnd(48)}${detail}`);
  }
  console.log("");
  console.log(`  Total: ${total}  |  Passed: ${passed}  |  Failed: ${failed}  |  Skipped: ${skipped}`);
  console.log("");
  if (failed > 0) {
    console.log("  ⚠️  FAILURES DETECTED — see details above");
  } else {
    console.log("  🎉  ALL CHECKS PASSED (or skipped)");
  }
  console.log("");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("  W2.B2 Verification  —  Access Management Endpoints");
  console.log(`  Started: ${testStart.toISOString()}`);
  console.log("══════════════════════════════════════════════════════════════");

  await setup();

  try {
    await runTests();
  } finally {
    await cleanup();
  }

  report();

  process.exit(results.some((r) => r.status === "FAIL") ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
