import assert from "node:assert/strict";
import fs from "node:fs";

const exists=(path)=>fs.existsSync(path);
const read=(path)=>exists(path)?fs.readFileSync(path,"utf8"):"";

assert.equal(exists("api"),false,"Legacy root /api functions must stay removed; use Next.js app/api routes instead.");
assert.equal(exists("app/publish/[id]/layout.js"),false,"Publishing readiness must not create a separate dynamic server layout/function.");
const nextConfig=read("next.config.mjs");
assert.match(nextConfig,/\/api\/video\/projects\/:id\/versions\/:versionId/);
assert.match(nextConfig,/\/api\/video\/projects\/:id\/compile\?versionId=:versionId/);
const rootLayout=read("app/layout.js");
const mount=read("app/components/PublishingReadinessMount.js");
assert.match(rootLayout,/PublishingReadinessMount/);
assert.match(mount,/usePathname/);
assert.match(mount,/PublishingReadinessPanel/);

const vercelConfig=read("vercel.json");
assert.match(vercelConfig,/"deploymentEnabled": false/);
assert.doesNotMatch(vercelConfig,/"deploymentEnabled": true/);

console.log("✓ Zero-cost Vercel function budget guard keeps legacy root functions removed and Store Readiness client-mounted");
console.log("✓ Automatic Git deployments are disabled; Vercel is reserved for deliberate one-time manual consolidated deployments");
