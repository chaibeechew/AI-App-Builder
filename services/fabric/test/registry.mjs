import assert from "node:assert/strict";
import fs from "node:fs";

const registry=JSON.parse(fs.readFileSync("services/fabric/service-registry.json","utf8"));
assert.equal(registry.version,"fabric1");
assert.equal(registry.defaultMode,"embedded");
assert.match(registry.liveEvidencePolicy,/distinct_https_production/);
const expected=["communications","generation","memory","cloud","publish"];
assert.deepEqual(Object.keys(registry.services).sort(),expected.sort());
for(const [name,service] of Object.entries(registry.services)){
 assert.ok(fs.existsSync(service.root),`${name}: missing service root`);
 assert.ok(fs.existsSync(`${service.root}/vercel.json`),`${name}: missing standalone vercel root`);
 assert.ok(fs.existsSync(`${service.root}/package.json`),`${name}: missing package`);
 assert.match(service.remoteUrlEnv,/^LANERIQ_[A-Z]+_SERVICE_URL$/);
 assert.match(service.secretEnv,/^LANERIQ_[A-Z]+_SERVICE_SECRET$/);
 assert.match(service.statusPath,new RegExp(`^/api/${name}/v1/status$`));
}
const forbidden=JSON.stringify(registry);
assert.ok(!/OPENAI_API_KEY|GEMINI_API_KEY|GROQ_API_KEY|VERCEL_TOKEN|SUPABASE_SERVICE_ROLE_KEY/.test(forbidden),"registry must remain provider/credential opaque");
console.log("service fabric registry contract passed");
