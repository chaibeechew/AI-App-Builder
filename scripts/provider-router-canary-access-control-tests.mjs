import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("app/api/ai/provider-router/status/route.js", "utf8");
const proxy = fs.readFileSync("lib/supabase/proxy.js", "utf8");
const docs = fs.readFileSync("docs/provider-router-production-truth.md", "utf8");
const truth = fs.readFileSync("lib/ai/provider-router-truth.js", "utf8");

const getStart = route.indexOf("export async function GET");
const postStart = route.indexOf("export async function POST");
assert.ok(getStart >= 0 && postStart > getStart, "Provider Router must expose read-only GET and separate protected POST");
const getSource = route.slice(getStart, postStart);
const postSource = route.slice(postStart);

assert.doesNotMatch(getSource, /runZeroCostProviderRouterCanary|searchParams|get\(["']canary["']\)/, "Public GET must never execute the Provider Router canary");
assert.match(getSource, /publicStatusPayload\(providerRouterProductionTruth\(\)\)/);
assert.match(route, /runtimeCanary:\s*null/);
assert.match(route, /canaryExecutionMethod:\s*"ADMIN_POST_ONLY"/);
assert.match(route, /canaryRequiresAdmin:\s*true/);

assert.match(route, /LANERIQ_SESSION_COOKIE/);
assert.match(route, /LANERIQ_SESSION_MODE_COOKIE/);
assert.match(route, /validateLaneriqSessionToken\(token\)/, "Canary admin auth must use LANERIQ Session Authority first");
assert.match(route, /createAdminClient\(\)/);
assert.match(route, /admin\.auth\.admin\.getUserById\(laneriqSession\.userId\)/, "LANERIQ session user must be resolved server-side before role authorization");
assert.match(route, /user\.id !== laneriqSession\.userId/);
assert.match(route, /isLaneriqPrimarySessionMode\(sessionMode\)/, "Primary-mode sessions must fail closed instead of reviving legacy auth");
assert.match(route, /sessionAuthority:\s*"laneriq"/);
assert.match(route, /sessionAuthority:\s*"legacy_bridge"/);
assert.match(route, /createServerClient\(\)/, "Legacy bridge may remain only for not-yet-migrated sessions");
assert.match(route, /role !== "admin"/);
assert.match(route, /ADMIN_PERMISSION_REQUIRED/);
assert.match(postSource, /ZERO_COST_CANARY_REQUIRES_ZERO_MODE/);
assert.match(postSource, /runZeroCostProviderRouterCanary\(\)/);
assert.match(postSource, /canarySessionAuthority:\s*access\.sessionAuthority/);
assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY|SUPABASE_SECRET_KEY|OPENAI_API_KEY|GEMINI_API_KEY|GROQ_API_KEY|VERCEL_TOKEN/, "Canary route must never read or expose raw provider/service secrets");

assert.match(proxy, /PUBLIC_PROVIDER_ROUTER_READ_ONLY_STATUS_ENDPOINTS\s*=\s*new Set\(\["\/api\/ai\/provider-router\/status"\]\)/);
assert.match(proxy, /PUBLIC_PROVIDER_ROUTER_READ_ONLY_STATUS_ENDPOINTS\.has\(pathname\)\s*&&\s*\(request\.method === "GET" \|\| request\.method === "HEAD"\)/);
assert.doesNotMatch(proxy, /PUBLIC_PROVIDER_ROUTER_READ_ONLY_STATUS_ENDPOINTS\.has\(pathname\)[\s\S]{0,180}request\.method === "POST"/, "POST must never enter the Provider Router public bypass");
assert.doesNotMatch(proxy, /pathname\.startsWith\(["']\/api\/ai\//, "No broad AI API auth bypass may be introduced");

assert.match(truth, /providers:\s*\["soolen-local"\]/, "Executable canary must remain pinned to the local zero-cost provider");
assert.match(truth, /meteredProviderAttempted:\s*false/);
assert.match(truth, /externalProviderInvoked:\s*false/);

assert.match(docs, /GET \/api\/ai\/provider-router\/status/);
assert.match(docs, /never executes a canary/i);
assert.match(docs, /POST \/api\/ai\/provider-router\/status/);
assert.match(docs, /requires an authenticated LANERIQ administrator/i);
assert.doesNotMatch(docs, /Add `\?canary=1` to run/i);

console.log("✓ Anonymous GET/HEAD Provider Router observability is strictly read-only");
console.log("✓ Query parameters cannot trigger Provider Router compute");
console.log("✓ Canary POST uses LANERIQ-primary session authority, fail-closed migration semantics and server-side admin role authorization");
console.log("✓ Legacy auth remains only a bounded compatibility bridge for not-yet-migrated sessions");
console.log("✓ Executable canary remains local-zero-cost only and never opens a metered/external provider path");
