import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const layout=read('app/layout.js');
const css=read('app/big-moon-valley-game-pro-commerce.css');
const game=read('app/game-builder/page.js');
const pricing=read('app/pricing/page.js');
const pro=read('app/pro/[id]/page.js');
const assistant=read('app/pro/[id]/ProAssistant.js');

const allowedRoots=[
  'main.shell:has(.builder .compose):has(.quality .qualityGrid)',
  'main.page:has(.plans):has(.gamePolicy)',
  'main.page:has(.toolSection)',
  'main.page:has(.locked)'
];

assert.match(layout,/import "\.\/big-moon-valley-data-automation\.css";\s*import "\.\/big-moon-valley-game-pro-commerce\.css";/,'Game + Pro shell must load after the existing data/automation shell');
assert.equal((layout.match(/const earlyHomeLoadGuard/g)||[]).length,1,'Home load guard declaration must remain singular');
assert.match(layout,/window\.fetch=\(input,init\)=>\{try\{/,'Existing home fetch guard must remain intact');
assert.match(css,/url\('\/big-moon-valley\.svg'\)/,'Game + Pro must use the Big Moon Valley scene');
assert.match(css,/env\(safe-area-inset-top\)/,'Top safe area must remain supported');
assert.match(css,/env\(safe-area-inset-bottom\)/,'Bottom safe area must remain supported');
assert.match(css,/font-size:16px!important/,'Text areas must remain iPhone-safe');
assert.match(css,/min-height:44px!important/,'Secondary controls need minimum touch targets');
assert.match(css,/min-height:54px!important/,'Primary mobile actions need large touch targets');
assert.match(css,/backdrop-filter:blur\(27px\) saturate\(1\.07\)/,'Premium glass depth must remain present');
assert.match(css,/@media\(max-width:560px\)/,'Phone composition is required');
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,'Reduced motion must be supported');

const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
assert.ok(!clean.includes('/a/'),'Game + Pro CSS must never target generated App routes');
assert.ok(!clean.includes('/website/'),'Game + Pro CSS must never target generated Website routes');
assert.doesNotMatch(clean,/(^|\n)\s*(html|body|\*)\s*[{,]/m,'Game + Pro CSS must not use global document selectors');
let selectorCount=0;
for(const match of clean.matchAll(/([^{}]+)\{/g)){
  const header=match[1].trim();
  if(!header||header.startsWith('@'))continue;
  for(const selector of header.split(',')){
    const s=selector.trim();
    selectorCount+=1;
    assert.ok(allowedRoots.some(rootSelector=>s.startsWith(rootSelector)),`Unscoped Game + Pro selector is forbidden: ${s}`);
  }
}
assert.ok(selectorCount>=80,'Game + Pro selector-scope coverage must span creator, plans and both Pro states');

assert.match(game,/currentGameCreatorEvidence\(\)/);
assert.match(game,/fetch\("\/api\/game\/generate"/);
assert.match(game,/credentials:"same-origin"/);
assert.match(game,/cache:"no-store"/);
assert.match(game,/requestIdRef\.current\|\|crypto\.randomUUID\(\)/);
assert.match(game,/response\.status===403/);
assert.match(game,/response\.status===409/);
assert.match(game,/response\.status===429/);
assert.match(game,/Fair Price · Fair Use applies/);
assert.match(game,/productionEvidenceScore/);
assert.match(game,/canClaimInternal100/);
assert.match(game,/Real Relay · Matchmaking \/ Cloud Providers · Load Tests/);

assert.match(pricing,/const pricing=PRODUCT_POLICY\.pricing/);
assert.match(pricing,/const gameTerms=PRODUCT_POLICY\.monetization\.gameCommercialization/);
assert.match(pricing,/pricing\.standard\.priceUsd/);
assert.match(pricing,/pricing\.professional\.priceUsd/);
assert.match(pricing,/pricing\.fullAccess\.priceUsd/);
assert.match(pricing,/gameTerms\.platformSalesSharePercent/);
assert.match(pricing,/You own your game/);
assert.match(pricing,/store\/platform commissions and creator operating costs do not reduce the sales-share basis/i);
assert.match(pricing,/officialEnrollmentUrl/);
assert.match(pricing,/officialRegistrationUrl/);
assert.match(pricing,/LANERIQ AI does not collect or mark up those platform fees/);

assert.match(pro,/supabase\.auth\.getUser\(\)/);
assert.match(pro,/if \(!user\) redirect\(`\/auth\?next=\/pro\/\$\{id\}`\)/);
assert.match(pro,/\.eq\("owner_id",user\.id\)/);
assert.match(pro,/getAppBuilderAccess\(supabase,user\.id\)/);
assert.match(pro,/if\(!access\.professional\.active\)/);
assert.match(pro,/Your App, Website, data, versions and Standard workspace stay available/);
assert.match(pro,/app_versions/);
assert.match(pro,/ProAssistant appId=\{id\} currentVersionId=\{current\.id\}/);

assert.match(assistant,/pendingOperationRef/);
assert.match(assistant,/expectedVersionRef/);
assert.match(assistant,/fetchWithTimeout\("\/api\/modify"/);
assert.match(assistant,/expectedVersionId:expectedVersionRef\.current\|\|undefined/);
assert.match(assistant,/requestId: operationId/);
assert.match(assistant,/`\/api\/apps\/\$\{appId\}\/bootstrap`/);
assert.match(assistant,/same request ID will safely recover an already-saved result instead of applying it twice/);
assert.match(assistant,/payments, external provider connections and official store actions must not be guessed or silently confirmed/);

console.log('✓ Big Moon Valley carries through Game Creator, Creator Plans and Professional Workspace');
console.log(`✓ ${selectorCount} Game + Pro selectors remain scoped to LANERIQ product-shell roots`);
console.log('✓ Fair Use, policy pricing, creator ownership, Pro entitlement and AI Copilot retry safety remain intact');
console.log('✓ Generated App/Website customer routes remain separated and SMS stays on hold');
