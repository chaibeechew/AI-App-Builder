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
const layout=fs.readFileSync("app/publish/[id]/layout.js","utf8");
const saveRoute=fs.readFileSync("app/api/store-metadata/save/route.js","utf8");
const approveRoute=fs.readFileSync("app/api/store-metadata/approve/route.js","utf8");
const publishRoute=fs.readFileSync("app/api/publish/request/route.js","utf8");
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
assert.match(layout,/PublishingReadinessPanel/);
for(const source of [saveRoute,approveRoute,publishRoute])assert.match(source,/createAdminClient/);
assert.match(saveRoute,/owner_id", user\.id/);
assert.match(approveRoute,/owner_id", user\.id/);
assert.match(approveRoute,/current_version_id !== listing\.version_id/);
assert.match(publishRoute,/owner_id", user\.id/);
assert.match(publishRoute,/customer_approved_at/);
assert.doesNotMatch(approveRoute,/\.rpc\("approve_store_listing"/);
assert.doesNotMatch(migration,/security definer/i);
assert.doesNotMatch(migration,/approve_store_listing/);
assert.match(migration,/revoke all on public\.store_listings from anon, authenticated/);
assert.match(migration,/grant select on public\.store_listings to authenticated/);

console.log("✓ Publishing Agent checks icon, screenshots, customer declarations, device-permission purposes and Apple/Android external release requirements without claiming official submission success");
console.log("✓ Customer can resolve Terms and permission-purpose gaps in project memory while official age-rating/store submission remain external evidence");
console.log("✓ Store listing approval, metadata saves and publish-request writes are owner-verified server-only operations; public client tables remain read-only");
