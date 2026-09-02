import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const layout=read('app/layout.js');
const css=read('app/big-moon-valley-release.css');
const release=read('app/release/[id]/page.js');
const publish=read('app/publish/[id]/page.js');
const readiness=read('app/publish/[id]/PublishingReadinessPanel.js');

assert.match(layout,/import "\.\/big-moon-valley-journey\.css";\s*import "\.\/big-moon-valley-release\.css";/,'Release shell must load after the journey layer');
assert.match(release,/className="releasePage"/,'Release Center must retain the scoped releasePage root');
assert.match(publish,/className="publishPage"/,'Store publishing must retain the scoped publishPage root');
assert.match(readiness,/storeReadinessDock/,'Publishing readiness must retain the scoped dock root');

assert.match(css,/url\('\/big-moon-valley\.svg'\)/,'Release shell must use the Big Moon Valley signature scene');
assert.match(css,/padding-top:clamp\(150px,22svh,250px\)/,'Desktop release shell must preserve a moon/valley viewing zone');
assert.match(css,/padding-top:clamp\(190px,31svh,270px\)/,'Phone release shell must preserve a larger cinematic viewing zone');
assert.match(css,/env\(safe-area-inset-top\)/,'Release shell must respect the phone top safe area');
assert.match(css,/env\(safe-area-inset-bottom\)/,'Release shell must respect the phone bottom safe area');
assert.match(css,/min-height:48px!important/,'Primary release and publishing controls must retain mobile-friendly targets');
assert.match(css,/font-size:16px!important/,'Publishing inputs must avoid iPhone focus zoom');
assert.match(css,/backdrop-filter:blur\(28px\) saturate\(1\.08\)/,'Release and publishing cards must retain premium glass depth');
assert.match(css,/\.releasePage \.websitePreview[\s\S]*url\('\/big-moon-valley\.svg'\)/,'LANERIQ website preview card may echo the signature scene');
assert.match(css,/\.storeReadinessDock \.storeReadinessPanel/,'Store readiness dock must share the release visual system');
assert.match(css,/@media\(max-width:520px\)/,'Dedicated phone release composition is required');
assert.match(css,/@media\(prefers-reduced-motion:reduce\)/,'Release shell must respect reduced-motion preference');

const clean=css.replace(/\/\*[\s\S]*?\*\//g,'');
assert.ok(!clean.includes('/a/'),'Release visual CSS must never target generated App routes');
assert.ok(!clean.includes('/website/'),'Release visual CSS must never target generated Website routes');

const allowedRoots=['.releasePage','.publishPage','.storeReadinessDock'];
let selectorCount=0;
for(const match of clean.matchAll(/([^{}]+)\{/g)){
  const header=match[1].trim();
  if(!header||header.startsWith('@'))continue;
  for(const selector of header.split(',')){
    const s=selector.trim();
    selectorCount+=1;
    assert.ok(allowedRoots.some(root=>s.startsWith(root)),`Unscoped selector is forbidden in release shell: ${s}`);
  }
}
assert.ok(selectorCount>=40,'Release shell selector scope check must cover the complete visual layer');

assert.match(release,/`\/website\/\$\{appId\}`/,'Release Center must keep customer Website navigation separate from LANERIQ shell styling');
assert.match(release,/`\/a\/\$\{appId\}\?install=1`/,'Release Center must keep customer App navigation separate from LANERIQ shell styling');
assert.match(publish,/Nothing has been submitted to the store yet/,'Store flow must remain truthful about external submission state');
assert.match(readiness,/Official App Store \/ Google Play submission remains/,'Readiness dock must retain external-store truth boundary');

console.log('✓ Big Moon Valley now carries through LANERIQ Release Center, Store Publish and Store Readiness shells');
console.log('✓ Release controls preserve premium glass, 44/48px mobile targets, 16px inputs and iPhone safe areas');
console.log(`✓ ${selectorCount} release-shell selectors are scoped to LANERIQ tooling; generated /a and /website customer surfaces are untouched`);
console.log('✓ Store submission truth boundaries remain intact; visual continuity does not imply external store completion');
