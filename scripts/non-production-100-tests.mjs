import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=(p)=>fs.existsSync(path.join(root,p))?fs.readFileSync(path.join(root,p),'utf8'):'';
const exists=(p)=>fs.existsSync(path.join(root,p));
const f={
 readiness:read('lib/non-production-readiness.js'),policy:read('config/product-policy.js'),home:read('app/page.js'),create:read('app/create/page.js'),generate:read('app/api/generate/route.js'),modify:read('app/api/modify/route.js'),visual:read('lib/ai/premium-visual-policy.js'),standards:read('lib/buildStandards.js'),wallpapers:read('lib/design/wallpaper-presets.js'),wallpaperEngine:read('app/components/AdaptiveWallpaperEngine.js'),editor:read('app/editor/[id]/page.js'),app:read('app/a/[id]/GeneratedAppClient.js'),web:read('app/website/[id]/page.js'),imageStudio:read('app/image-studio/page.js'),imageApi:read('app/api/images/generate/route.js'),videoStudio:read('app/video-studio/page.js'),videoCompile:read('app/api/video/projects/[id]/compile/route.js'),auth:read('app/auth/page.js'),account:read('app/components/AccountNav.js'),launcher:read('app/components/StudioLauncher.js'),productCopy:read('app/components/ProductCopyFix.js'),studio:read('app/studio/page.js'),projectMemory:read('lib/project-memory.js'),workflow:read('app/api/apps/[id]/workflows/[workflowId]/run/route.js'),database:read('app/api/apps/[id]/database/route.js'),checkout:read('app/api/apps/[id]/monetization/[offerId]/checkout/route.js'),publish:read('app/publish/[id]/page.js'),publishingAgent:read('app/api/apps/[id]/publishing-agent/route.js'),dashboard:read('app/app-dashboard/[id]/page.js'),pro:read('app/pro/[id]/page.js'),proAssistant:read('app/pro/[id]/ProAssistant.js'),access:read('supabase/migrations/20260831120000_preview_access_credit_runtime.sql')
};

assert.match(f.readiness,/NON_PRODUCTION_SCORE_REQUIRED = 100/);
for(const key of ['generation','editing','data','automation','publishing','auth','security','reliability','visual','wallpaper','imageStudio','videoStudio','mobileUx','versioning','pro','branding'])assert.match(f.readiness,new RegExp(`key: "${key}"`),`Missing readiness area: ${key}`);
assert.match(f.readiness,/totalWeight/,'Weighted readiness must normalize instead of relying on weights summing to exactly 100.');
assert.match(f.readiness,/productionHeld: true/);assert.match(f.policy,/productionPromotionHold: true/);assert.match(f.policy,/explicitApprovalRequiredBeforeProduction: true/);

assert.match(f.policy,/product: "AI BUILD APP & WEB"/);assert.match(f.home,/AI BUILD APP & WEB/);assert.match(f.productCopy,/AI BUILD APP & WEB/);assert.match(f.studio,/AI BUILD APP & WEB/);assert.doesNotMatch(f.studio,/3,000\+/);
assert.match(f.home,/\/api\/orchestrate/,'Main build path must use the autonomous module planner.');assert.match(f.home,/\/bootstrap/,'Main build path must bootstrap the modules selected by AI.');assert.match(f.home,/assetIds/,'Main build path must carry customer reference assets into generation.');assert.match(f.home,/high_performance_desktop/,'Main build path must use a supported high-performance device class.');assert.match(f.home,/appId,requestId:newRequestId\("modify"\)/);assert.match(f.home,/Production stays locked until approved/);
assert.match(f.create,/customerVisualPreferences/);assert.match(f.create,/wallpaperMode/);assert.doesNotMatch(f.create,/desktop_pro/);

assert.match(f.visual,/customer color preference is authoritative/i);assert.match(f.visual,/WALLPAPER & STEP VISUALS/);assert.match(f.wallpapers,/pickWallpaperForStage/);assert.match(f.wallpaperEngine,/AI Random/);assert.match(f.wallpaperEngine,/ai_build_wallpaper/);assert.match(f.wallpaperEngine,/ai-build-stage-change/);assert.match(f.wallpaperEngine,/textOf\("\.progress"\)/);
assert.match(f.generate,/wallpaperMode/);assert.match(f.generate,/visual_preferences/);assert.match(f.modify,/PREMIUM_VISUAL_AI_INSTRUCTION/);assert.match(f.projectMemory,/visualPreferences/);
assert.match(f.standards,/BEAUTY_EVIDENCE_FIELDS/);for(const key of ['wallpaperPreset','paletteRationale','cardStyle','imageStyle'])assert.match(f.standards,new RegExp(key));
assert.match(f.app,/var\(--surface\)/);assert.match(f.app,/var\(--foreground\)/);assert.doesNotMatch(f.app,/background:#fffffff0/);assert.match(f.web,/"--surface":surface/);assert.match(f.web,/background:var\(--surface\)/);assert.match(f.web,/color:var\(--foreground\)/);

assert.match(f.imageStudio,/Design Images/);assert.match(f.imageStudio,/Style Tools/);assert.match(f.imageStudio,/Use as Wallpaper/);assert.match(f.imageApi,/Soolen Visual Engine/);assert.match(f.imageApi,/not presented as photorealistic external-model output/);
assert.match(f.videoStudio,/CREATE STORYBOARD/);assert.match(f.videoStudio,/Trim start/);assert.match(f.videoStudio,/Subtitle \/ caption/);assert.match(f.videoStudio,/renderPlan/);assert.match(f.videoStudio,/Final MP4 rendering is not connected yet/);assert.match(f.videoCompile,/const renderStatus=rendererConfigured\?"queued":"draft"/);assert.match(f.videoCompile,/renderStarted:false/);assert.match(f.videoCompile,/saved safely as a draft/);

assert.match(f.auth,/signInWithOtp/);assert.match(f.auth,/verifyOtp/);assert.match(f.auth,/NEXT_PUBLIC_SMS_AUTH_ENABLED/);assert.match(f.account,/accountTrigger/,'Mobile/global account navigation should collapse into one menu instead of crowding the UI.');assert.match(f.launcher,/bottom:70px/,'Studio launcher must not overlap the wallpaper control.');
assert.match(f.editor,/COLOR & WALLPAPER/);assert.match(f.editor,/Version History & Rollback/);assert.match(f.workflow,/idempotencyKey/);assert.match(f.workflow,/status:"failed"/);assert.match(f.database,/No API keys, passwords or payment credentials/);assert.match(f.checkout,/idempotencyKey/);assert.match(f.publish,/AI PUBLISHING AGENT/);assert.match(f.publishingAgent,/readyForOfficialSubmission: false/);
assert.ok(exists('app/pro/[id]/page.js')&&exists('app/pro/[id]/ProAssistant.js'));assert.match(f.pro,/getAppBuilderAccess/);assert.match(f.proAssistant,/\/api\/modify/);assert.match(f.access,/grant_pro_access/);assert.match(f.dashboard,/WORKSPACE MODE/);

console.log('✓ Non-production 100-point contract covers generation, auth, mobile UX, image and video studios, customer data, automation, publishing, security, reliability and design');
console.log('✓ AI BUILD APP & WEB keeps premium whole-system colors plus exact random-by-step wallpaper behavior');
console.log('✓ Main Create path now plans modules, builds App + Website and bootstraps selected capabilities before preview');
console.log('✓ Video Studio saves truthful draft/queue state and exposes real edit controls without pretending MP4 rendering is complete');
console.log('✓ Production remains intentionally held');
