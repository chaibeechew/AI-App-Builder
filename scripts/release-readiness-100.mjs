import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.existsSync(path.join(root,p)) ? fs.readFileSync(path.join(root,p),'utf8') : '';
const exists = (p) => fs.existsSync(path.join(root,p));
const contains = (p, terms=[]) => terms.every((term) => read(p).includes(term));

const publish = read('app/api/apps/[id]/publish/route.js');
const quality = read('app/api/apps/[id]/quality/route.js');
const storePublish=read('app/api/publish/request/route.js');
const policy = read('config/product-policy.js');
const editor = read('app/editor/[id]/page.js');
const releasePage = read('app/release/[id]/page.js');
const auth = read('app/auth/page.js');
const modify = read('app/api/modify/route.js');
const generate = read('app/api/generate/route.js');
const autonomous = read('engine/autonomous-engine.js');
const workflow = read('.github/workflows/consolidation-ci.yml');
const workflowRun=read('app/api/apps/[id]/workflows/[workflowId]/run/route.js');
const checkout=read('app/api/apps/[id]/monetization/[offerId]/checkout/route.js');
const integrationServer=read('lib/integrations/server.js');
const databaseApi=read('app/api/apps/[id]/database/route.js');
const databaseRollback=read('app/api/apps/[id]/database/rollback/route.js');
const videoCompile=read('app/api/video/projects/[id]/compile/route.js');
const readiness = read('lib/release-readiness.js');
const buildStandards = read('lib/buildStandards.js');
const runtimeGuard = read('lib/generator/runtime-guard.js');
const videoApiIndex = read('app/api/video/projects/route.js') + read('app/api/video/storyboard/route.js') + videoCompile;
const releaseTests = read('scripts/release-policy-tests.mjs');
const securityTests = read('scripts/security-contract-tests.mjs');
const runtimeTests=read('scripts/runtime-contract-tests.mjs');

const checks = [
  ['Core build route persists generated projects', contains('app/api/generate/route.js',['app_versions','specification'])],
  ['AI modify route versions changes', modify.includes('app_versions') && modify.includes('version_no')],
  ['AI modify applies same generation quality standard', modify.includes('GENERATION_QUALITY_RULES') && modify.includes('assessBuildQuality')],
  ['AI modify preserves explicit quality evidence', modify.includes('qualityPlan') && modify.includes('at least 3 concrete implementation decisions')],
  ['AI modify repairs deterministic quality regressions', modify.includes('qualityRegressed') && modify.includes('SoolenAI Quality Repair')],
  ['AI modify fails closed if repair still regresses quality', modify.includes('would reduce the project') && modify.includes('status:409')],
  ['No-code editor uses natural-language AI modify', editor.includes('/api/modify') && editor.includes('textarea')],
  ['No-code editor preserves version history access', editor.includes('Version History') && editor.includes('Rollback')],
  ['Project dashboard keeps simple preview/change/publish actions', contains('app/app-dashboard/[id]/page.js',['Open App Demo','Preview Website','Publishing'])],
  ['Central release policy exists at 100', contains('lib/release-readiness.js',['RELEASE_SCORE_REQUIRED = 100','evaluateReleaseReadiness','evaluateProductionEvidence','PRODUCTION_EVIDENCE_REQUIREMENTS'])],
  ['Quality API uses shared release evaluator', quality.includes('evaluateReleaseReadiness')],
  ['Quality API exposes real-world evidence requirements', quality.includes('productionEvidence') && quality.includes('PRODUCTION_EVIDENCE_LABELS')],
  ['Publish Center explains real-world evidence separately from score', releasePage.includes('REAL-WORLD RELEASE EVIDENCE') && releasePage.includes('100/100 does not replace live testing')],
  ['Website/App publish API uses shared release evaluator', publish.includes('evaluateReleaseReadiness')],
  ['Store publish request uses exact current version and shared evaluator', storePublish.includes('current_version_id')&&storePublish.includes('evaluateReleaseReadiness')&&storePublish.includes('customer_approved_at')],
  ['Publish route blocks below strict target', publish.includes('Publishing is locked until the project reaches') && publish.includes('releaseReady: false')],
  ['All six dimensions are centrally required', ['stability','security','privacy','comfort','beauty','naturalness'].every((k)=>readiness.includes(`"${k}"`))],
  ['100 is described as internal target not zero-defect guarantee', readiness.includes('not a guarantee of zero bugs')],
  ['Production evidence fails closed by contract', releaseTests.includes('Production evidence must fail closed when missing') && releaseTests.includes('Complete production evidence should pass')],
  ['Generation receives explicit quality rules', autonomous.includes('GENERATION_QUALITY_RULES') && generate.includes('runAutonomousEngine')],
  ['Generation emits explicit qualityPlan evidence', autonomous.includes('QUALITY PLAN REQUIREMENT') && autonomous.includes('"qualityPlan"')],
  ['Perfect score cannot come from keywords alone', buildStandards.includes('evidenceComplete') && buildStandards.includes('Math.min(99,raw)') && buildStandards.includes('qualityPlan')],
  ['Runtime guard preserves quality and visual metadata', ['qualityPlan','backgroundTreatment','dataModels','demoVideo'].every((term)=>runtimeGuard.includes(term))],
  ['Premium visual direction is generated', contains('engine/autonomous-engine.js',['designSystem','backgroundDirection','heroDirection','layoutSignature'])],
  ['Fair Price Fair Use customer policy exists', policy.includes('Fair Price · Fair Use')],
  ['Free first App + Website continues until first publish', policy.includes('freeFirstProject') && policy.includes('includesReasonableAiModificationUntilReady: true') && policy.includes('endsWhenProjectIsPublished: true')],
  ['Standard remains USD 10 one-time', policy.includes('priceUsd: 10') && policy.includes('billing: "one_time"')],
  ['Pro remains USD 68 for 365 days without auto-renew', policy.includes('priceUsd: 68') && policy.includes('accessDays: 365') && policy.includes('autoRenew: false')],
  ['Price review is at three years and increase optional', policy.includes('reviewIntervalYears: 3') && policy.includes('increaseIsOptional: true')],
  ['License/buyout plan remains available', contains('config/product-policy.js',['oneAppOneLicense','personal: { priceUsd: 49 }','business: { priceUsd: 199 }','enterprise: { priceUsd: 499 }'])],
  ['Apple/Google developer fees are never collected by platform', policy.includes('chargedByAiAppBuilder: false') && policy.includes('collectedByAiAppBuilder: false')],
  ['Store publishing requires customer review', policy.includes('customerMustReviewBeforeSubmission: true')],
  ['Store metadata assistant exists', exists('app/api/store-metadata/route.js') && exists('app/publish/[id]/page.js')],
  ['Email OTP path exists', auth.includes('signInWithOtp') && auth.includes('verifyOtp')],
  ['SMS remains safely feature-flagged while provider is paused', auth.includes('NEXT_PUBLIC_SMS_AUTH_ENABLED')],
  ['Database builder validates types and credential fields', databaseApi.includes('SAFE_TYPES')&&databaseApi.includes('SECRET_FIELD')],
  ['Database builder and UI provide non-destructive rollback', databaseApi.includes('_history')&&exists('app/api/apps/[id]/database/rollback/route.js')&&databaseRollback.includes('newVersion')&&read('app/database/[id]/page.js').includes('Restore this version')],
  ['Workflow automation is idempotent and bounded', workflowRun.includes('idempotency_key')&&workflowRun.includes('Workflow action timed out')&&workflowRun.includes('criticalFailure')],
  ['Managed providers use bounded network timeouts', integrationServer.includes('External provider timed out')&&integrationServer.includes('providerFetch')],
  ['Payments use server-side offer validation and provider idempotency', checkout.includes('Offer amount is outside the supported range')&&checkout.includes('idempotencyKey')&&integrationServer.includes('Idempotency-Key')],
  ['Integration center exists', exists('app/integrations/[id]/page.js')],
  ['Analytics and AI operations exist', exists('app/analytics/[id]/page.js') && exists('app/operations/[id]/page.js')],
  ['Video Studio is present without pretending provider completion', exists('app/video-studio/page.js') && videoCompile.includes('renderStarted:false') && videoCompile.includes('rendererConfigured') && !/final provider connected|fully connected video provider|guaranteed mp4/i.test(videoApiIndex)],
  ['Release policy regression tests cover 100-point fail-closed behavior', releaseTests.includes('Any quality dimension below 100 must fail') && releaseTests.includes('Missing dimensions must fail closed')],
  ['Security contract tests cover ownership and client secrets', securityTests.includes('Client bundles must never reference server secrets') && securityTests.includes('Publish must enforce project ownership server-side')],
  ['Runtime contract tests cover workflow, payment, store, database and video', ['Workflow execution is idempotent','Payment checkout uses authoritative','Store publish requests require exact-version','No-code database models','Video compile does not pretend'].every(term=>runtimeTests.includes(term))],
  ['CI runs release tests before security tests', workflow.indexOf('npm run test:release') >= 0 && workflow.indexOf('npm run test:release') < workflow.indexOf('npm run test:security')],
  ['CI runs security tests before runtime tests', workflow.indexOf('npm run test:security') >= 0 && workflow.indexOf('npm run test:security') < workflow.indexOf('npm run test:runtime')],
  ['CI runs runtime tests before 100 readiness gate', workflow.indexOf('npm run test:runtime') >= 0 && workflow.indexOf('npm run test:runtime') < workflow.indexOf('npm run quality:100')],
  ['CI runs 100 readiness gate before build', workflow.indexOf('npm run quality:100') >= 0 && workflow.indexOf('npm run quality:100') < workflow.indexOf('npm run build')],
  ['CI builds exact branch', workflow.includes('integration/primary-consolidation')],
  ['No fake security or zero-bug marketing claims in quality policy', !/guaranteed security|100% secure|zero bugs guaranteed/i.test(buildStandards)],
];

const failed = checks.filter(([,ok])=>!ok);
const passed = checks.length - failed.length;
const score = Math.round((passed/checks.length)*100);
console.log(`Platform repository readiness: ${score}/100 (${passed}/${checks.length})`);
for (const [name,ok] of checks) console.log(`${ok?'✓':'✗'} ${name}`);

if (failed.length) {console.error(`\nRelease blocked: ${failed.length} repository readiness check(s) failed.`);process.exit(1);}
console.log('\nRepository 100 gate passed. Production promotion still requires live environment, provider, payment and real-device evidence where applicable.');
