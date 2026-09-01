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
assert.match(vercelConfig,/"framework"\s*:\s*"nextjs"/,"Vercel must explicitly build the repository as Next.js.");
assert.match(vercelConfig,/"buildCommand"\s*:\s*"npm run build"/);
assert.match(vercelConfig,/"installCommand"\s*:\s*"npm install"/);
assert.doesNotMatch(vercelConfig,/"deploymentEnabled"\s*:\s*false/,"Production Git deployments must not be disabled now that the primary Vercel project is live.");

console.log("✓ Vercel function budget guard keeps legacy root functions removed and Store Readiness client-mounted");
console.log("✓ Production Git deployment remains enabled while LANERIQ AI stays on the consolidated Next.js App Router deployment model");
