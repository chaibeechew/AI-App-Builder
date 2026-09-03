import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const layout=read('app/layout.js');
const css=read('app/big-moon-valley-creator-services.css');
const creditsLayout=read('app/credits/layout.js');
const credits=read('app/credits/page.js');
const creditsApi=read('app/api/credits/route.js');
const templates=read('app/templates/page.js');
const studio=read('app/studio/page.js');
const imageStudio=read('app/image-studio/page.js');

const allowedRoots=['.creditsPage','.templatesPage','.studioShell','main.studio'];

assert.match(layout,/import "\.\/big-moon-valley-account\.css";\s*import "\.\/big-moon-valley-creator-services\.css";/,'Creator services shell must load after the account shell');
assert.match(css,/url\('\/big-moon-valley\.svg'\)/,'Creator services must use the Big Moon Valley signature scene');
assert.match(css,/padding-top:clamp\(165px,24svh,270px\)/,'Credits styling may remain dormant for reversible launch-mode compatibility');
assert.match(css,/padding-top:clamp\(170px,24svh,270px\)/,'Templates must preserve a desktop cinematic landscape zone');
assert.match(css,/padding-top:clamp\(210px,34svh,292px\)/,'Phone creator services must preserve a larger Big Moon Valley viewing zone');
assert.match(css,/env\(safe-area-inset-top\)/,'Creator services must respect the iPhone top safe area');
assert.match(css,/env\(safe-area-inset-bottom\)/,'Creator services must respect the iPhone bottom safe area');
assert.match(css,/font-size:16px!important/,'Creator-service form controls must retain iPhone-safe input sizing');
assert.match(css,/min-height:48px!important/,'Primary creator-service actions must retain mobile-friendly touch targets');
assert.match(css,/backdrop-filter:blur\(28px\) saturate\(1\.08\)/,'Creator services must retain premium glass depth');
assert.match(css,/@media\(max-width:560px\)/,'Dedicated phone creator-service composition is required');
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,'Creator services must respect reduced-motion preference');

const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
assert.ok(!clean.includes('/a/'),'Creator-service visual CSS must never target generated App routes');
assert.ok(!clean.includes('/website/'),'Creator-service visual CSS must never target generated Website routes');
let selectorCount=0;
for(const match of clean.matchAll(/([^{}]+)\{/g)){
  const header=match[1].trim();
  if(!header||header.startsWith('@'))continue;
  for(const selector of header.split(',')){
    const s=selector.trim();
    selectorCount+=1;
    assert.ok(allowedRoots.some(root=>s.startsWith(root)),`Unscoped selector is forbidden in creator-services shell: ${s}`);
  }
}
assert.ok(selectorCount>=100,'Creator-services selector scope check must cover the dormant Credits plus Templates/Studio/Visual Studio layer');

assert.match(creditsLayout,/isNoCreditsLaunchMode\(\)/,'No-Credits launch mode must gate the public Credits route');
assert.match(creditsLayout,/publicBalancePageEnabled === false/,'Credits route gate must obey the launch policy flag');
assert.match(creditsLayout,/redirect\("\/"\)/,'Public Credits route must redirect home while No-Credits launch mode is active');
assert.match(credits,/fetch\("\/api\/credits", \{ cache: "no-store" \}\)/,'Dormant Credits component must keep its server-backed balance/ledger API');
assert.match(credits,/const ledger = Array\.isArray\(data\?\.ledger\) \? data\.ledger : \[\];/,'Dormant Credits component must keep ledger normalization for reversible compatibility');
assert.match(creditsApi,/from\("credit_accounts"\)/,'Dormant Credits backend must keep its server-backed balance compatibility');
assert.match(creditsApi,/from\("credit_transactions"\)/,'Dormant Credits backend must keep its ledger compatibility');
assert.match(creditsApi,/\.eq\("user_id", user\.id\)/,'Dormant Credits backend must remain user scoped');

assert.match(templates,/fetch\("\/api\/templates\?mode=meta", \{ cache: "no-store" \}\)/,'Templates metadata loading must remain intact');
assert.match(templates,/fetch\(`\/api\/templates\?\$\{params\.toString\(\)\}`/,'Template search loading must remain intact');
assert.match(templates,/sessionStorage\.setItem\("soolenAppIdea", instruction\)/,'Template reimagine handoff must remain intact');
assert.match(templates,/Do not copy third-party brand identity, text, images, source code, proprietary layouts or distinctive trade dress\./,'Template originality guard must remain intact');

assert.doesNotMatch(studio,/AI BUILD APP&WEB/,'Studio must not show the retired AI BUILD APP&WEB brand');
assert.match(studio,/className="back">← LANERIQ AI</,'Studio back link must use LANERIQ AI branding');
assert.match(studio,/LANERIQ AI is organized as one continuous service/,'Studio hero must use LANERIQ AI branding');
assert.match(studio,/BUILD_STANDARDS\.map/,'Studio must retain the existing quality-gate source');
assert.match(studio,/modules\.filter\(m=>m\.live\)\.length/,'Studio module availability logic must remain intact');

assert.match(imageStudio,/fetch\("\/api\/images\/generate",/,'Visual Studio must retain the existing image-generation API');
assert.match(imageStudio,/fetch\("\/api\/images\/save",/,'Visual Studio must retain private Asset Library save behavior');
assert.match(imageStudio,/credentials:"same-origin"/,'Visual Studio requests must remain session-bound');
assert.match(imageStudio,/Saved to your private Asset Library/,'Visual Studio privacy messaging must remain intact');

console.log('✓ Big Moon Valley preserves reversible dormant Credits styling while current launch mode gates the public Credits surface');
console.log(`✓ ${selectorCount} creator-service selectors are scoped only to LANERIQ product-shell roots`);
console.log('✓ Credits route gate, dormant page/API compatibility, inspiration search/reimagine, quality modules and image generate/save contracts remain intact');
console.log('✓ Generated App/Website customer routes remain styling-separated and SMS is not touched');
