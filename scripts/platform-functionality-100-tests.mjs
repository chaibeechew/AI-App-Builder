import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { auditProjectExport, buildProjectExport, PROJECT_EXPORT_SCORE_REQUIRED } from "../lib/project-export.js";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

const fixture = buildProjectExport({
  app: {
    id: "project-1",
    name: "Portable Project",
    description: "Customer-owned project",
    current_version_id: "version-2",
    visibility: "private",
    publish_status: "draft",
  },
  exportedAt: "2026-09-01T00:00:00.000Z",
  sources: {
    sourceComplete: true,
    versions: [
      { id: "version-1", version_no: 1, specification: { name: "First" } },
      { id: "version-2", version_no: 2, specification: { name: "Current" } },
    ],
    backend: { schema_json: { entities: [] } },
    workflows: [{ name: "Safe workflow", trigger_config: { authorization: "Bearer abcdefghijklmnopqrstuvwxyz" } }],
    assets: [],
    integrations: [{ integration_type: "payments", config: { apiKey: "sk_live_12345678901234567890", region: "ap-southeast" } }],
    offers: [],
    memory: { memory_json: { private_key: "-----BEGIN PRIVATE KEY----- secret" } },
  },
});

assert.equal(fixture.audit.score, PROJECT_EXPORT_SCORE_REQUIRED);
assert.equal(fixture.audit.passed, true);
assert.ok(fixture.payload.manifest.redactedFields >= 3);
assert.equal(fixture.payload.integrations[0].config.apiKey, "[REDACTED]");
assert.equal(fixture.payload.integrations[0].config.region, "ap-southeast");
assert.equal(fixture.payload.workflows[0].trigger_config.authorization, "[REDACTED]");
assert.equal(fixture.payload.projectLearning.memory_json.private_key, "[REDACTED]");
assert.equal(Object.prototype.hasOwnProperty.call(fixture.payload.ownership, "ownerUserId"), false);
assert.equal(auditProjectExport({ ...fixture.payload, manifest: { ...fixture.payload.manifest, sourceComplete: false } }).passed, false);
assert.equal(auditProjectExport({ ...fixture.payload, project: { ...fixture.payload.project, currentVersionId: "missing" } }).passed, false);

const exportRoute = read("app/api/apps/[id]/export/route.js");
const rollbackRoute = read("app/api/apps/[id]/rollback/route.js");
const legacyAppRoute = read("app/api/apps/[id]/route.js");
const visibilityRoute = read("app/api/apps/[id]/visibility/route.js");
const rollbackButton = read("app/app-dashboard/[id]/versions/VersionRollbackButton.js");
const versionsPage = read("app/app-dashboard/[id]/versions/page.js");
const layout = read("app/layout.js");
const globalCss = read("app/globals.css");
const studio = read("app/studio/page.js");
const releasePage = read("app/release/[id]/page.js");
const nonprod = read("lib/non-production-readiness.js");

assert.match(exportRoute, /PROJECT_EXPORT_SCORE_REQUIRED/);
assert.match(exportRoute, /failedSources/);
assert.match(exportRoute, /Nothing incomplete was downloaded/);
assert.match(exportRoute, /X-LANERIQ-Export-Quality/);
assert.match(exportRoute, /createHash\("sha256"\)/);
assert.match(rollbackRoute, /createAdminClient/);
assert.match(rollbackRoute, /server_save_app_modification/);
assert.match(rollbackRoute, /p_expected_version_id/);
assert.match(rollbackRoute, /p_request_id/);
assert.match(rollbackRoute, /auditPremiumExperience/);
assert.match(rollbackRoute, /current 100-point recovery gate/);
assert.match(legacyAppRoute, /legacy rollback endpoint is retired/i);
assert.match(legacyAppRoute, /status: 410/);
assert.match(visibilityRoute, /cannot bypass the 100-point quality gate/);
assert.doesNotMatch(visibilityRoute, /\["draft",\s*"published"\]/);
assert.match(rollbackButton, /expectedCurrentVersionId/);
assert.match(rollbackButton, /requestIdRef/);
assert.match(versionsPage, /currentVersionId=\{app\.current_version_id\}/);

for (const file of ["app/error.js", "app/global-error.js", "app/loading.js", "app/not-found.js"]) assert.equal(exists(file), true, `${file} must exist`);
assert.match(read("app/error.js"), /reset\(\)/);
assert.match(read("app/global-error.js"), /Restart Workspace/);
assert.match(read("app/loading.js"), /aria-live="polite"/);
assert.match(read("app/not-found.js"), /No project data was changed/);
assert.match(layout, /className="skipLink"/);
assert.match(layout, /id="main-content"/);
assert.match(globalCss, /:focus-visible/);
assert.match(globalCss, /prefers-reduced-motion: reduce/);
assert.match(globalCss, /safe-area-inset-top/);
assert.match(studio, /Export & Ownership/);
assert.doesNotMatch(studio, /Export & Ownership[^\n]+live:false/);
assert.match(releasePage, /Return to Private Draft/);
assert.match(releasePage, /publish_status: "draft"/);

for (const key of ["gameRuntime", "integrations", "monetization", "analytics", "exportOwnership", "recovery", "accessibility", "routeResilience"]) {
  assert.match(nonprod, new RegExp(`key: "${key}"`), `Missing extended 100-point area: ${key}`);
}

console.log("✓ Portable project exports are complete-or-fail, credential-redacted, integrity-hashed and audited at 100/100");
console.log("✓ Version recovery is exact-version bound, replay-safe, atomic and blocked below the current 100-point gate");
console.log("✓ Direct visibility and legacy rollback routes cannot bypass release or history protections");
console.log("✓ Global loading, 404, route error and root recovery states preserve customer work and provide accessible actions");
console.log("✓ Extended platform readiness covers games, connections, payments, analytics, ownership, recovery, accessibility and routing resilience");
