import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  LANERIQ_LEGACY_API_ROOTS,
  LANERIQ_LEGACY_SURFACE_MANIFEST_VERSION,
  LANERIQ_LEGACY_SURFACE_POLICY,
  legacySurfaceStatus,
} from "../lib/platform/legacy-surface-manifest.js";

assert.equal(LANERIQ_LEGACY_SURFACE_MANIFEST_VERSION, "1.0.0");
assert.equal(LANERIQ_LEGACY_SURFACE_POLICY.authority, "LANERIQ AI");
assert.equal(LANERIQ_LEGACY_SURFACE_POLICY.migrationMode, "ratchet-only");
assert.equal(LANERIQ_LEGACY_SURFACE_POLICY.newLegacyApiRootAllowed, false);
assert.equal(LANERIQ_LEGACY_SURFACE_POLICY.legacyRuntimeRequiredForNewFeatures, false);
assert.equal(LANERIQ_LEGACY_SURFACE_POLICY.compatibilityMayShrinkWithoutReplacement, false);

const allowedRoots = new Set(LANERIQ_LEGACY_API_ROOTS.map((item) => item.root));
assert.deepEqual([...allowedRoots].sort(), ["capabilities", "platform", "voice"]);
assert.equal(LANERIQ_LEGACY_SURFACE_POLICY.maxLegacyApiRoots, 3);

const legacyRoot = "app/api/soolenai";
const actualRoots = fs.existsSync(legacyRoot)
  ? fs.readdirSync(legacyRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
  : [];

assert.ok(actualRoots.length <= LANERIQ_LEGACY_SURFACE_POLICY.maxLegacyApiRoots,
  `Legacy API root budget regressed: ${actualRoots.length} > ${LANERIQ_LEGACY_SURFACE_POLICY.maxLegacyApiRoots}`);
for (const root of actualRoots) {
  assert.equal(allowedRoots.has(root), true, `New legacy API root is forbidden: app/api/soolenai/${root}`);
}

for (const surface of LANERIQ_LEGACY_API_ROOTS) {
  assert.match(surface.legacyPath, /^\/api\/soolenai\//);
  assert.match(surface.canonicalReplacement, /^\/api\/laneriq\//);
  assert.notEqual(surface.replacementState, "live", "Manifest must not invent LIVE migration evidence");
  const route = path.join("app/api/soolenai", surface.root, "route.js");
  if (actualRoots.includes(surface.root)) assert.equal(fs.existsSync(route), true, `Existing compatibility root must contain route.js: ${route}`);
}

const status = legacySurfaceStatus();
assert.equal(status.currentBudget, 3);
assert.equal(status.newLegacyApiRootAllowed, false);
assert.equal(status.surfaces.length, 3);
assert.ok(status.retirementRequires.includes("Production exact-SHA evidence reconciled"));

const manifestSource = fs.readFileSync("lib/platform/legacy-surface-manifest.js", "utf8");
assert.doesNotMatch(manifestSource, /SERVICE_ROLE|SECRET_KEY|API_KEY|ACCESS_TOKEN/);
assert.match(manifestSource, /Production telemetry shows no required legacy traffic/);
assert.match(manifestSource, /rollback plan verified/);

console.log("✓ Existing /api/soolenai compatibility roots are capped at three and may only shrink");
console.log("✓ New legacy API roots are fail-closed; new features must target LANERIQ canonical namespaces");
console.log("✓ Every retirement requires canonical replacement, telemetry, rollback and Production exact-SHA evidence");
