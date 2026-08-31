import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.existsSync(path.join(root,p))?fs.readFileSync(path.join(root,p),'utf8'):'';
const exists=(p)=>fs.existsSync(path.join(root,p));

const files={
  readiness:read('lib/non-production-readiness.js'),
  policy:read('config/product-policy.js'),
  visualPolicy:read('lib/ai/premium-visual-policy.js'),
  wallpapers:read('lib/design/wallpaper-presets.js'),
  wallpaperEngine:read('app/components/AdaptiveWallpaperEngine.js'),
  imageStudio:read('app/image-studio/page.js'),
  imageApi:read('app/api/images/generate/route.js'),
  home:read('app/page.js'),
  create:read('app/create/page.js'),
  generate:read('app/api/generate/route.js'),
  modify:read('app/api/modify/route.js'),
  editor:read('app/editor/[id]/page.js'),
  generatedApp:read('app/a/[id]/GeneratedAppClient.js'),
  generatedWebsite:read('app/website/[id]/page.js'),
  projectMemory:read('lib/project-memory.js'),
  dashboard:read('app/app-dashboard/[id]/page.js'),
  pro:read('app/pro/[id]/page.js'),
  proAssistant:read('app/pro/[id]/ProAssistant.js'),
  proModePolicy:read('lib/pro-mode.js'),
  accessReader:read('lib/app-builder-access.js'),
  accessRuntime:read('supabase/migrations/20260831120000_preview_access_credit_runtime.sql'),
  dataPage:read('app/database/[id]/page.js'),
  connectionsPage:read('app/integrations/[id]/page.js'),
  paymentsPage:read('app/monetization/[id]/page.js'),
  workflow:read('app/api/apps/[id]/workflows/[workflowId]/run/route.js'),
  database:read('app/api/apps/[id]/database/route.js'),
  checkout:read('app/api/apps/[id]/monetization/[offerId]/checkout/route.js'),
  video:read('app/api/video/projects/[id]/compile/route.js'),
  orchestrator:read('lib/build/orchestrator.js'),
  publish:read('app/publish/[id]/page.js'),
  metadata:read('app/api/store-metadata/route.js'),
  metadataSave:read('app/api/store-metadata/save/route.js'),
  publishingAgent:read('app/api/apps/[id]/publishing-agent/route.js'),
  layout:read('app/layout.js'),
  productCopy:read('app/components/ProductCopyFix.js'),
  studio:read('app/studio/page.js'),
};

const requiredAreas=['generation','editing','data','automation','publishing','security','reliability','visual','wallpaper','imageStudio','versioning','pro','branding'];
assert.match(files.readiness,/NON_PRODUCTION_SCORE_REQUIRED = 100/);
for(const key of requiredAreas) assert.match(files.readiness,new RegExp(`key: "${key}"`),`Missing readiness area: ${key}`);
assert.match(files.readiness,/productionHeld: true/);
assert.match(files.policy,/productionPromotionHold: true/);
assert.match(files.policy,/explicitApprovalRequiredBeforeProduction: true/);

assert.match(files.policy,/product: "AI BUILD APP & WEB"/,'Canonical product name must be AI BUILD APP & WEB.');
assert.match(files.layout,/PRODUCT_BRAND\.name/,'Document metadata must use the canonical product brand.');
assert.match(files.productCopy,/AI BUILD APP & WEB/,'Legacy visible product copy must be normalized to the canonical brand.');
assert.match(files.studio,/AI BUILD APP & WEB/,'Studio must use the canonical product name.');
assert.doesNotMatch(files.studio,/3,000\+/,'Do not make an unsupported template-count claim.');

assert.match(files.home,/First project free until publish/);
assert.match(files.home,/external store fees stay separate/);
assert.match(files.home,/appId,requestId:newRequestId\("modify"\)/);
assert.match(files.home,/versionId:d\?\.version\?\.id/);
assert.match(files.home,/Production stays locked until approved/);
assert.match(files.create,/requestId:requestId\("create"\)/);
assert.match(files.create,/high_performance_desktop/);
assert.doesNotMatch(files.create,/desktop_pro/);
assert.match(files.create,/not trademark clearance/i);
assert.match(files.create,/customerVisualPreferences/,'Create must carry the customer wallpaper preference into generation.');
assert.match(files.create,/wallpaperMode/);

assert.match(files.visualPolicy,/customer color preference is authoritative/i);
assert.match(files.visualPolicy,/WALLPAPER & STEP VISUALS/);
assert.match(files.wallpapers,/WALLPAPER_PRESETS/);
assert.match(files.wallpapers,/pickWallpaperForStage/);
assert.match(files.wallpaperEngine,/MutationObserver/);
assert.match(files.wallpaperEngine,/AI Random/);
assert.match(files.wallpaperEngine,/localStorage\.setItem\(STORAGE_KEY/);
assert.match(files.wallpaperEngine,/ai_build_wallpaper/,'Wallpaper preference must bridge to server generation without exposing secrets.');
assert.match(files.editor,/COLOR & WALLPAPER/);
assert.match(files.editor,/type="color"/);
assert.match(files.editor,/WALLPAPER_PRESETS/);
assert.match(files.projectMemory,/visualPreferences/);
assert.match(files.generate,/wallpaperMode/);
assert.match(files.generate,/visual_preferences/);
assert.match(files.generate,/ai_build_wallpaper/,'Generation must honor a saved wallpaper preference even from simplified creation entry points.');
assert.match(files.modify,/PREMIUM_VISUAL_AI_INSTRUCTION/);
assert.match(files.modify,/visualPreferences/);
assert.match(files.generatedApp,/wallpaperStyle/);
assert.match(files.generatedWebsite,/wallpaperStyle/);

assert.match(files.imageStudio,/Design Images/);
assert.match(files.imageStudio,/Style Tools/);
assert.match(files.imageStudio,/Templates/);
assert.match(files.imageStudio,/Use as Wallpaper/);
assert.match(files.imageApi,/images/);
assert.match(files.imageApi,/Soolen Visual Engine/);
assert.match(files.imageApi,/not presented as photorealistic external-model output/);

assert.ok(exists('app/pro/[id]/page.js')&&exists('app/pro/[id]/ProAssistant.js'));
assert.match(files.proAssistant,/\/api\/modify/);
assert.match(files.proAssistant,/requestId/);
assert.match(files.proAssistant,/buildAutonomousPlan/);
assert.match(files.pro,/getAppBuilderAccess/);
assert.match(files.pro,/!access\.professional\.active/);
assert.match(files.pro,/US\$68 · 365 days · no auto-renew/);
assert.match(files.proModePolicy,/professionalAutoRenew: false/);
assert.match(files.proModePolicy,/priceReviewIntervalYears: 3/);
assert.match(files.proModePolicy,/priceIncreaseOptional: true/);
assert.match(files.accessReader,/pro_valid_until/);
assert.match(files.accessRuntime,/standard_project_credits/);
assert.match(files.accessRuntime,/grant_standard_project_credit/);
assert.match(files.accessRuntime,/grant_pro_access/);
assert.match(files.accessRuntime,/to service_role/);

assert.match(files.dataPage,/SOOLENAI · CUSTOMER DATA/);
assert.match(files.dataPage,/Technical details hidden/);
assert.match(files.connectionsPage,/SOOLENAI · CONNECTIONS/);
assert.match(files.connectionsPage,/SECRETS STAY SERVER-SIDE/);
assert.match(files.paymentsPage,/SOOLENAI · PAYMENTS & OFFERS/);
assert.match(files.paymentsPage,/SERVER-CHECKED PRICE/);

assert.match(files.generate,/p_request_id:chargeRequestId/);
assert.match(files.generate,/bind_app_builder_project_access/);
assert.match(files.generate,/restore_failed_app_builder_create/);
assert.match(files.modify,/p_request_id:chargeRequestId/);
assert.match(files.accessRuntime,/Refund amount does not match original charge/);
assert.match(files.accessRuntime,/credit_transactions_request_type_unique_idx/);

assert.match(files.workflow,/idempotencyKey/);
assert.match(files.workflow,/status:"failed"/);
assert.match(files.database,/No API keys, passwords or payment credentials/);
assert.match(files.checkout,/idempotencyKey/);
assert.match(files.checkout,/Offer amount is outside the supported range/);
assert.match(files.video,/serverRender:true/);
assert.match(files.video,/renderStarted:false/);
assert.match(files.orchestrator,/type:"send_whatsapp"/);
assert.doesNotMatch(files.orchestrator,/type:"whatsapp"/);

assert.match(files.metadata,/customerAnswers/);
assert.match(files.metadata,/privacyPolicyUrl/);
assert.match(files.metadata,/targetAudience/);
assert.match(files.publish,/AI Auto-Fill Store Forms/);
assert.match(files.publish,/AI PUBLISHING AGENT/);
assert.match(files.publish,/Apple Developer Program/);
assert.match(files.publish,/Google Play/);
assert.match(files.publishingAgent,/readyForOfficialSubmission: false/);
assert.match(files.metadataSave,/customer_approved_at: null/);

const dashboardHasPro=/\/pro\/\$\{id\}|\/pro\//.test(files.dashboard);
assert.equal(dashboardHasPro,true);
assert.match(files.dashboard,/getAppBuilderAccess/);
assert.match(files.dashboard,/WORKSPACE MODE/);
assert.match(files.dashboard,/STANDARD MODE · CURRENT/);
assert.match(files.dashboard,/AI handles everything for you/);
assert.match(files.dashboard,/same project and the same version history/i);

console.log('✓ Non-production 100-point contract covers every required product area');
console.log('✓ AI BUILD APP & WEB branding, premium visuals, random-by-step wallpaper and customer wallpaper choices are protected');
console.log('✓ Image Studio, no-code editing, data, automation, payments, publishing preparation and Pro access contracts are protected');
console.log('✓ Production remains intentionally held');
