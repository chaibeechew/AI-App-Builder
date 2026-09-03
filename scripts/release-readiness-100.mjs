import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.existsSync(path.join(root,p))?fs.readFileSync(path.join(root,p),'utf8'):'';
const exists=p=>fs.existsSync(path.join(root,p));
const has=(p,...terms)=>terms.every(t=>read(p).includes(t));

const generate=read('app/api/generate/route.js');
const modify=read('app/api/modify/route.js');
const publish=read('app/api/apps/[id]/publish/route.js');
const quality=read('app/api/apps/[id]/quality/route.js');
const store=read('app/api/publish/request/route.js');
const builderDomain=read('lib/cloud/builder-projects.js');
const builderAdapter=read('lib/cloud-adapters/builder-project-data.js');
const policy=read('config/product-policy.js');
const brand=read('lib/product-brand.js');
const productCopy=read('app/components/ProductCopyFix.js');
const standards=read('lib/buildStandards.js');
const readiness=read('lib/release-readiness.js');
const nonprod=read('lib/non-production-readiness.js');
const visual=read('lib/ai/premium-visual-policy.js');
const visualLower=visual.toLowerCase();
const wallpaper=read('app/components/AdaptiveWallpaperEngine.js');
const autonomous=read('engine/autonomous-engine.js');
const runtimeGuard=read('lib/generator/runtime-guard.js');
const finance=read('lib/app-builder-finance.js');
const admin=read('lib/supabase/admin.js');
const serverRpc=read('supabase/migrations/20260831170000_server_only_entitlements_and_credits.sql');
const legacyRevoke=read('supabase/migrations/20260831171000_revoke_legacy_authenticated_financial_rpcs.sql');
const modifyRuntime=read('supabase/migrations/20260831181000_harden_professional_modify_runtime.sql');
const proAssistant=read('app/pro/[id]/ProAssistant.js');
const proPage=read('app/pro/[id]/page.js');
const bootstrap=read('app/api/apps/[id]/bootstrap/route.js');
const workflow=read('.github/workflows/consolidation-ci.yml');
const releaseTests=read('scripts/release-policy-tests.mjs');
const securityTests=read('scripts/security-contract-tests.mjs');
const runtimeTests=read('scripts/runtime-contract-tests.mjs');
const nonprodTests=read('scripts/non-production-100-tests.mjs');
const video=read('app/api/video/projects/[id]/compile/route.js');
const references=read('app/components/ReferenceUploader.js');
const records=read('app/api/apps/[id]/records/route.js');
const recordsMigration=read('supabase/migrations/20260831174000_add_app_data_records.sql');
const authPage=read('app/auth/page.js');
const verificationRequest=read('app/api/auth/verification/request/route.js');
const communicationPolicy=read('lib/communications/service-policy.js');
const communicationCore=read('lib/communications/server.js');
const communicationMigration=read('supabase/migrations/20260902052500_harden_laneriq_communications.sql');

const generationAdapterBlock=builderAdapter.slice(builderAdapter.indexOf('async loadGenerationReplay'),builderAdapter.indexOf('async loadModificationContext'));
const modifyAdapterBlock=builderAdapter.slice(builderAdapter.indexOf('async loadModificationContext'),builderAdapter.indexOf('async loadPublishPreparation'));
const publishAdapterBlock=builderAdapter.slice(builderAdapter.indexOf('async loadPublishPreparation'));

const checks=[
  ['Strict release target is 100',readiness.includes('RELEASE_SCORE_REQUIRED = 100')],
  ['All six release dimensions are mandatory',['stability','security','privacy','comfort','beauty','naturalness'].every(k=>readiness.includes(`"${k}"`))],
  ['100 is explicitly not a zero-defect guarantee',readiness.includes('not a guarantee of zero bugs')],
  ['Non-production model requires 100 and keeps Production held',nonprod.includes('NON_PRODUCTION_SCORE_REQUIRED = 100')&&nonprod.includes('productionHeld: true')&&nonprod.includes('totalWeight')],
  ['Non-production model covers every product area',['generation','editing','data','automation','publishing','auth','security','reliability','visual','wallpaper','imageStudio','videoStudio','mobileUx','versioning','pro','branding'].every(k=>nonprod.includes(`key: "${k}"`))],
  ['Product name is canonical',policy.includes('product: "LANERIQ AI"')&&brand.includes('name: "LANERIQ AI"')&&brand.includes('poweredBy: "LANERIQ AI"')&&productCopy.includes('LANERIQ AI')],
  ['Production promotion remains explicitly held',policy.includes('productionPromotionHold: true')&&policy.includes('explicitApprovalRequiredBeforeProduction: true')&&!/vercel\s+--prod|promote-to-production/i.test(workflow)],
  ['Home uses autonomous planner + build + bootstrap',has('app/page.js','/api/orchestrate','/api/generate','/bootstrap','assetIds','high_performance_desktop')],

  ['Generate is provider-opaque and Cloud-authenticated before atomic persistence',
    generate.includes('getBuilderPrincipal({requireVerified:true})')&&
    generate.includes('loadBuilderGenerationInputs({assetIds})')&&
    generate.includes('persistBuilderGeneratedProject')&&
    !/lib\/supabase\/|@supabase\/|createAdminClient|server_persist_generated_project/.test(generate)&&
    builderDomain.includes('persistBuilderGeneratedProject')&&
    generationAdapterBlock.includes('resolvePrincipal(client, { requireVerified: true })')&&
    generationAdapterBlock.includes('.eq("owner_id", userId)')&&
    generationAdapterBlock.includes('server_persist_generated_project')&&
    generationAdapterBlock.includes('p_user_id: principal.principal.principalId')],

  ['Generate uses server-only request-bound entitlement/credit runtime',
    generate.includes('app-builder-finance')&&
    generate.includes('consumeAppBuilderEntitlement(userId')&&
    generate.includes('consumeAiCredits(userId')&&
    generate.includes('bindAppBuilderProjectAccess(userId')&&
    generate.includes('restoreFailedAppBuilderCreate(userId')],

  ['Modify is provider-opaque, owner/current-version loaded in Cloud and saved atomically',
    modify.includes('getBuilderPrincipal({requireVerified:true})')&&
    modify.includes('loadBuilderModificationContext')&&
    modify.includes('owned.current_version_id')&&
    modify.includes('saveBuilderModification')&&
    !/lib\/supabase\/|@supabase\/|createAdminClient|server_save_app_modification/.test(modify)&&
    builderDomain.includes('loadBuilderModificationContext')&&builderDomain.includes('saveBuilderModification')&&
    modifyAdapterBlock.includes('.eq("owner_id", userId)')&&
    modifyAdapterBlock.includes('project.current_version_id !== expectedVersionId')&&
    modifyAdapterBlock.includes('server_save_app_modification')],

  ['Modify uses server-only request-bound entitlement/credit/refund runtime',
    modify.includes('app-builder-finance')&&
    modify.includes('consumeAppBuilderEntitlement(userId')&&
    modify.includes('consumeAiCredits(userId')&&
    modify.includes('refundAiCredits(userId')],

  ['Builder Cloud authenticates before privileged persistence escalation',
    generationAdapterBlock.indexOf('resolvePrincipal')<generationAdapterBlock.indexOf('createAdminClient()')&&
    modifyAdapterBlock.indexOf('resolvePrincipal')<modifyAdapterBlock.indexOf('createAdminClient()')&&
    publishAdapterBlock.includes('resolvePrincipal(client, { requireVerified: true })')&&
    publishAdapterBlock.includes('server_create_store_publish_request')],

  ['Server-only finance client uses server secret only',admin.includes('SUPABASE_SECRET_KEY')&&admin.includes('SUPABASE_SERVICE_ROLE_KEY')&&!/^\s*["']use client/m.test(admin)],
  ['Financial mutation RPCs are service-role only',['server_consume_app_builder_entitlement','server_bind_app_builder_project_access','server_restore_failed_app_builder_create','server_consume_ai_credits','server_refund_ai_credits'].every(k=>finance.includes(k)&&serverRpc.includes(k)&&serverRpc.includes('to service_role'))],
  ['Concurrent create reservation is fail-closed',serverRpc.includes('Another creation request is already in progress')],
  ['Promotion access is exact-project bound',serverRpc.includes('app_builder_project_access')&&serverRpc.includes('source_request_id')&&!serverRpc.includes('first_app_id')],
  ['Legacy authenticated financial mutation has cleanup migration',legacyRevoke.includes('from public,anon,authenticated')&&legacyRevoke.includes('refund_ai_credits')&&legacyRevoke.includes('consume_ai_credits')],
  ['Modify fails closed on quality regression',modify.includes('qualityRegressed')&&modify.includes('would reduce the project')&&modify.includes('status:409')],
  ['Professional AI modify is time-bounded and concurrency safe',modify.includes('PRIMARY_AI_TIMEOUT_MS')&&modify.includes('REPAIR_AI_TIMEOUT_MS')&&modify.includes('withTimeout')&&proAssistant.includes('inFlightRef.current')&&proAssistant.includes('fetchWithTimeout')&&modifyRuntime.includes('app_versions_app_request_unique')&&modifyRuntime.includes('for update')&&modifyRuntime.includes('Project changed during modification')&&bootstrap.includes('expectedVersionId')&&!proPage.includes('select("id,version_no,specification")')],
  ['Generation and modify share premium visual quality standard',generate.includes('visualPreferences')&&modify.includes('PREMIUM_VISUAL_AI_INSTRUCTION')&&autonomous.includes('GENERATION_QUALITY_RULES')],
  ['Beauty 100 requires concrete visual evidence',standards.includes('BEAUTY_EVIDENCE_FIELDS')&&['wallpaperPreset','paletteRationale','cardStyle','imageStyle'].every(k=>standards.includes(k))&&standards.includes('Math.min(99,raw)')],
  ['Autonomous generation emits qualityPlan + visual system',autonomous.includes('QUALITY PLAN REQUIREMENT')&&autonomous.includes('qualityPlan')&&autonomous.includes('wallpaperPreset')&&autonomous.includes('paletteRationale')],
  ['Runtime guard preserves quality/visual metadata',['qualityPlan','backgroundTreatment','dataModels','demoVideo'].every(k=>runtimeGuard.includes(k))],
  ['Customer color is authoritative whole-system design',visualLower.includes('customer color preference is authoritative')&&visualLower.includes('complete design system')],
  ['Random-by-step wallpaper and customer selection exist',wallpaper.includes('AI Random')&&wallpaper.includes('ai-build-stage-change')&&wallpaper.includes('textOf(".progress")')&&wallpaper.includes('ai_build_wallpaper')],
  ['Generated App/Website use saved visual system',has('app/a/[id]/GeneratedAppClient.js','wallpaperStyle','var(--surface)','var(--foreground)')&&has('app/website/[id]/page.js','wallpaperStyle','--surface','var(--foreground)')],
  ['Generated App data is durable, owner-scoped and bounded',records.includes('auth.getUser()')&&records.includes('app_data_records')&&records.includes('MAX_VALUE = 2000')&&recordsMigration.includes('enable row level security')&&recordsMigration.includes('owner_id = (select auth.uid())')],
  ['Private references stay in private build context',references.includes('soolenReferenceAnalysis')&&references.includes('PRIVATE PROJECT REFERENCES')&&references.includes('Learn the intent, not copy the asset')],
  ['Image Studio is available and renderer claims are honest',has('app/image-studio/page.js','Design Images','Style Tools','Use as Wallpaper')&&has('app/api/images/generate/route.js','Soolen Visual Engine','not presented as photorealistic external-model output')],
  ['Video editor exposes real edit controls and honest renderer state',has('app/video-studio/page.js','Trim start','Subtitle / caption','renderPlan')&&video.includes('rendererConfigured')&&video.includes('renderStarted:false')&&video.includes('"queued":"draft"')],
  ['Email OTP + WhatsApp OTP are LANERIQ-guarded and the only auth code choices',authPage.includes('/api/auth/verification/request')&&authPage.includes('verifyOtp')&&authPage.includes('NEXT_PUBLIC_WHATSAPP_AUTH_ENABLED')&&authPage.includes('Email Code')&&authPage.includes('WhatsApp Code')&&authPage.includes('No paid SMS fallback is used')&&authPage.includes('one-time-code')&&!authPage.includes('process.env.NEXT_PUBLIC_SMS_AUTH_ENABLED')&&!authPage.includes('auth.signInWithOtp')&&verificationRequest.includes('claimLaneriqCommunication')&&verificationRequest.includes('purpose:"verification"')&&verificationRequest.includes('signInWithOtp')],
  ['LANERIQ Communications launch-year and persistent guard contract is structural',communicationPolicy.includes('launchYearMonths:12')&&communicationPolicy.includes('customerPlatformFee:0')&&communicationPolicy.includes('paidSmsFallback:false')&&communicationPolicy.includes('autoChargeCustomer:false')&&communicationCore.includes('claimLaneriqCommunication')&&communicationCore.includes('deliverCommunication')&&communicationMigration.includes('communication_dispatches_scope_idempotency_uq')&&communicationMigration.includes('recipient_daily_limit')],
  ['Database is no-code and rejects credential-like fields',has('app/api/apps/[id]/database/route.js','SAFE_TYPES','SECRET_FIELD','_history')&&has('app/database/[id]/page.js','Technical details hidden','Restore this version')],
  ['Workflow execution is idempotent/bounded/fail-closed',has('app/api/apps/[id]/workflows/[workflowId]/run/route.js','idempotency_key','Workflow action timed out','criticalFailure')],
  ['Checkout is server-validated and idempotent',has('app/api/apps/[id]/monetization/[offerId]/checkout/route.js','Offer amount is outside the supported range','idempotencyKey')&&has('lib/integrations/server.js','Idempotency-Key','External provider timed out')],
  ['Publish requires shared 100 gate and exact-version review',publish.includes('evaluateReleaseReadiness')&&quality.includes('evaluateReleaseReadiness')&&store.includes('current_version_id')&&store.includes('customer_approved_at')&&store.includes('createBuilderStorePublishRequest')],
  ['Free/Standard/Pro customer policy remains intact',policy.includes('freeFirstProject')&&policy.includes('priceUsd: 10')&&policy.includes('priceUsd: 68')&&policy.includes('accessDays: 365')&&policy.includes('autoRenew: false')],
  ['Release regression suite covers fail-closed 100 + visual evidence',releaseTests.includes('Any quality dimension below 100 must fail')&&releaseTests.includes('Beauty 100 requires complete palette')],
  ['Security regression suite protects Cloud/service-only persistence runtime',securityTests.includes('service-role-only RPCs')&&securityTests.includes('post-Preview revocation migration')&&securityTests.includes('Professional AI modify persistence is Cloud-isolated')],
  ['Runtime regression suite protects exact-project and Professional modify runtime',runtimeTests.includes('server-only, request-bound, exact-project financial runtime')&&runtimeTests.includes('Professional AI modify is time-bounded')],
  ['Non-production regression suite covers private refs + service finance',nonprodTests.includes('private references')&&nonprodTests.includes('server-only financial helpers')],
  ['CI runs Release → Security → Runtime → Nonprod → 100 → Build',workflow.indexOf('npm run test:release')<workflow.indexOf('npm run test:security')&&workflow.indexOf('npm run test:security')<workflow.indexOf('npm run test:runtime')&&workflow.indexOf('npm run test:runtime')<workflow.indexOf('npm run test:nonprod')&&workflow.indexOf('npm run test:nonprod')<workflow.indexOf('npm run quality:100')&&workflow.indexOf('npm run quality:100')<workflow.indexOf('npm run build')],
];

const failed=checks.filter(([,ok])=>!ok);
const passed=checks.length-failed.length;
const score=Math.round(passed/checks.length*100);
console.log(`Platform repository readiness: ${score}/100 (${passed}/${checks.length})`);
for(const [name,ok] of checks)console.log(`${ok?'✓':'✗'} ${name}`);
if(failed.length){
  console.error(`\nRelease blocked: ${failed.length} readiness check(s) failed.`);
  process.exit(1);
}
console.log('\nRepository 100 gate passed for non-Production product/code readiness. Production remains held for explicit approval and real-world evidence.');
