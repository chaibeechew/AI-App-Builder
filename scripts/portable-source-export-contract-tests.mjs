import assert from "node:assert/strict";
import fs from "node:fs";
import {
  createPortableSourceExport,
  portableSourceFilename,
  verifyPortableSourceExport,
} from "../lib/ai/portable-source-export.js";

const route = fs.readFileSync("app/api/apps/[id]/export/route.js", "utf8");
const versionActions = fs.readFileSync("app/app-dashboard/[id]/versions/VersionRollbackButton.js", "utf8");

const app = { id: "11111111-1111-4111-8111-111111111111" };
const version = {
  id: "22222222-2222-4222-8222-222222222222",
  version_no: 7,
  created_at: "2026-09-05T00:00:00.000Z",
  change_summary: "Exact saved version",
  specification: {
    name: "Portable Demo",
    pages: [{ name: "Home", apiKey: "sk-proj-123456789012345678901234567890" }],
    integrations: {
      publicLabel: "Example provider",
      clientSecret: "secret-value-that-must-never-export",
      nested: { authorization: "Bearer abcdefghijklmnopqrstuvwxyz0123456789" },
    },
    copy: "This ordinary product text is retained.",
  },
};

const first = createPortableSourceExport({ app, version });
const second = createPortableSourceExport({ app, version });
assert.deepEqual(first, second, "Exact saved source must export deterministically.");
assert.equal(first.schema, "laneriq.portable-project-source");
assert.equal(first.projectId, app.id);
assert.equal(first.versionId, version.id);
assert.equal(first.versionNo, 7);
assert.equal(first.portability.providerIndependent, true);
assert.equal(first.portability.frameworkSourceFilesIncluded, false);
assert.equal(first.portability.generatedBuildArtifactsIncluded, false);
assert.equal(first.portability.environmentSecretsIncluded, false);
assert.ok(first.redaction.count >= 3, "Known credential fields/values must be redacted.");

const serialized = JSON.stringify(first);
assert.doesNotMatch(serialized, /sk-proj-123456789012345678901234567890/);
assert.doesNotMatch(serialized, /secret-value-that-must-never-export/);
assert.doesNotMatch(serialized, /Bearer abcdefghijklmnopqrstuvwxyz0123456789/);
assert.match(serialized, /This ordinary product text is retained/);
assert.equal(verifyPortableSourceExport(first).verified, true);

const changed = createPortableSourceExport({
  app,
  version: { ...version, specification: { ...version.specification, copy: "Changed exact source" } },
});
assert.notEqual(first.bundleDigest, changed.bundleDigest, "Source changes must change the bundle digest.");

const tampered = structuredClone(first);
tampered.files[0].content += "tampered";
assert.equal(verifyPortableSourceExport(tampered).verified, false, "Tampered content must fail digest verification.");
assert.equal(portableSourceFilename(app.id, 7), `${app.id}-v7.laneriq.json`);

// API is read-only, authenticated, owner-bound and one-version-at-a-time.
assert.match(route, /auth\.getUser\(\)/);
assert.match(route, /\.eq\("owner_id", user\.id\)/);
assert.match(route, /searchParams\.get\("versionId"\)/);
assert.match(route, /\.eq\("id", versionId\)/);
assert.match(route, /\.eq\("app_id", id\)/);
assert.match(route, /createPortableSourceExport/);
assert.match(route, /Content-Disposition/);
assert.match(route, /X-LANERIQ-Bundle-Digest/);
assert.doesNotMatch(route, /createAdminClient|service_role|credits|publish\(|server_publish_web_project/);
assert.doesNotMatch(route, /project_integrations|ownerUserId|exportedAt|new Date\(/);
assert.doesNotMatch(route, /\.order\("version_no"/);

// Version History always supplies the exact version being exported.
assert.match(versionActions, /export\?versionId=\$\{encodeURIComponent\(versionId\)\}/);
assert.match(versionActions, /Export v\{versionNo\} source/);

console.log("✓ Portable source export is deterministic and exact-version bound");
console.log("✓ Credential-like fields and values are redacted before download");
console.log("✓ Bundle and per-file SHA-256 digests detect tampering");
console.log("✓ Export API is authenticated, owner-bound, read-only and provider-independent");
console.log("✓ Version History exposes exact saved-version source downloads");
