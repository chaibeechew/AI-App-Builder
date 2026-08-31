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

const route=fs.readFileSync("app/api/apps/[id]/publishing-agent/route.js","utf8");
const panel=fs.readFileSync("app/publish/[id]/PublishingReadinessPanel.js","utf8");
const layout=fs.readFileSync("app/publish/[id]/layout.js","utf8");
assert.match(route,/buildStoreReadiness/);
assert.match(route,/asset_library/);
assert.match(route,/readyForOfficialSubmission: false/);
assert.match(route,/signing credentials/);
assert.match(panel,/STORE READINESS/);
assert.match(panel,/AI can prepare/);
assert.match(panel,/Customer confirm/);
assert.match(panel,/External step/);
assert.match(panel,/Create Icon \/ Screenshots/);
assert.match(panel,/Official App Store \/ Google Play submission remains/);
assert.match(layout,/PublishingReadinessPanel/);

console.log("✓ Publishing Agent checks icon, screenshots, customer declarations, device-permission purposes and Apple/Android external release requirements without claiming official submission success");
