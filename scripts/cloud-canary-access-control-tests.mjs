import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/cloud/service-status/route.js", "utf8");
const proxy = fs.readFileSync("lib/supabase/proxy.js", "utf8");
const adminAuthority = fs.readFileSync("lib/auth/admin-authority.js", "utf8");
const cloudContract = fs.readFileSync("services/cloud/test/contract.mjs", "utf8");

const getStart = route.indexOf("export async function GET");
const postStart = route.indexOf("export async function POST");
assert.ok(getStart >= 0 && postStart > getStart, "Cloud service-status must expose read-only GET before protected POST canary");
const getSource = route.slice(getStart, postStart);
const postSource = route.slice(postStart);

assert.match(getSource, /configurationTruth\(\)/, "Public GET may read only local sanitized configuration truth");
assert.match(getSource, /publicStatusPayload\(truth\)/);
assert.doesNotMatch(getSource, /fetch\(|project\.read|randomBytes|requestId|new URL\(OPERATE_PATH/, "Public Cloud GET must not execute remote work or create canary material");
assert.match(route, /runtimeCanary:\s*null/);
assert.match(route, /canaryExecutionMethod:\s*"ADMIN_POST_ONLY"/);
assert.match(route, /canaryRequiresAdmin:\s*true/);
assert.match(route, /lib\/auth\/admin-authority\.js/, "Cloud status route must reuse the provider-opaque LANERIQ admin authority boundary");
assert.doesNotMatch(route, /lib\/supabase\/|@supabase\//, "Cloud status route must not add direct auth-provider coupling");

assert.match(postSource, /resolveLaneriqAdminRequest\(request\)/, "Executable Cloud canary must resolve LANERIQ admin authority first");
assert.match(postSource, /if \(!access\.ok\)/, "Unauthorized Cloud canary attempts must fail before remote work");
assert.match(postSource, /operation:\s*"project\.read"/, "Protected canary must preserve the established bounded project.read probe");
assert.match(postSource, /fetch\(target/, "Only protected POST may execute the remote Cloud canary");
assert.match(postSource, /expectedAuthenticationMode = oidc\.token \? "VERCEL_OIDC" : "HMAC_SHA256"/);
assert.match(route, /PRODUCTION_CLOUD_OIDC_REQUIRED/, "Cloud configuration truth must continue to fail closed when Production OIDC evidence is unavailable");
assert.match(postSource, /PRODUCTION_LIVE_OIDC_EXACT_SHA/);
assert.match(postSource, /exactReleaseIdentity/);
assert.match(postSource, /canarySessionAuthority:\s*access\.sessionAuthority/);

assert.match(adminAuthority, /validateLaneriqSessionToken\(token\)/, "Cloud canary must inherit LANERIQ-primary session authority");
assert.match(adminAuthority, /isLaneriqPrimarySessionMode\(sessionMode\)/, "Migrated LANERIQ sessions must fail closed");
assert.match(adminAuthority, /ADMIN_PERMISSION_REQUIRED/);
assert.match(adminAuthority, /authorized\(user,\s*"laneriq"\)/);
assert.match(adminAuthority, /authorized\(user,\s*"legacy_bridge"\)/);

assert.match(proxy, /PUBLIC_CLOUD_READ_ONLY_STATUS_ENDPOINTS\s*=\s*new Set\(\["\/api\/cloud\/service-status"\]\)/);
assert.match(proxy, /PUBLIC_CLOUD_READ_ONLY_STATUS_ENDPOINTS\.has\(pathname\)\s*&&\s*\(request\.method === "GET" \|\| request\.method === "HEAD"\)/);
assert.doesNotMatch(proxy, /PUBLIC_CLOUD_READ_ONLY_STATUS_ENDPOINTS\.has\(pathname\)[\s\S]{0,180}request\.method === "POST"/, "Cloud POST must never enter the public bypass");
assert.doesNotMatch(proxy, /pathname\.startsWith\(["']\/api\/cloud\//, "No broad Cloud auth bypass may be introduced");

assert.match(cloudContract, /PRODUCTION_LIVE_OIDC_EXACT_SHA/, "Existing Cloud OIDC exact-SHA truth contract must remain chained");
assert.match(cloudContract, /expectedAuthenticationMode/);

console.log("✓ Public Cloud GET/HEAD status is strictly read-only and cannot execute project.read compute");
console.log("✓ Executable Cloud canary is LANERIQ-primary admin-only POST behind the normal session gate");
console.log("✓ Cloud status route remains provider-opaque while reusing the shared admin authority boundary");
console.log("✓ Existing OIDC, exact-SHA and bounded project.read truth semantics remain intact");
