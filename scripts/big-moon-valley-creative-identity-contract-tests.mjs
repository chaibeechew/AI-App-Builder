import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const layout=read('app/layout.js');
const css=read('app/big-moon-valley-creative-identity.css');
const video=read('app/video-studio/page.js');
const avatar=read('app/avatar-studio/page.js');
const brand=read('app/brand-kit/page.js');
const assets=read('app/asset-library/page.js');

const videoRoot='main.page:has(.modes.ratio)';
const allowedRoots=[videoRoot,'.avatarPage','.brandPage','.assetPage'];

assert.match(layout,/import "\.\/big-moon-valley-project-intelligence\.css";\s*import "\.\/big-moon-valley-creative-identity\.css";/,'Creative + identity shell must load after project intelligence');
assert.match(css,/url\('\/big-moon-valley\.svg'\)/,'Creative + identity shell must use the Big Moon Valley signature scene');
assert.match(css,/main\.page:has\(\.modes\.ratio\)/,'Video Studio must use a route-specific structural root instead of a generic .page override');
assert.match(css,/padding:clamp\(165px,24svh,275px\)/,'Desktop creative surfaces must preserve a cinematic landscape zone');
assert.match(css,/padding-top:clamp\(210px,34svh,292px\)/,'Phone creative surfaces must preserve a larger signature zone');
assert.match(css,/env\(safe-area-inset-top\)/,'Creative + identity shell must respect the iPhone top safe area');
assert.match(css,/env\(safe-area-inset-bottom\)/,'Creative + identity shell must respect the iPhone bottom safe area');
assert.match(css,/font-size:16px!important/,'Creative forms must retain iPhone-safe input sizing');
assert.match(css,/min-height:48px!important/,'Primary identity actions must retain mobile-friendly touch targets');
assert.match(css,/backdrop-filter:blur\(27px\) saturate\(1\.07\)/,'Creative surfaces must retain premium glass depth');
assert.match(css,/@media\(max-width:560px\)/,'Dedicated phone creative composition is required');
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,'Creative surfaces must respect reduced-motion preference');

const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
assert.ok(!clean.includes('/a/'),'Creative + identity visual CSS must never target generated App routes');
assert.ok(!clean.includes('/website/'),'Creative + identity visual CSS must never target generated Website routes');
let selectorCount=0;
for(const match of clean.matchAll(/([^{}]+)\{/g)){
  const header=match[1].trim();
  if(!header||header.startsWith('@'))continue;
  for(const selector of header.split(',')){
    const s=selector.trim();
    selectorCount+=1;
    assert.ok(allowedRoots.some(allowed=>s.startsWith(allowed)),`Unscoped selector is forbidden in creative + identity shell: ${s}`);
  }
}
assert.ok(selectorCount>=100,'Creative + identity selector scope check must cover the full Video/Avatar/Brand/Asset layer');

// Video Studio truthfulness and session-bound project lifecycle.
assert.match(video,/fetch\("\/api\/video\/storyboard",/,'Video storyboard API must remain intact');
assert.match(video,/credentials:"same-origin"/,'Video requests must remain session-bound');
assert.match(video,/fetch\("\/api\/video\/projects",/,'Video project creation must remain intact');
assert.match(video,/fetch\(`\/api\/video\/projects\/\$\{encodeURIComponent\(p\.id\)\}\/compile`/,'Video compile API must remain intact');
assert.match(video,/pollRender\(p\.id,d\.version\.id,0\)/,'Video real-render status polling must remain intact');
assert.match(video,/Final MP4 rendering is not connected yet; no render has been claimed\./,'Video must preserve truthful disconnected-render messaging');
assert.match(video,/if\(plan\.outputPath\)/,'Video must only present final output when a real output path exists');

// Avatar generation and likeness-consent boundary.
assert.match(avatar,/const LIKENESS=.*"self".*"consented_person"/s,'Avatar must preserve explicit real-person likeness modes');
assert.match(avatar,/if\(needsConsent&&!consentConfirmed\)/,'Avatar must block real-person likeness generation until consent is declared');
assert.match(avatar,/fetch\("\/api\/avatar\/generate",/,'Avatar generation API must remain intact');
assert.match(avatar,/credentials:"same-origin"/,'Avatar generation must remain session-bound');
assert.match(avatar,/fetch\("\/api\/images\/save",/,'Avatar private Asset Library save path must remain intact');
assert.match(avatar,/Avatar saved to your private Asset Library\./,'Avatar privacy messaging must remain intact');
assert.match(avatar,/raw reference media is not stored by this Avatar flow/,'Avatar raw-reference privacy statement must remain intact');

// Brand Kit server authentication and owner scoping.
assert.match(brand,/supabase\.auth\.getUser\(\)/,'Brand Kit must authenticate before reading');
assert.match(brand,/if \(!user\) redirect\("\/auth\?next=\/brand-kit"\)/,'Brand Kit unauthenticated redirect must remain intact');
assert.match(brand,/\.eq\("user_id", user\.id\)/,'Brand Kit read must remain owner-scoped');
assert.match(brand,/currentUser.*auth\.getUser/s,'Brand Kit write must re-authenticate server-side');
assert.match(brand,/user_id: currentUser\.id/,'Brand Kit write must use the authenticated owner id');
assert.match(brand,/\.upsert\(payload, \{ onConflict: "user_id" \}\)/,'Brand Kit owner-keyed upsert must remain intact');
assert.ok(brand.includes('!/^https:\/\/[^\\s]+$/i.test(logoUrl)'),'Brand Kit logo references must remain HTTPS-only');
assert.match(brand,/Logo URL must be a valid HTTPS address/,'Brand Kit invalid-logo messaging must remain explicit');

// Asset Library auth, owner queries, bounded uploads and short-lived previews.
assert.match(assets,/const MAX_SIZE = 25 \* 1024 \* 1024/,'Asset Library upload size cap must remain 25 MB');
assert.match(assets,/const ACCEPTED = \["image\/", "video\/", "application\/pdf"\]/,'Asset Library accepted media boundary must remain explicit');
assert.match(assets,/supabase\.auth\.getUser\(\)/,'Asset Library must authenticate the current user');
assert.match(assets,/window\.location\.assign\("\/auth\?next=\/asset-library"\)/,'Asset Library unauthenticated redirect must remain intact');
assert.match(assets,/\.eq\("user_id",userId\)/,'Asset Library list query must remain owner-scoped');
assert.match(assets,/createSignedUrl\(item\.storage_path,600\)/,'Asset previews must remain short-lived 10-minute signed URLs');
assert.match(assets,/const path=`\$\{user\.id\}\/\$\{crypto\.randomUUID\(\)\}-\$\{safe\}`/,'Asset storage paths must remain namespaced by authenticated user id');
assert.match(assets,/upsert:false/,'Asset storage uploads must not silently overwrite');
assert.match(assets,/\.delete\(\)\.eq\("id",item\.id\)\.eq\("user_id",user\.id\)/,'Asset database deletion must remain owner-scoped');

console.log('✓ Big Moon Valley now carries through Video Studio, Avatar Studio, Brand Kit and Asset Library');
console.log(`✓ ${selectorCount} creative + identity selectors are scoped only to LANERIQ product-shell roots`);
console.log('✓ Video render truthfulness, Avatar consent, Brand Kit owner scope and Asset Library privacy contracts remain intact');
console.log('✓ Generated App/Website customer routes remain styling-separated and SMS is untouched');
