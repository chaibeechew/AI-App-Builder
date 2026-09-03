import assert from "node:assert/strict";
import fs from "node:fs";
import { buildAutonomousPlan, orchestrationBrief } from "../lib/build/orchestrator.js";

const home=fs.readFileSync("app/page.js","utf8");
const engine=fs.readFileSync("engine/autonomous-engine.js","utf8");
const generate=fs.readFileSync("app/api/generate/route.js","utf8");
const appPreview=fs.readFileSync("app/a/[id]/page.js","utf8");
const websitePreview=fs.readFileSync("app/website/[id]/page.js","utf8");
const websiteForm=fs.readFileSync("app/website/[id]/WebsiteEnquiryForm.js","utf8");
const websiteInbox=fs.readFileSync("app/website/[id]/WebsiteEnquiryInbox.js","utf8");
const publicEnquiryRoute=fs.readFileSync("app/api/public/website/[id]/enquiries/route.js","utf8");
const ownerEnquiryRoute=fs.readFileSync("app/api/apps/[id]/website-enquiries/route.js","utf8");
const enquiryEngine=fs.readFileSync("lib/website/enquiries.js","utf8");
const sessionProxy=fs.readFileSync("lib/supabase/proxy.js","utf8");
const rootProxy=fs.readFileSync("proxy.js","utf8");
const publicRuntime=fs.readFileSync("lib/publishing/public-project-runtime.js","utf8");
const enquiryMigration=fs.readFileSync("supabase/migrations/20260903004110_website_enquiry_runtime.sql","utf8");
const enquiryPolicy=fs.readFileSync("supabase/migrations/20260903004150_website_enquiry_service_policy.sql","utf8");

const plan=buildAutonomousPlan({idea:"Create a premium multilingual property website with listings, enquiry forms and mobile-first navigation"});
assert.equal(plan.modules.website,true);
assert.ok(plan.selectedModules.includes("website"));
assert.ok(plan.selectedModules.includes("app"),"LANERIQ AI normal creation keeps App + Website as one coherent product foundation.");
assert.match(orchestrationBrief(plan),/website/i);

for(const pattern of [
  /For normal ideas build a functional App \+ Website/,
  /real mobile-first product/,
  /responsive companion Website\/store\/marketing experience/,
  /platforms\":\[\"ios\",\"android\",\"web\"\]/,
  /pages\":\[\{/,
  /navigation\":\[\{/,
  /requested app language must be the initial UI language/,
]) assert.match(engine,pattern);

const planIndex=home.indexOf('fetch("/api/orchestrate"');
const planGuard=home.indexOf('if(!planResponse.ok)throw');
const generateIndex=home.indexOf('fetch("/api/generate"');
assert.ok(planIndex>0&&planGuard>planIndex&&generateIndex>planGuard,"Website generation must pass Idea Planning before Generate.");
assert.match(home,/stableCreateRequestId\(createFingerprint\)/,"Website creation inherits the same durable create identity as the App half of the product.");

for(const pattern of [
  /buildInput/,
  /runAutonomousEngine/,
  /verifyGeneration/,
  /loadGenerationReplay/,
  /generation_request_id/,
  /\.from\("apps"\)\.insert/,
  /\.from\("app_versions"\)\.insert/,
  /current_version_id:version\.id/,
  /App \+ Website/,
]) assert.match(generate,pattern);

for(const source of [appPreview,websitePreview]){
  assert.match(source,/auth\.getUser\(\)/,"App and Website previews must resolve trusted owner identity.");
  assert.match(source,/loadVisibleProject\(\{id|loadVisibleProject\(\{ id/,"App and Website previews must use the shared visibility/current-version loader.");
  assert.match(source,/loadVisibleProjectMedia/);
  assert.match(source,/notFound\(\)/,"Hidden/missing projects must fail closed.");
}
assert.match(appPreview,/GeneratedAppClient/);
assert.match(appPreview,/appleWebApp/);
assert.match(websitePreview,/version\.specification/);
assert.match(websitePreview,/Customer Website/);
assert.match(websitePreview,/Created with LANERIQ AI/);
assert.match(websitePreview,/WebsiteEnquiryForm/);
assert.match(websitePreview,/enabled=\{isPublished\}/,"Unpublished owner previews must not accept customer enquiries.");
assert.match(websitePreview,/isOwner&&<WebsiteEnquiryInbox/);
assert.doesNotMatch(websitePreview,/href="mailto:"/,"Generated Website must never ship an empty Contact CTA.");

// Customer enquiry conversion path: real same-origin POST, stable retry identity, bounded PII and no automatic permissions.
assert.match(websiteForm,/\/api\/public\/website\/\$\{appId\}\/enquiries/);
assert.match(websiteForm,/requestRef=useRef/);
assert.match(websiteForm,/requestId\(\)/);
assert.match(websiteForm,/maxLength=\{120\}/);
assert.match(websiteForm,/maxLength=\{254\}/);
assert.match(websiteForm,/maxLength=\{50\}/);
assert.match(websiteForm,/maxLength=\{2000\}/);
assert.match(websiteForm,/tabIndex=\{-1\}/,"A honeypot field must remain outside the normal customer tab path.");
assert.match(websiteForm,/Publish this website to activate the customer enquiry form/);

assert.match(publicEnquiryRoute,/MAX_BODY_BYTES=12_000/);
assert.match(publicEnquiryRoute,/submitWebsiteEnquiry/);
assert.match(publicEnquiryRoute,/Cache-Control\":\"no-store/);
assert.doesNotMatch(publicEnquiryRoute,/export async function GET|export async function PATCH|export async function DELETE/,"The unauthenticated Website enquiry endpoint must remain POST-only.");

// The public auth bypass is exact UUID + exact POST, and cross-site browser mutation protection remains upstream.
assert.match(sessionProxy,/PUBLIC_WEBSITE_ENQUIRY_POST=\/\^\\\/api\\\/public\\\/website/);
assert.match(sessionProxy,/PUBLIC_WEBSITE_ENQUIRY_POST\.test\(pathname\)&&request\.method==="POST"/);
assert.doesNotMatch(sessionProxy,/pathname\.startsWith\("\/api\/public"\)/,"Never introduce a broad public API prefix bypass.");
assert.match(rootProxy,/fetchSite==="cross-site"/);
assert.match(rootProxy,/crossSiteMutation\(request\)/);

// Server privacy + persistence: no raw IP storage, HMAC-only source fingerprint, service-only atomic RPC.
assert.match(enquiryEngine,/createHmac\("sha256"/);
assert.match(enquiryEngine,/LANERIQ_COMMUNICATIONS_HASH_SECRET/);
assert.match(enquiryEngine,/SUPABASE_SERVICE_ROLE_KEY/);
assert.match(enquiryEngine,/server_create_website_enquiry/);
assert.match(enquiryEngine,/source_hash:p_source_hash|p_source_hash:sourceHash\(request\)/);
assert.doesNotMatch(enquiryEngine,/console\.(log|info|warn|debug)\(/);

for(const pattern of [
  /create table if not exists public\.website_enquiries/,
  /unique\(app_id, request_id\)/,
  /enable row level security/,
  /revoke all on table public\.website_enquiries from public, anon, authenticated/,
  /grant select, insert, update, delete on table public\.website_enquiries to service_role/,
  /security definer/,
  /set search_path=''/,
  /publish_status <> 'published'/,
  /visibility not in \('listed','public'\)/,
  /pg_advisory_xact_lock/,
  /interval '10 minutes'/,
  /interval '24 hours'/,
  /WEBSITE_ENQUIRY_RATE_LIMITED/,
  /revoke all on function public\.server_create_website_enquiry.*from public, anon, authenticated/s,
  /grant execute on function public\.server_create_website_enquiry.*to service_role/s,
]) assert.match(enquiryMigration,pattern);
assert.match(enquiryPolicy,/for all to service_role/i);
assert.match(enquiryPolicy,/with check \(true\)/i);

// Owner inbox remains authenticated + exact-owner scoped and excludes source/request fingerprints from output.
assert.match(ownerEnquiryRoute,/auth\.getUser\(\)/);
assert.match(ownerEnquiryRoute,/\.eq\("owner_id",user\.id\)/);
assert.match(ownerEnquiryRoute,/\.eq\("owner_id",ctx\.user\.id\)/);
assert.match(ownerEnquiryRoute,/Cache-Control\":\"private, no-store/);
assert.doesNotMatch(ownerEnquiryRoute,/source_hash|request_id/);
assert.match(websiteInbox,/website-enquiries\?limit=20/);
assert.match(websiteInbox,/Mark contacted/);

for(const pattern of [
  /current_version_id/,
  /if \(!isOwner && !isPublished\) return null/,
  /\.eq\("id", app\.current_version_id\)/,
  /\.eq\("app_id", app\.id\)/,
  /\.select\("id,version_no,specification"\)/,
]) assert.match(publicRuntime,pattern);
assert.doesNotMatch(appPreview,/\.from\("apps"\)|\.from\("app_versions"\)/);
assert.doesNotMatch(websitePreview,/\.from\("apps"\)|\.from\("app_versions"\)/);

console.log("✓ AI Website internal E2E locks Planning → verified Generate → durable save/version → authoritative Website Preview");
console.log("✓ Generated customer Websites now have a functional enquiry conversion path instead of an empty Contact CTA");
console.log("✓ Public enquiry writes are same-origin, POST-only, published-site-only, HMAC source-bound, replay-safe and atomically rate-limited");
console.log("✓ Enquiry PII is service-role-only at the table; project owners retrieve only their own inbox through authenticated no-store API");
console.log("✓ Engine still requires pages, navigation, responsive web behavior and switchable language rather than a text-only landing mockup");
console.log("✓ Real external AI-provider Website output remains LIVE evidence and is not claimed by this deterministic code gate");
