import assert from "node:assert/strict";
import fs from "node:fs";
import { buildStoreReadiness, classifyStoreAssets, detectPermissionNeeds } from "../lib/publishing/store-readiness-policy.js";

const permissions=detectPermissionNeeds({features:["Camera property scanner","Voice recording","Nearby GPS map"]});
for(const key of ["camera","microphone","location"])assert.ok(permissions.some(item=>item.key===key),`Missing detected permission: ${key}`);

const assetState=classifyStoreAssets([
  {file_name:"app-icon.png",mime_type:"image/png",category:"icon"},
  {file_name:"iphone-store-screenshot-1.png",mime_type:"image/png",category:"screenshot"},
  {file_name:"android-store-screenshot-2.png",mime_type:"image/png",category:"screenshot"},
]);
assert.equal(assetState.iconReady,true);
assert.equal(assetState.screenshotsReady,true);

const missing=buildStoreReadiness({specification:{features:["Camera upload"]},listing:null,assets:[],inferredAnswers:{}});
assert.equal(missing.readyForOfficialSubmission,false);
assert.ok(missing.preparable.some(item=>item.key==="app_icon"));
assert.ok(missing.preparable.some(item=>item.key==="screenshots"));
assert.ok(missing.customerRequired.some(item=>item.key==="privacy_policy"));
assert.ok(missing.customerRequired.some(item=>item.key==="age_rating"));
assert.ok(missing.customerRequired.some(item=>item.key==="terms"));
assert.ok(missing.customerRequired.some(item=>item.key==="permission_camera"));
assert.ok(missing.externalRequired.some(item=>item.key==="apple_bundle"));
assert.ok(missing.externalRequired.some(item=>item.key==="android_package"));

const prepared=buildStoreReadiness({
  specification:{pages:[{name:"Home",route:"/"}]},
  listing:{apple:{name:"Demo",description:"A real description",privacyUrl:"https://example.com/privacy",supportUrl:"https://example.com/support"},google_play:{title:"Demo",fullDescription:"A real description"}},
  assets:[
    {file_name:"app-icon.png",mime_type:"image/png",category:"icon"},
    {file_name:"store-screenshot-1.png",mime_type:"image/png",category:"screenshot"},
    {file_name:"store-screenshot-2.png",mime_type:"image/png",category:"screenshot"},
  ],
  inferredAnswers:{supportEmail:"support@example.com",supportUrl:"https://example.com/support",privacyPolicyUrl:"https://example.com/privacy",targetAudience:"Adults 18+"},
});
assert.ok(prepared.checks.find(item=>item.key==="app_icon")?.status==="ready");
assert.ok(prepared.checks.find(item=>item.key==="screenshots")?.status==="ready");
assert.equal(prepared.readyForOfficialSubmission,false,"Store accounts/signing/declarations must never be auto-claimed as submitted");

const customerPrepared=buildStoreReadiness({
  specification:{features:["Camera property scanner"]},
  listing:{apple:{name:"Demo",description:"Description",privacyUrl:"https://example.com/privacy",supportUrl:"https://example.com/support"},google_play:{title:"Demo",fullDescription:"Description"}},
  assets:[{file_name:"app-icon.png",mime_type:"image/png",category:"icon"},{file_name:"store-screenshot-1.png",mime_type:"image/png",category:"screenshot"},{file_name:"store-screenshot-2.png",mime_type:"image/png",category:"screenshot"}],
  inferredAnswers:{supportEmail:"support@example.com",supportUrl:"https://example.com/support",privacyPolicyUrl:"https://example.com/privacy",targetAudience:"Adults 18+"},
  customerDeclarations:{termsChoice:"platform_default",ageRatingAcknowledged:true,permissionPurposes:{camera:"Customer scans a property QR code after tapping Scan."}},
});
assert.equal(customerPrepared.checks.find(item=>item.key==="terms")?.status,"ready");
assert.equal(customerPrepared.checks.find(item=>item.key==="permission_camera")?.status,"ready");
assert.equal(customerPrepared.checks.find(item=>item.key==="age_rating")?.status,"external_required");
assert.equal(customerPrepared.readyForOfficialSubmission,false);

const route=fs.readFileSync("app/api/apps/[id]/publishing-agent/route.js","utf8");
const panel=fs.readFileSync("app/publish/[id]/PublishingReadinessPanel.js","utf8");
const mount=fs.readFileSync("app/components/PublishingReadinessMount.js","utf8");
const rootLayout=fs.readFileSync("app/layout.js","utf8");
const saveRoute=fs.readFileSync("app/api/store-metadata/save/route.js","utf8");
const approveRoute=fs.readFileSync("app/api/store-metadata/approve/route.js","utf8");
const publishRoute=fs.readFileSync("app/api/publish/request/route.js","utf8");
const builderDomain=fs.readFileSync("lib/cloud/builder-projects.js","utf8");
const builderAdapter=fs.readFileSync("lib/cloud-adapters/builder-project-data.js","utf8");
const migration=fs.readFileSync("supabase/migrations/20260827080003_store_publish_foundation.sql","utf8");
assert.match(route,/buildStoreReadiness/);
assert.match(route,/asset_library/);
assert.match(route,/suggested_page,suggested_role,placement_reason/);
assert.doesNotMatch(route,/asset_id,placement,/);
assert.match(route,/readyForOfficialSubmission: false/);
assert.match(route,/signing credentials/);
assert.match(route,/export async function POST/);
assert.match(route,/storePublishingDeclarations/);
assert.match(route,/Official store-console declarations are still not submitted/);
assert.match(panel,/STORE READINESS/);
assert.match(panel,/AI can prepare/);
assert.match(panel,/Customer confirm/);
assert.match(panel,/External step/);
assert.match(panel,/Create Icon \/ Screenshots/);
assert.match(panel,/Permission purposes/);
assert.match(panel,/Terms \/ EULA/);
assert.match(panel,/Save My Declarations/);
assert.match(panel,/Nothing was submitted to Apple or Google/i);
assert.match(panel,/Official App Store \/ Google Play submission remains/);
assert.match(mount,/usePathname/);
assert.match(mount,/^.*\/publish\\\//m);
assert.match(mount,/PublishingReadinessPanel/);
assert.match(rootLayout,/PublishingReadinessMount/);
assert.equal(fs.existsSync("app/publish/[id]/layout.js"),false,"Publishing readiness must not add a dynamic server layout/function");

// Store metadata save and final publish preparation have migrated behind LANERIQ Cloud; approval remains an explicit owner-verified server-only write.
assert.match(saveRoute,/getBuilderPrincipal\(\{requireVerified:true\}\)/);
assert.match(saveRoute,/saveBuilderStoreListing/);
assert.doesNotMatch(saveRoute,/createAdminClient|lib\/supabase\//);
assert.match(approveRoute,/createAdminClient/);
assert.match(approveRoute,/owner_id", user\.id/);
assert.match(approveRoute,/current_version_id !== listing\.version_id/);
assert.match(publishRoute,/getBuilderPrincipal\(\{requireVerified:true\}\)/);
assert.match(publishRoute,/loadBuilderPublishPreparation/);
assert.match(publishRoute,/createBuilderStorePublishRequest/);
assert.doesNotMatch(publishRoute,/createAdminClient|lib\/supabase\/|server_create_store_publish_request/);
assert.match(publishRoute,/customer_approved_at/);
assert.match(builderDomain,/saveBuilderStoreListing/);
assert.match(builderDomain,/loadBuilderPublishPreparation/);
assert.match(builderDomain,/createBuilderStorePublishRequest/);

// Final preparation request must re-evaluate authoritative readiness from Cloud-loaded owner-scoped context instead of trusting browser state.
for(const pattern of [
  /buildStoreReadiness/,
  /evaluateAuthoritativeStoreReadiness/,
  /storePublishingDeclarations/,
  /targetMetadataReady/,
  /STORE_PLATFORM_METADATA_INCOMPLETE/,
  /STORE_REVIEW_NOT_READY/,
  /readyForCustomerReview:false/,
  /readyForOfficialSubmission:false/,
  /officialSubmissionConfirmed:false/,
  /externalSigningVerified:false/,
  /providerReference:null/,
  /storeReviewVerified:false/,
]) assert.match(publishRoute,pattern);
const loadBlock=builderAdapter.slice(builderAdapter.indexOf('async loadPublishPreparation'),builderAdapter.indexOf('async createStorePublishRequest'));
const createBlock=builderAdapter.slice(builderAdapter.indexOf('async createStorePublishRequest'),builderAdapter.indexOf('async saveStoreListing'));
const saveBlock=builderAdapter.slice(builderAdapter.indexOf('async saveStoreListing'));
for(const pattern of [/resolvePrincipal\(client, \{ requireVerified: true \}\)/,/\.eq\("id", appId\)\.eq\("owner_id", userId\)/,/project_assets/,/asset_library/,/project_memory/,/store_listings/])assert.match(loadBlock,pattern);
assert.match(createBlock,/resolvePrincipal\(client, \{ requireVerified: true \}\)/);
assert.match(createBlock,/createAdminClient\(\)/);
assert.match(createBlock,/server_create_store_publish_request/);
assert.ok(createBlock.indexOf('resolvePrincipal')<createBlock.indexOf('createAdminClient()'));
assert.match(saveBlock,/\.eq\("id", appId\)\.eq\("owner_id", userId\)/);
assert.match(saveBlock,/current_version_id !== versionId/);
assert.match(saveBlock,/createAdminClient\(\)/);
assert.ok(publishRoute.indexOf("evaluateAuthoritativeStoreReadiness") < publishRoute.lastIndexOf("createBuilderStorePublishRequest"),"Authoritative Store Readiness must run before Cloud publish-request persistence.");
assert.doesNotMatch(publishRoute,/readyForOfficialSubmission:true|officialSubmissionConfirmed:true|externalSigningVerified:true|storeReviewVerified:true/,"Preparation must never auto-claim official store submission, signing or review success.");

assert.doesNotMatch(approveRoute,/\.rpc\("approve_store_listing"/);
assert.doesNotMatch(migration,/security definer/i);
assert.doesNotMatch(migration,/approve_store_listing/);
assert.match(migration,/revoke all on public\.store_listings from anon, authenticated/);
assert.match(migration,/grant select on public\.store_listings to authenticated/);

console.log("✓ Publishing Agent checks icon, screenshots, customer declarations, device-permission purposes and Apple/Android external release requirements without claiming official submission success");
console.log("✓ Customer can resolve Terms and permission-purpose gaps in project memory while official age-rating/store submission remain external evidence");
console.log("✓ Final publish-preparation API re-evaluates exact-version Store Readiness before provider-opaque Cloud persistence");
console.log("✓ Store preparation response explicitly keeps official submission, external signing, provider reference and store review unverified");
console.log("✓ Cloud adapter re-authenticates owner/version context before metadata/publish service-role writes; approval remains explicit owner-verified server-only");
console.log("✓ Store Readiness stays client-mounted and scoped to /publish without creating an extra dynamic Vercel function");
