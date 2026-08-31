import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.existsSync(path.join(root,p)) ? fs.readFileSync(path.join(root,p),'utf8') : '';
const exists = (p) => fs.existsSync(path.join(root,p));

const checks = [
  ['Core build route', exists('app/api/generate/route.js')],
  ['AI modify route', exists('app/api/modify/route.js')],
  ['No-code editor', exists('app/editor/[id]/page.js')],
  ['Project dashboard', exists('app/app-dashboard/[id]/page.js')],
  ['Quality gate API', exists('app/api/apps/[id]/quality/route.js')],
  ['Publish API', exists('app/api/apps/[id]/publish/route.js')],
  ['99 release threshold', /RELEASE_SCORE_REQUIRED\s*=\s*99|overall\s*>=\s*99/.test(read('app/api/apps/[id]/publish/route.js'))],
  ['Security/privacy/stability required at 99', ['stability','security','privacy'].every(k => read('app/api/apps/[id]/publish/route.js').includes(`${k}`)) && read('app/api/apps/[id]/publish/route.js').includes('99')],
  ['Pricing policy', exists('config/product-policy.js')],
  ['Free first project until publish', read('config/product-policy.js').includes('freeUntilFirstPublish')],
  ['Fair Price Fair Use', read('config/product-policy.js').includes('Fair Price · Fair Use')],
  ['Pro annual one-payment policy', read('config/product-policy.js').includes('priceUsd: 68') && read('config/product-policy.js').includes('accessDays: 365')],
  ['Store metadata AI helper', exists('app/api/store-metadata/route.js')],
  ['Publishing workspace', exists('app/publish/[id]/page.js')],
  ['Apple/Google fees external', read('config/product-policy.js').includes('chargedByAiAppBuilder: false') && read('config/product-policy.js').includes('collectedByAiAppBuilder: false')],
  ['Version history', exists('app/app-dashboard/[id]/versions/page.js')],
  ['Workflow UI/API present', exists('app/workflows/[id]/page.js') || exists('app/api/workflows')],
  ['Database builder present', exists('app/database/[id]/page.js')],
  ['Integration center present', exists('app/integrations/[id]/page.js')],
  ['Analytics present', exists('app/analytics/[id]/page.js')],
  ['AI operations present', exists('app/operations/[id]/page.js')],
  ['Video studio shell present', exists('app/video-studio/page.js')],
  ['CI build configured', exists('.github/workflows/consolidation-ci.yml') && read('.github/workflows/consolidation-ci.yml').includes('npm run build')],
  ['No fake zero-bug guarantee in quality policy', !/zero bugs|guaranteed security|100% secure/i.test(read('lib/buildStandards.js'))],
];

const passed = checks.filter(([,ok])=>ok).length;
const total = checks.length;
const score = Math.round((passed/total)*100);
console.log(`Platform structural readiness: ${score}/100 (${passed}/${total})`);
for (const [name,ok] of checks) console.log(`${ok?'✓':'✗'} ${name}`);

// This script measures repository-level structural readiness only. It cannot prove runtime reliability,
// real-device behavior, provider availability, security posture, store approval, or payment success.
// Those require live E2E evidence before production promotion.
if (score < 99) {
  console.error('\nRelease blocked: structural readiness is below 99.');
  process.exit(1);
}
console.log('\nStructural 99 gate passed. Live E2E and real-device evidence are still required before Production promotion.');
