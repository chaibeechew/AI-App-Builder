import assert from "node:assert/strict";
import fs from "node:fs";
import { isPublicAccountPath } from "../lib/auth/session-safety.js";

const read = (file) => fs.readFileSync(file, "utf8");
const stability = read("scripts/production-stability-100.mjs");
const productionPublic = read("scripts/production-public-contract-tests.mjs");
const canonicalRoute = read("app/api/laneriq/capabilities/route.js");
const legacyRoute = read("app/api/soolenai/capabilities/route.js");

assert.equal(isPublicAccountPath("/api/laneriq/capabilities"), true, "Canonical LANERIQ capability discovery must be public before sign-in");
assert.equal(isPublicAccountPath("/api/soolenai/capabilities"), true, "Legacy capability discovery must remain public while compatibility clients exist");

assert.match(stability, /path:"\/api\/laneriq\/capabilities"/);
assert.doesNotMatch(stability, /path:"\/api\/soolenai\/capabilities"/);
assert.match(stability, /run \$\{run\} \/api\/laneriq\/capabilities: invalid JSON/);
assert.match(productionPublic, /Production stability must exercise LANERIQ canonical capability discovery/);

assert.match(canonicalRoute, /X-LANERIQ-Authority/);
assert.match(canonicalRoute, /authority:\s*"laneriq"/);
assert.doesNotMatch(canonicalRoute, /lib\/soolen|supabase|OPENAI_API_KEY|GEMINI_API_KEY/i);

// Legacy route is intentionally retained until telemetry shows supported clients no longer depend on it.
assert.match(legacyRoute, /export async function GET/);
assert.match(legacyRoute, /resolveSoolenCapabilities/);

console.log("✓ Production stability consumes /api/laneriq/capabilities");
console.log("✓ Canonical capability discovery remains public and LANERIQ-owned");
console.log("✓ Legacy capability discovery remains public compatibility instead of being deleted early");
console.log("✓ Production stability cannot silently regress to the legacy SoolenAI capability path");
