import assert from "node:assert/strict";
import fs from "node:fs";
import {
  STORE_METADATA_DRAFT_MAX_BYTES,
  STORE_METADATA_SAVE_MAX_BYTES,
  STORE_METADATA_APPROVAL_MAX_BYTES,
  STORE_DECLARATIONS_MAX_BYTES,
  readBoundedStoreJson,
  sanitizeStoreCustomerAnswers,
  sanitizeStoreListingPayload,
} from "../lib/publishing/store-metadata-safety.js";

const read=(file)=>fs.readFileSync(file,"utf8");
const draft=read("app/api/store-metadata/route.js");
const save=read("app/api/store-metadata/save/route.js");
const approve=read("app/api/store-metadata/approve/route.js");
const agent=read("app/api/apps/[id]/publishing-agent/route.js");
const builderDomain=read("lib/cloud/builder-projects.js");
const builderAdapter=read("lib/cloud-adapters/builder-project-data.js");
const productionWorkflow=read(".github/workflows/production-mobile-browser-qa.yml");

assert.equal(STORE_METADATA_DRAFT_MAX_BYTES,24*1024);
assert.equal(STORE_METADATA_SAVE_MAX_BYTES,32*1024);
assert.equal(STORE_METADATA_APPROVAL_MAX_BYTES,4*1024);
assert.equal(STORE_DECLARATIONS_MAX_BYTES,12*1024);

const hostileAnswers={privacyPolicyUrl:" https://example.com/privacy ",supportEmail:"support@example.com",loginRequired:true,unknown:"x",nested:{secret:"never"}};
for(let i=0;i<200;i++)hostileAnswers[`junk_${i}`]="x".repeat(50);
const answers=sanitizeStoreCustomerAnswers(hostileAnswers);
assert.equal(answers.privacyPolicyUrl,"https://example.com/privacy");
assert.equal(answers.supportEmail,"support@example.com");
assert.equal(answers.loginRequired,true);
assert.equal("unknown" in answers,false);
assert.equal(Object.keys(answers).some(key=>key.startsWith("junk_")),false);

const listing=sanitizeStoreListingPayload({
  apple:{name:"Demo",description:"A".repeat(9000),unknown:{nested:"drop"}},
  googlePlay:{title:"Demo",fullDescription:"B".repeat(9000),dataSafety:{collectsData:true,sharesData:false,unknown:{deep:"drop"}}},
  checklist:Array.from({length:100},(_,i)=>({field:`Field ${i}`,required:true,value:i===0?"v".repeat(900):"ok",unknown:"drop"})),
});
assert.equal(listing.apple.description.length,4000);
assert.equal(listing.googlePlay.fullDescription.length,4000);
assert.equal(listing.checklist.length,40);
assert.equal(listing.checklist[0].value.length,600);
assert.equal("unknown" in listing.apple,false);
assert.equal("unknown" in listing.googlePlay.dataSafety,false);
assert.equal("unknown" in listing.checklist[0],false);
assert.throws(()=>sanitizeStoreListingPayload({
  apple:{description:"A".repeat(9000)},
  googlePlay:{fullDescription:"B".repeat(9000)},
  checklist:Array.from({length:40},(_,i)=>({field:`Field ${i}`,required:true,value:"v".repeat(900)})),
}),/STORE_LISTING_TOO_LARGE/,"Normalized listing must fail closed when the persisted JSON still exceeds the 24 KB storage budget.");

const oversized=new Request("https://laneriq.invalid/api/store-metadata",{method:"POST",headers:{"content-type":"application/json","content-length":String(STORE_METADATA_DRAFT_MAX_BYTES+1)},body:"{}"});
const oversizedResult=await readBoundedStoreJson(oversized,STORE_METADATA_DRAFT_MAX_BYTES);
assert.equal(oversizedResult.ok,false);
assert.equal(oversizedResult.status,413);

// Direct-provider store routes authenticate locally; migrated save authenticates through LANERIQ Cloud.
for(const [name,source,limitPattern] of [
  ["draft",draft,/STORE_METADATA_DRAFT_MAX_BYTES/],
  ["approval",approve,/STORE_METADATA_APPROVAL_MAX_BYTES/],
  ["publishing declarations",agent,/STORE_DECLARATIONS_MAX_BYTES/],
]){
  assert.match(source,/auth\.getUser\(\)/,`${name} must authenticate before mutation/read`);
  assert.match(source,/readBoundedStoreJson/,`${name} must parse through bounded JSON`);
  assert.match(source,limitPattern,`${name} must use its explicit request-size budget`);
  assert.match(source,/private, no-store, max-age=0/,`${name} must return private no-store responses`);
}
assert.match(save,/lib\/cloud\/builder-projects\.js/,"Store save must cross the LANERIQ Cloud Builder Project boundary.");
assert.match(save,/getBuilderPrincipal\(\{requireVerified:true\}\)/,"Store save must require a verified Cloud principal before reading the request body.");
assert.match(save,/readBoundedStoreJson/,"Store save must parse through bounded JSON.");
assert.match(save,/STORE_METADATA_SAVE_MAX_BYTES/,"Store save must preserve its explicit request-size budget.");
assert.match(save,/private, no-store, max-age=0/,"Store save must return private no-store responses.");
assert.doesNotMatch(save,/lib\/supabase\/|@supabase\/|createAdminClient/,"Store save route must not directly import or receive provider admin access.");
assert.ok(save.indexOf("getBuilderPrincipal({requireVerified:true})")<save.indexOf("const parsed=await readBoundedStoreJson"),"Store save must authenticate before parsing/mutation work.");

assert.match(draft,/sanitizeStoreDraftInput/);
assert.match(draft,/customerAnsweredFields: Object\.keys\(customerAnswers\)/);
assert.doesNotMatch(draft,/Object\.keys\(body\?\.customerAnswers|Object\.keys\(body\.customerAnswers/);

// Route owns request normalization; Cloud adapter owns principal/ownership/version checks and the privileged write.
for(const pattern of [
  /isStoreUuid\(appId\)/,
  /isStoreUuid\(versionId\)/,
  /sanitizeStoreListingPayload/,
  /saveBuilderStoreListing/,
  /readyForOfficialSubmission:false/,
])assert.match(save,pattern);
assert.match(builderDomain,/saveBuilderStoreListing/);
assert.doesNotMatch(builderDomain,/lib\/supabase\/|@supabase\/|createAdminClient/);
const saveStart=builderAdapter.indexOf('async saveStoreListing');
assert.ok(saveStart>=0,"Builder provider adapter must expose store-listing persistence.");
const saveBlock=builderAdapter.slice(saveStart);
assert.match(saveBlock,/resolvePrincipal\(client, \{ requireVerified: true \}\)/,"Store adapter must re-authenticate and require verification.");
assert.match(saveBlock,/\.eq\("id", appId\)\.eq\("owner_id", userId\)/,"Store adapter must bind the project to the current owner.");
assert.match(saveBlock,/project\.current_version_id !== versionId/,"Store adapter must pin the exact current version before privileged write.");
assert.match(saveBlock,/\.eq\("id", versionId\)\.eq\("app_id", appId\)/,"Store adapter must verify the exact app/version chain.");
assert.match(saveBlock,/const admin = createAdminClient\(\)/,"Provider admin escalation must exist only behind the adapter boundary.");
assert.match(saveBlock,/admin\.from\("store_listings"\)\.upsert/,"Store listing privileged write must be isolated behind the adapter.");
for(const pattern of [/apple: normalized\.apple/,/google_play: normalized\.googlePlay/,/checklist: normalized\.checklist/,/customer_approved_at: null/])assert.match(saveBlock,pattern);
assert.doesNotMatch(saveBlock,/body\?\.(?:apple|googlePlay|checklist)/,"Provider adapter must never write raw request metadata after normalization.");
assert.ok(saveBlock.indexOf('resolvePrincipal')<saveBlock.indexOf('createAdminClient()'),"Store adapter must authenticate/verify before service-role escalation.");

for(const pattern of [
  /verified\(user\)/,
  /isStoreUuid\(listingId\)/,
  /app\.current_version_id !== listing\.version_id/,
  /listing\.customer_approved_at\|\|new Date\(\)\.toISOString\(\)/,
  /replayed:Boolean\(listing\.customer_approved_at\)/,
  /readyForOfficialSubmission:false/,
])assert.match(approve,pattern);

for(const pattern of [
  /verified\(user\)/,
  /readBoundedStoreJson\(request,STORE_DECLARATIONS_MAX_BYTES\)/,
  /sanitizeMemoryJson\(existing\?\.memory_json\)/,
  /sanitizeMemoryJson\(\{\.\.\.memory,storePublishingDeclarations:declarations\}\)/,
  /readyForOfficialSubmission:false/,
  /Official store-console declarations are still not submitted/,
])assert.match(agent,pattern);
assert.doesNotMatch(agent,/memory_json:\{\.\.\.memory,storePublishingDeclarations:declarations\}/,"Publishing declarations must re-sanitize the full memory object before persistence.");

for(const pattern of [/LANERIQ_EXPECTED_SHA:/,/production-store-boundary-qa\.mjs/,/production-mobile-browser-qa\.mjs/])assert.match(productionWorkflow,pattern);
assert.ok(productionWorkflow.indexOf("production-store-boundary-qa.mjs")<productionWorkflow.indexOf("production-mobile-browser-qa.mjs"),"Store-boundary Production proof must run before browser-emulation QA.");

console.log("✓ Store metadata draft input is bounded and customerAnswers are allowlisted before output generation");
console.log("✓ Store save route is provider-opaque; sanitized payload crosses LANERIQ Cloud only after verified principal resolution");
console.log("✓ Builder adapter re-verifies identity, owner and exact version before isolated service-role store persistence");
console.log("✓ Store approval is bounded, UUID-scoped, verified-account gated and idempotent without claiming official submission");
console.log("✓ Publishing declarations are private/no-store, bounded and re-sanitized through Project Memory before persistence");
console.log("✓ Exact-SHA Production store-boundary proof remains chained before browser emulation; OFFICIAL_STORE is still separate evidence");
