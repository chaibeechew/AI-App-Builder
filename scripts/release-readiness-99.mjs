import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.existsSync(path.join(root,p)) ? fs.readFileSync(path.join(root,p),'utf8') : '';
const exists = (p) => fs.existsSync(path.join(root,p));
const contains = (p, terms=[]) => terms.every((term) => read(p).includes(term));

const publish = read('app/api/apps/[id]/publish/route.js');
const quality = read('app/api/apps/[id]/quality/route.js');
const policy = read('config/product-policy.js');
const editor = read('app/editor/[id]/page.js');
const auth = read('app/auth/page.js');
const modify = read('app/api/modify/route.js');
const generate = read('app/api/generate/route.js');
const autonomous = read('engine/autonomous-engine.js');
const workflow = read('.github/workflows/consolidation-ci.yml');
const readiness = read('lib/release-readiness.js');
const videoApiIndex = read('app/api/video/projects/route.js') + read('app/api/video/storyboard/route.js');
const releaseTests = read('scripts/release-policy-tests.mjs');

const checks = [
  ['Core build route persists generated projects', contains('app/api/generate/route.js',['app_versions','specification'])],
  ['AI modify route versions changes', modify.includes('app_versions') && modify.includes('version_no')],
  ['No-code editor uses natural-language AI modify', editor.includes('/api/modify') && editor.includes('textarea')],
  ['No-code editor preserves version history access', editor.includes('Version History') && editor.includes('Rollback')],
  ['Project dashboard keeps simple preview/change/publish actions', contains('app/app-dashboard/[id]/page.js',['Open App Demo','Preview Website','Publishing'])],
  ['Central release policy exists', contains('lib/release-readiness.js',['RELEASE_SCORE_REQUIRED = 99','evaluateReleaseReadiness','PRODUCTION_EVIDENCE_REQUIREMENTS'])],
  ['Quality API uses shared release evaluator', quality.includes('evaluateReleaseReadiness')],
  ['Publish API uses shared release evaluator', publish.includes('evaluateReleaseReadiness')],
  ['Publish route blocks below strict target', publish.includes('Publishing is locked until the project reaches') && publish.includes('releaseReady: false')],
  ['All six dimensions are centrally required', ['stability','security','privacy','comfort','beauty','naturalness'].every((k)=>readiness.includes(`"${k}"`))],
  ['99 is described as internal target not zero-defect guarantee', readiness.includes('not a guarantee of zero bugs')],
  ['Generation receives explicit quality rules', autonomous.includes('GENERATION_QUALITY_RULES') && generate.includes('runAutonomousEngine')],
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
  ['Database builder exists', exists('app/database/[id]/page.js')],
  ['Workflow automation exists', exists('app/workflows/[id]/page.js')],
  ['Integration center exists', exists('app/integrations/[id]/page.js')],
  ['Analytics and AI operations exist', exists('app/analytics/[id]/page.js') && exists('app/operations/[id]/page.js')],
  ['Video Studio is present without pretending provider completion', exists('app/video-studio/page.js') && !/final provider connected|fully connected video provider|guaranteed mp4/i.test(videoApiIndex)],
  ['Release policy regression tests cover fail-closed behavior', releaseTests.includes('Any quality dimension below 99 must fail') && releaseTests.includes('Missing dimensions must fail closed')],
  ['CI runs release tests before readiness gate', workflow.indexOf('npm run test:release') >= 0 && workflow.indexOf('npm run test:release') < workflow.indexOf('npm run quality:99')],
  ['CI runs readiness gate before build', workflow.indexOf('npm run quality:99') >= 0 && workflow.indexOf('npm run quality:99') < workflow.indexOf('npm run build')],
  ['CI builds exact branch', workflow.includes('integration/primary-consolidation')],
  ['No fake security or zero-bug marketing claims in quality policy', !/guaranteed security|100% secure|zero bugs guaranteed/i.test(read('lib/buildStandards.js'))],
];

const failed = checks.filter(([,ok])=>!ok);
const passed = checks.length - failed.length;
const score = Math.round((passed/checks.length)*100);
console.log(`Platform repository readiness: ${score}/100 (${passed}/${checks.length})`);
for (const [name,ok] of checks) console.log(`${ok?'✓':'✗'} ${name}`);

if (failed.length) {
  console.error(`\nRelease blocked: ${failed.length} repository readiness check(s) failed.`);
  process.exit(1);
}

console.log('\nRepository 99 gate passed. Production promotion still requires live environment, provider, payment and real-device evidence where applicable.');
