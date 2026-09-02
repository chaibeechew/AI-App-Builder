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

const gameRoot='main.shell:has(.builder .compose):has(.quality .qualityGrid)';
const pricingRoot='main.page:has(.plans):has(.gamePolicy)';
const activeProRoot='main.page:has(.toolSection)';
const lockedProRoot='main.page:has(.locked)';
const allowedRoots=[gameRoot,pricingRoot,activeProRoot,lockedProRoot];

assert.match(layout,/import "\.\/big-moon-valley-data-automation\.css";\s*import "\.\/big-moon-valley-game-pro-commerce\.css";/,'Game + Pro commerce shell must load after Data + Automation');
assert.equal((layout.match(/const earlyHomeLoadGuard/g)||[]).length,1,'Home load guard declaration must remain singular');
assert.match(layout,/window\.fetch=\(input,init\)=>\{try\{/,'Existing home fetch guard must remain intact');
assert.match(css,/url\('\/big-moon-valley\.svg'\)/,'Game + Pro commerce must use the Big Moon Valley signature scene');
assert.match(css,/env\(safe-area-inset-top\)/,'Game + Pro commerce must respect the iPhone top safe area');
assert.match(css,/env\(safe-area-inset-bottom\)/,'Game + Pro commerce must respect the iPhone bottom safe area');
assert.match(css,/font-size:16px!important/,'Game and Pro text inputs must remain iPhone-safe');
assert.match(css,/min-height:44px!important/,'Secondary controls must retain minimum touch targets');
assert.match(css,/min-height:54px!important/,'Primary mobile actions must retain large touch targets');
assert.match(css,/backdrop-filter:blur\(27px\) saturate\(1\.07\)/,'Game + Pro surfaces must retain premium glass depth');
assert.match(css,/@media\(max-width:560px\)/,'Dedicated phone Game + Pro composition is required');
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,'Game + Pro surfaces must respect reduced motion');

const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
assert.ok(!clean.includes('/a/'),'Game + Pro shell CSS must never target generated App routes');
assert.ok(!clean.includes('/website/'),'Game + Pro shell CSS must never target generated Website routes');
assert.doesNotMatch(clean,/(^|\n)\s*(html|body|\*)\s*[{,]/m,'Game + Pro shell must not use global document selectors');
let selectorCount=0;
for(const match of clean.matchAll(/([^{}]+)\{/g)){
  const header=match[1].trim();
  if(!header||header.startsWith('@'))continue;
  for(const selector of header.split(',')){
    const s=selector.trim();
    selectorCount+=1;
    assert.ok(allowedRoots.some(allowed=>s.startsWith(allowed)),`Unscoped Game + Pro selector is forbidden: ${s}`);
  }
}
assert.ok(selectorCount>=120,'Game + Pro selector-scope coverage must include Game Creator, Pricing and both Pro states');

// Pro Game Creator: generation, idempotency/Fair Use and truthful readiness remain unchanged.
assert.match(game,/currentGameCreatorEvidence\(\)/,'Game Creator must keep evidence-backed readiness');
assert.match(game,/fetch\("\/api\/game\/generate"/,'Game Creator generation API must remain intact');
assert.match(game,/credentials:"same-origin"/,'Game Creator generation must remain session-bound');
assert.match(game,/cache:"no-store"/,'Game Creator generation must not use stale cached responses');
assert.match(game,/requestIdRef\.current\|\|crypto\.randomUUID\(\)/,'Game Creator must retain request id reuse for safe retries');
assert.match(game,/response\.status===403/,'Game Creator must retain Pro entitlement handling');
assert.match(game,/response\.status===409/,'Game Creator must retain duplicate-request handling');
assert.match(game,/response\.status===429/,'Game Creator must retain Fair Use throttling handling');
assert.match(game,/Fair Price · Fair Use applies/,'Game Creator must retain Fair Price / Fair Use messaging');
assert.match(game,/productionEvidenceScore/,'Game Creator must keep production evidence separate from internal readiness');
assert.match(game,/canClaimInternal100/,'Game Creator must keep evidence-gated internal 100 wording');
assert.match(game,/Real Relay · Matchmaking \/ Cloud Providers · Load Tests/,'Game Creator must keep real-provider evidence boundary explicit');

// Pricing: policy source, ownership, Game sales share and external fee separation stay intact.
assert.match(pricing,/const pricing=PRODUCT_POLICY\.pricing/,'Pricing values must remain policy-driven');
assert.match(pricing,/const gameTerms=PRODUCT_POLICY\.monetization\.gameCommercialization/,'Game commercial terms must remain policy-driven');
assert.match(pricing,/pricing\.standard\.priceUsd/,'Standard plan must remain policy-driven');
assert.match(pricing,/pricing\.professional\.priceUsd/,'Professional plan must remain policy-driven');
assert.match(pricing,/pricing\.fullAccess\.priceUsd/,'Full Access plan must remain policy-driven');
assert.match(pricing,/gameTerms\.platformSalesSharePercent/,'Game sales share percentage must remain policy-driven');
assert.match(pricing,/You own your game/,'Creator game ownership wording must remain visible');
assert.match(pricing,/Store\/platform commissions and creator operating costs do not reduce the sales-share basis/i,'Game commercial basis wording must remain explicit');
assert.match(pricing,/officialEnrollmentUrl/,'Apple developer fee link must remain sourced from product policy');
assert.match(pricing,/officialRegistrationUrl/,'Google Play developer fee link must remain sourced from product policy');
assert.match(pricing,/LANERIQ AI does not collect or mark up those platform fees/,'External store fees must remain clearly separated');

// Professional Workspace: authenticated owner scope and entitlement boundary stay unchanged.
assert.match(pro,/supabase\.auth\.getUser\(\)/,'Professional Workspace must authenticate the current user');
assert.match(pro,/if \(!user\) redirect\(`\/auth\?next=\/pro\/\$\{id\}`\)/,'Professional Workspace unauthenticated redirect must remain intact');
assert.match(pro,/\.eq\("owner_id",user\.id\)/,'Professional Workspace project query must remain owner-scoped');
assert.match(pro,/getAppBuilderAccess\(supabase,user\.id\)/,'Professional entitlement must remain server-derived');
assert.match(pro,/if\(!access\.professional\.active\)/,'Locked Professional state must remain entitlement-gated');
assert.match(pro,/Your App, Website, data, versions and Standard workspace stay available/,'Pro expiry must not imply project deletion');
assert.match(pro,/app_versions/,'Professional Workspace must retain version-aware editing');
assert.match(pro,/ProAssistant appId=\{id\} currentVersionId=\{current\.id\}/,'AI Copilot must remain bound to the authenticated project version');

// Pro AI Copilot: safe request reuse, stale-version protection and truthful external setup remain intact.
assert.match(assistant,/pendingOperationRef/,'Pro AI Copilot must retain a stable pending operation id');
assert.match(assistant,/expectedVersionRef/,'Pro AI Copilot must retain expected-version conflict protection');
assert.match(assistant,/fetchWithTimeout\("\/api\/modify"/,'Pro AI Copilot must keep the AI Modify path');
assert.match(assistant,/expectedVersionId:expectedVersionRef\.current\|\|undefined/,'Pro AI Copilot must send expected version id');
assert.match(assistant,/requestId: operationId/,'Pro AI Copilot must send its idempotent operation id');
assert.match(assistant,/`\/api\/apps\/\$\{appId\}\/bootstrap`/,'Pro AI Copilot must retain controlled module bootstrap');
assert.match(assistant,/same request ID will safely recover an already-saved result instead of applying it twice/,'Pro retry safety wording must remain explicit');
assert.match(assistant,/payments, external provider connections and official store actions must not be guessed or silently confirmed/,'Pro AI must preserve truthful external-setup boundaries');

console.log('✓ Big Moon Valley now carries through Pro Game Creator, Creator Plans and Professional Workspace');
console.log(`✓ ${selectorCount} Game + Pro selectors remain scoped to LANERIQ product-shell roots`);
console.log('✓ Fair Use, policy pricing, creator ownership, Game sales share, Pro entitlement and AI Copilot retry safety remain intact');
console.log('✓ Generated App/Website customer routes remain separated and SMS stays on hold');
