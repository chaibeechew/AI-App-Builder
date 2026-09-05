import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(path,"utf8");
const home=read("app/page.js");
const create=read("app/create/page.js");
const adapter=read("lib/cloud-adapters/builder-project-data.js");
const safety=read("lib/auth/session-safety.js");
const generate=read("app/api/generate/route.js");

for(const [name,source] of [["Home",home],["Create",create]]){
  assert.match(source,/fetch\("\/api\/auth\/session"/i,`${name} must use LANERIQ Session as browser auth truth`);
  assert.match(source,/credentials:"same-origin"/,`${name} session check must stay same-origin`);
  assert.match(source,/sessionAuthority==="laneriq"/,`${name} must require LANERIQ session authority`);
  assert.doesNotMatch(source,/\.auth\.getSession\(/,`${name} must not gate Builder actions on the legacy browser provider session`);
  assert.doesNotMatch(source,/import\s+\{\s*createClient\s*\}\s+from\s+["'][^"']*supabase\/client/,`${name} must not initialize the browser compatibility client just to authorize creation`);
}

assert.match(home,/if\(r\.status===403&&\(\/verify\/i\.test/,"Home must not reinterpret every 403 as an auth failure");
assert.match(home,/ACCOUNT_VERIFICATION_REQUIRED/,"Home must still route genuine verification failures to secure verification");
assert.match(home,/SESSION_NOT_READY/,"Home must distinguish temporary session-authority outage from signed-out state");

assert.match(create,/const CREATE_REQUEST_KEY="laneriqCreatePagePendingRequest"/);
assert.match(create,/stableCreateRequestId\(/,"Create must reuse the same generation identity after an ambiguous retry");
assert.match(create,/requestId:createRequestId/,"Create must send the stable request identity to Generate");
assert.match(create,/GENERATION_REQUEST_IN_PROGRESS/,"Create must preserve a running generation request instead of rotating identity");
assert.match(create,/aiAppBuilderPendingIdea/,"Create must preserve the draft across verification");
assert.match(create,/aiAppBuilderPendingName/,"Create must preserve the project name across verification");
assert.match(create,/if\(r\.status===401\)/,"Create must redirect only a genuine signed-out Generate response");
assert.match(create,/r\.status===403&&\(\/verify\/i\.test/,"Create must distinguish verification 403 from feature/permission 403 responses");

for(const key of ["aiAppBuilderPendingIdea","aiAppBuilderPendingName","laneriqPendingCreateRequest","laneriqCreatePagePendingRequest"]){
  assert.ok(safety.includes(`"${key}"`),`Logout safety must clear private Builder storage key ${key}`);
}

assert.match(adapter,/validateLaneriqSessionToken\(token\)/);
assert.match(adapter,/authority\?\.userId && authority\.userId !== data\.user\.id/);
assert.match(adapter,/SESSION_IDENTITY_MISMATCH/);
assert.match(adapter,/authoritativeVerified = Boolean\(authority\?\.userId && authority\.userId === data\.user\.id\)/);
assert.match(adapter,/if \(requireVerified && !principal\.verified\) return fail\("ACCOUNT_VERIFICATION_REQUIRED"\)/);
assert.match(generate,/getBuilderPrincipal\(\{requireVerified:true\}\)/,"Generate must retain the verified-account server gate");

console.log("✓ Home + Create use LANERIQ Session authority instead of stale browser provider getSession state");
console.log("✓ Same-user LANERIQ verification satisfies Builder verification while identity mismatch and unverified accounts still fail closed");
console.log("✓ Create retries reuse a stable generation request ID and private recovery drafts are cleared on logout");
console.log("✓ Permission/feature 403 responses are no longer silently converted into authentication redirects");
