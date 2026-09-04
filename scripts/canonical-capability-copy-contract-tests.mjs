import assert from "node:assert/strict";
import fs from "node:fs";
import { resolveLaneriqCapabilities } from "../lib/laneriq/legacy-runtime-adapter.js";

const canonicalRoute = fs.readFileSync("app/api/laneriq/capabilities/route.js", "utf8");
const adapter = fs.readFileSync("lib/laneriq/legacy-runtime-adapter.js", "utf8");
const legacyRegistry = fs.readFileSync("lib/soolen/capability-registry.js", "utf8");

for (const tier of ["free", "pro", "business"]) {
  const resolved = resolveLaneriqCapabilities({ tier });
  const publicCopy = JSON.stringify((resolved.capabilities || []).map(({ category, name, description }) => ({ category, name, description })));
  assert.doesNotMatch(publicCopy, /\bSoolenAI\b|\bSoolen AI\b|\bSoolen's\b|\bSoolen\b/, `${tier} canonical capability copy must not expose legacy Soolen identity`);
  assert.ok((resolved.capabilities || []).every((item) => item.id && item.name && item.description), `${tier} canonical capability mapping must preserve capability structure`);
}

const pro = resolveLaneriqCapabilities({ tier: "pro" });
const neuralVoice = pro.capabilities.find((item) => item.id === "premium-neural-voice");
const localImage = pro.capabilities.find((item) => item.id === "local-image-creation");
const premiumVideo = pro.capabilities.find((item) => item.id === "premium-video-studio");
assert.match(neuralVoice?.name || "", /LANERIQ AI multilingual neural voice/);
assert.match(localImage?.description || "", /LANERIQ AI's programmatic engine/);
assert.match(premiumVideo?.description || "", /LANERIQ AI worker/);

// Canonical routes stay provider-opaque and consume the LANERIQ adapter only.
assert.match(canonicalRoute, /resolveLaneriqAccountContext/);
assert.match(canonicalRoute, /providerNamesHidden:\s*true/);
assert.doesNotMatch(canonicalRoute, /lib\/soolen|resolveSoolenCapabilities/);
assert.match(adapter, /canonicalLaneriqCopy/);

// Compatibility catalog is intentionally unchanged until supported legacy clients retire.
assert.match(legacyRegistry, /Soolen multilingual neural voice/);
assert.match(legacyRegistry, /Soolen's programmatic engine/);
assert.match(legacyRegistry, /Soolen worker/);

console.log("✓ LANERIQ canonical capability names/descriptions no longer expose Soolen identity");
console.log("✓ Capability IDs, tiers, readiness and entitlement structure are preserved");
console.log("✓ Legacy capability copy remains unchanged for compatibility clients");
console.log("✓ Provider names remain hidden at the canonical API boundary");
