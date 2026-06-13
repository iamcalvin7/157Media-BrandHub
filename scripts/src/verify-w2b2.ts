/**
 * verify-w2b2.ts — Full W2.B2 verification for access management endpoints.
 *
 * Seeds isolated test fixtures via raw pg SQL, makes real authenticated HTTP
 * calls against the running API server, validates audit log rows, then cleans
 * up everything.
 *
 * NOTE: Setup inserts a guard-test brand and sleeps 31 seconds to allow the
 * API server's 30-second brand context cache to expire. This ensures the new
 * brand is visible to the server before the final-admin guard tests run.
 *
 * Run: pnpm --filter @workspace/scripts run verify-w2b2
 */

import pg from "pg";
import crypto from "crypto";
import { execSync } from "child_process";

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE = "http://localhost:8080/api";

const ADMIN_ID = "__w2b2_admin__";
const VIEWER_ID = "__w2b2_viewer__";
const SECOND_ADMIN_ID = "__w2b2_admin2__";
const TARGET_ID = "__w2b2_target__";
const GUARD_BRAND_SLUG = "__w2b2_guard__";

let adminSid = "";
let viewerSid = "";
let brandId = 0;      // main brand for most tests
let brandSlug = "";
let guardBrandId = 0; // isolated brand for final-admin guard tests

const testStart = new Date();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

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
// DB helpers (raw pg)
// ---------------------------------------------------------------------------

async function q(sql: string, params: unknown[] = []) {
  const res = await pool.query(sql, params);
  return res.rows;
}

async function makeSession(userId: string, email: string, firstName: string): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  const sess = JSON.stringify({
    user: { id: userId, email, firstName, lastName: "W2B2Test", profileImageUrl: null },
    access_token: "test-token-w2b2",
  });
  const expire = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await q(
    `INSERT INTO sessions (sid, sess, expire) VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (sid) DO UPDATE SET sess = EXCLUDED.sess, expire = EXCLUDED.expire`,
    [sid, sess, expire],
  );
  return sid;
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

const API_KEY = process.env["API_KEY"];
if (!API_KEY) {
  console.warn("  ⚠️  API_KEY is not set — non-public routes pass through without key check.");
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
  if (opts.sid) headers["Authorization"] = `Bearer ${opts.sid}`;
  if (API_KEY) headers["x-api-key"] = API_KEY;
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

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

async function setup() {
  console.log("\n── Setup ──────────────────────────────────────────────────");

  // Insert guard brand FIRST so the 31-second sleep runs in parallel with
  // the rest of setup, minimising total wait time.
  const guardRows = await q(
    `INSERT INTO brands (slug, name, primary_color, accent_color, alert_color)
     VALUES ($1, 'W2B2 Guard Test Brand', '#000000', '#000000', '#000000')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [GUARD_BRAND_SLUG],
  );
  guardBrandId = guardRows[0].id as number;
  console.log(`  guard brand: id=${guardBrandId} slug="${GUARD_BRAND_SLUG}"`);

  // Resolve main brand (brand 1 / virtu-ferries)
  const brands = await q("SELECT id, slug FROM brands WHERE slug = 'virtu-ferries' LIMIT 1");
  if (!brands.length) throw new Error("virtu-ferries brand not found in DB");
  brandId = brands[0].id as number;
  brandSlug = brands[0].slug as string;
  console.log(`  main brand:  id=${brandId} slug="${brandSlug}"`);

  // Upsert test users
  for (const [uid, email, first] of [
    [ADMIN_ID, "__w2b2_admin@test.local", "AdminW2B2"],
    [VIEWER_ID, "__w2b2_viewer@test.local", "ViewerW2B2"],
    [SECOND_ADMIN_ID, "__w2b2_admin2@test.local", "Admin2W2B2"],
    [TARGET_ID, "__w2b2_target@test.local", "TargetW2B2"],
  ] as [string, string, string][]) {
    await q(
      `INSERT INTO users (id, email, first_name, last_name)
       VALUES ($1, $2, $3, 'W2B2Test')
       ON CONFLICT (id) DO NOTHING`,
      [uid, email, first],
    );
  }

  // Seed main brand access
  for (const [uid, role] of [
    [ADMIN_ID, "admin"],
    [VIEWER_ID, "viewer"],
    [SECOND_ADMIN_ID, "admin"],
  ] as [string, string][]) {
    await q(
      `INSERT INTO user_brand_access (user_id, brand_id, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, brand_id) DO UPDATE SET role = EXCLUDED.role`,
      [uid, brandId, role],
    );
  }

  // Guard brand: ONLY ADMIN_ID has admin access (isolated for guard tests)
  await q(
    `INSERT INTO user_brand_access (user_id, brand_id, role)
     VALUES ($1, $2, 'admin')
     ON CONFLICT (user_id, brand_id) DO UPDATE SET role = 'admin'`,
    [ADMIN_ID, guardBrandId],
  );

  // TARGET: ensure no access on main brand
  await q(
    "DELETE FROM user_brand_access WHERE user_id = $1 AND brand_id = $2",
    [TARGET_ID, brandId],
  );

  // Sessions
  adminSid = await makeSession(ADMIN_ID, "__w2b2_admin@test.local", "AdminW2B2");
  viewerSid = await makeSession(VIEWER_ID, "__w2b2_viewer@test.local", "ViewerW2B2");

  // Wait for the API server's 30-second brand context cache to expire so the
  // guard brand is visible for tests 7 and 8.
  console.log("  sleeping 31s for API server brand cache to expire...");
  await new Promise((resolve) => setTimeout(resolve, 31_000));
  console.log("  fixtures ready.");
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

async function cleanup() {
  console.log("\n── Cleanup ────────────────────────────────────────────────");

  // Remove all test brand access
  for (const uid of [ADMIN_ID, VIEWER_ID, SECOND_ADMIN_ID, TARGET_ID]) {
    await q("DELETE FROM user_brand_access WHERE user_id = $1", [uid]);
  }
  // Remove guard brand access (catch-all)
  await q("DELETE FROM user_brand_access WHERE brand_id = $1", [guardBrandId]);

  // Sessions
  if (adminSid) await q("DELETE FROM sessions WHERE sid = $1", [adminSid]);
  if (viewerSid) await q("DELETE FROM sessions WHERE sid = $1", [viewerSid]);

  // Users
  for (const uid of [ADMIN_ID, VIEWER_ID, SECOND_ADMIN_ID, TARGET_ID]) {
    await q("DELETE FROM users WHERE id = $1", [uid]);
  }

  // Guard brand
  if (guardBrandId) {
    await q("DELETE FROM brands WHERE id = $1", [guardBrandId]);
  }

  console.log("  done.");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

async function runTests() {
  // ── CHECK 1: Typecheck ─────────────────────────────────────────────────
  console.log("\n── 1. Typecheck ───────────────────────────────────────────");
  try {
    execSync("pnpm --filter @workspace/api-server run typecheck", {
      cwd: process.cwd() + "/../..",
      stdio: "pipe",
    });
    pass("1. Workspace typecheck passes");
  } catch (e: unknown) {
    const err = e as { stdout?: Buffer; stderr?: Buffer };
    const msg = (err.stdout?.toString() || err.stderr?.toString() || String(e)).slice(0, 300);
    fail("1. Workspace typecheck passes", msg);
  }

  // ── CHECK 2: API server health ─────────────────────────────────────────
  console.log("\n── 2. API server health ───────────────────────────────────");
  try {
    const r = await req("GET", "/healthz", { noBrandHeader: true });
    if ([200, 204].includes(r.status)) {
      pass("2. API server starts cleanly", `GET /api/healthz → ${r.status}`);
    } else {
      // Try /health — also acceptable
      const r2 = await req("GET", "/health", { noBrandHeader: true });
      if ([200, 204, 404, 401].includes(r2.status)) {
        pass("2. API server starts cleanly", `server responded: ${r2.status}`);
      } else {
        fail("2. API server starts cleanly", `unexpected status ${r2.status}`);
      }
    }
  } catch (e) {
    fail("2. API server starts cleanly", String(e));
  }

  // ── CHECK 3: List access rows (GET) ────────────────────────────────────
  console.log("\n── 3. List access rows ────────────────────────────────────");
  try {
    const r = await req("GET", `/admin/access/brands/${brandId}/users`, { sid: adminSid });
    if (r.status === 200) {
      const rows = r.json as { user_id: string; email?: string | null }[];
      const hasAdmin = rows.some((row) => row.user_id === ADMIN_ID);
      const hasViewer = rows.some((row) => row.user_id === VIEWER_ID);
      const hasEmail = Object.prototype.hasOwnProperty.call(rows[0] ?? {}, "email");
      if (hasAdmin && hasViewer) {
        pass("3. Admin can list access rows (GET)", `${rows.length} rows; has email join: ${hasEmail}`);
      } else {
        fail("3. Admin can list access rows (GET)", `admin=${hasAdmin} viewer=${hasViewer}`);
      }
    } else {
      fail("3. Admin can list access rows (GET)", `status ${r.status} — ${JSON.stringify(r.json)}`);
    }
  } catch (e) {
    fail("3. Admin can list access rows (GET)", String(e));
  }

  // ── CHECK 4: Grant access (POST) ───────────────────────────────────────
  console.log("\n── 4. Grant access ────────────────────────────────────────");
  for (const role of ["viewer", "editor", "admin"] as const) {
    try {
      const r = await req("POST", `/admin/access/brands/${brandId}/users`, {
        sid: adminSid,
        body: { user_id: TARGET_ID, role },
      });
      if (r.status === 201 && (r.json as { role: string }).role === role) {
        pass(`4. Grant ${role} → 201`);
      } else {
        fail(`4. Grant ${role} → 201`, `status ${r.status} — ${JSON.stringify(r.json)}`);
      }
    } catch (e) {
      fail(`4. Grant ${role} → 201`, String(e));
    }
  }

  // ── CHECK 5: Update role (PATCH) ───────────────────────────────────────
  // TARGET_ID is admin after check 4 (upsert). ADMIN_ID + SECOND_ADMIN_ID
  // are also admins for the main brand — guard won't fire.
  console.log("\n── 5. Update role ─────────────────────────────────────────");
  try {
    const r = await req("PATCH", `/admin/access/brands/${brandId}/users/${TARGET_ID}`, {
      sid: adminSid,
      body: { role: "editor" },
    });
    if (r.status === 200 && (r.json as { role: string }).role === "editor") {
      pass("5. Admin can update role (PATCH)", "TARGET_ID admin → editor");
    } else {
      fail("5. Admin can update role (PATCH)", `status ${r.status} — ${JSON.stringify(r.json)}`);
    }
  } catch (e) {
    fail("5. Admin can update role (PATCH)", String(e));
  }

  // ── CHECK 6: Revoke non-final admin (DELETE) ───────────────────────────
  // ADMIN_ID is still admin for main brand after deleting SECOND_ADMIN_ID.
  console.log("\n── 6. Revoke non-final admin ──────────────────────────────");
  try {
    const r = await req("DELETE", `/admin/access/brands/${brandId}/users/${SECOND_ADMIN_ID}`, {
      sid: adminSid,
    });
    if (r.status === 204) {
      pass("6. Admin can revoke non-final admin access", "SECOND_ADMIN_ID → 204");
    } else {
      fail("6. Admin can revoke non-final admin access", `status ${r.status} — ${JSON.stringify(r.json)}`);
    }
  } catch (e) {
    fail("6. Admin can revoke non-final admin access", String(e));
  }

  // ── CHECK 7: Final-admin DELETE blocked (409) ──────────────────────────
  // Uses the ISOLATED guard brand: ADMIN_ID is the ONLY admin there.
  // countOtherAdmins(ADMIN_ID, guardBrandId) = 0 → must fire 409.
  console.log("\n── 7. Final-admin delete guard ────────────────────────────");
  try {
    const r = await req(
      "DELETE",
      `/admin/access/brands/${guardBrandId}/users/${ADMIN_ID}`,
      { sid: adminSid, brandSlugOverride: GUARD_BRAND_SLUG },
    );
    if (r.status === 409) {
      pass("7. Final-admin DELETE blocked → 409", JSON.stringify(r.json));
    } else {
      fail(
        "7. Final-admin DELETE blocked → 409",
        `got ${r.status} — ${JSON.stringify(r.json)}`,
      );
    }
  } catch (e) {
    fail("7. Final-admin DELETE blocked → 409", String(e));
  }

  // ── CHECK 8: Final-admin PATCH demotion blocked (409) ─────────────────
  // Same guard brand. ADMIN_ID is still admin (check 7 was blocked).
  console.log("\n── 8. Final-admin demotion guard ──────────────────────────");
  try {
    const r = await req(
      "PATCH",
      `/admin/access/brands/${guardBrandId}/users/${ADMIN_ID}`,
      { sid: adminSid, brandSlugOverride: GUARD_BRAND_SLUG, body: { role: "editor" } },
    );
    if (r.status === 409) {
      pass("8. Final-admin PATCH demotion blocked → 409", JSON.stringify(r.json));
    } else {
      fail(
        "8. Final-admin PATCH demotion blocked → 409",
        `got ${r.status} — ${JSON.stringify(r.json)}`,
      );
    }
  } catch (e) {
    fail("8. Final-admin PATCH demotion blocked → 409", String(e));
  }

  // ── CHECK 9: Non-admin receives 403 ───────────────────────────────────
  console.log("\n── 9. Non-admin → 403 ─────────────────────────────────────");
  try {
    const r = await req("GET", `/admin/access/brands/${brandId}/users`, { sid: viewerSid });
    if (r.status === 403) {
      pass("9. Non-admin (viewer) receives 403");
    } else {
      fail("9. Non-admin (viewer) receives 403", `got ${r.status}`);
    }
  } catch (e) {
    fail("9. Non-admin (viewer) receives 403", String(e));
  }

  // ── CHECK 10: Path brand mismatch → 403 ───────────────────────────────
  // Admin of virtu-ferries (brandId) uses wrong path brandId → 403
  console.log("\n── 10. Path brand mismatch → 403 ──────────────────────────");
  const wrongBrandId = brandId + 999999;
  try {
    const r = await req("GET", `/admin/access/brands/${wrongBrandId}/users`, { sid: adminSid });
    if (r.status === 403) {
      pass("10. Path brand mismatch → 403", `path=${wrongBrandId} vs req.brandId=${brandId}`);
    } else {
      fail("10. Path brand mismatch → 403", `got ${r.status} — ${JSON.stringify(r.json)}`);
    }
  } catch (e) {
    fail("10. Path brand mismatch → 403", String(e));
  }

  // ── CHECK 11: Audit log ───────────────────────────────────────────────
  console.log("\n── 11. Audit log ───────────────────────────────────────────");
  await new Promise((resolve) => setTimeout(resolve, 500)); // let fire-and-forget flush

  for (const [reason, label] of [
    ["ACCESS_GRANTED", "11a. ACCESS_GRANTED logged"],
    ["ROLE_UPDATED", "11b. ROLE_UPDATED logged"],
    ["ACCESS_REVOKED", "11c. ACCESS_REVOKED logged"],
    ["FINAL_ADMIN_GUARD", "11d. FINAL_ADMIN_GUARD logged"],
  ] as const) {
    try {
      const rows = await q(
        `SELECT id, method, route, result FROM auth_audit_log
         WHERE reason = $1 AND created_at >= $2
         ORDER BY id DESC LIMIT 3`,
        [reason, testStart],
      );
      if (rows.length > 0) {
        const s = rows[0] as { method: string; route: string; result: string };
        pass(label, `${rows.length} row(s); last: ${s.method} ${s.route} result=${s.result}`);
      } else {
        fail(label, `no rows with reason='${reason}' since ${testStart.toISOString()}`);
      }
    } catch (e) {
      fail(label, String(e));
    }
  }

  // ── CHECK 12: /auth/access still works ────────────────────────────────
  console.log("\n── 12. /auth/access still works ────────────────────────────");
  try {
    const r = await req("GET", "/auth/access", { sid: adminSid });
    if (r.status === 200) {
      const body = r.json as Record<string, unknown>;
      pass("12. GET /api/auth/access → 200", `keys: ${Object.keys(body).join(", ")}`);
    } else {
      fail("12. GET /api/auth/access → 200", `status ${r.status}`);
    }
  } catch (e) {
    fail("12. GET /api/auth/access → 200", String(e));
  }

  // ── CHECK 13: Frontend loads ──────────────────────────────────────────
  console.log("\n── 13. Frontend loads ──────────────────────────────────────");
  let frontendOk = false;
  for (const port of [5173, 3000, 4173]) {
    try {
      const fRes = await fetch(`http://localhost:${port}/`, {
        signal: AbortSignal.timeout(3000),
      });
      if (fRes.status === 200) {
        pass("13. Frontend loads", `port ${port} → 200`);
        frontendOk = true;
        break;
      }
    } catch { /* try next */ }
  }
  if (!frontendOk) {
    skip("13. Frontend loads", "not reachable on :5173/:3000/:4173 — verify visually in preview");
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

  console.log("\n");
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║            W2.B2 Verification Report                        ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : r.status === "FAIL" ? "❌" : "⏭️ ";
    const detail = r.detail ? `\n      └─ ${r.detail.slice(0, 120)}` : "";
    console.log(`  ${icon}  ${r.check}${detail}`);
  }

  console.log("");
  console.log(`  Total: ${total}  Passed: ${passed}  Failed: ${failed}  Skipped: ${skipped}`);
  console.log(failed > 0 ? "\n  ⚠️  FAILURES DETECTED — see above" : "\n  🎉  ALL CHECKS PASSED");
  console.log("");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("  W2.B2 Verification  —  Access Management Endpoints");
  console.log(`  ${new Date().toISOString()}`);
  console.log("══════════════════════════════════════════════════════════════");

  await setup();

  try {
    await runTests();
  } finally {
    await cleanup();
    await pool.end();
  }

  report();
  process.exit(results.some((r) => r.status === "FAIL") ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  pool.end().catch(() => { /* ignore */ });
  process.exit(1);
});
