import assert from 'node:assert/strict';
import fs from 'node:fs';

const layout=fs.readFileSync('app/layout.js','utf8');
const coordinator=fs.readFileSync('app/components/LIUIRealProductSurface.js','utf8');
const css=fs.readFileSync('app/liui-real-product-surface.css','utf8');
const home=fs.readFileSync('app/page.js','utf8');
const editor=fs.readFileSync('app/editor/[id]/page.js','utf8');
const operations=fs.readFileSync('app/operations/[id]/page.js','utf8');
const publish=fs.readFileSync('app/publish/[id]/page.js','utf8');

assert.match(layout,/liui-real-product-surface\.css/,'LIUI override stylesheet must load last');
assert.match(layout,/LIUIRealProductSurface/,'LIUI runtime coordinator must be mounted');
assert.match(coordinator,/usePathname/,'Surface coordinator must follow actual route changes');
for(const surface of ['creation','editor','quality','publish','launch','preview']) assert.match(coordinator,new RegExp(`"${surface}"`),`Missing ${surface} surface mapping`);
for(const label of ['Home','Create','Creations','Templates','More']) assert.match(coordinator,new RegExp(`label: "${label}"`),`Missing ${label} in canonical mobile nav`);

assert.match(css,/body\[data-liui-surface="creation"\] \.premiumHome \.promptCard\{order:3\}/,'Main prompt must be ordered before creative image entries');
assert.match(css,/body\[data-liui-surface="creation"\] \.premiumHome \.featureCards\{order:4\}/,'Create/Design image entries must be below the main prompt');
assert.match(css,/\.promptCard textarea[\s\S]*#fffdf6/,'Primary prompt input must use a light/warm readable surface');
assert.match(css,/backdrop-filter:blur\(22px\)/,'Priority surfaces must use semi-transparent intelligence glass');
assert.match(css,/url\('\/laneriq-future-city-people\.webp'\)/,'Priority surfaces must use a contextual cinematic background');
assert.match(css,/prefers-reduced-motion/,'LIUI surface must honor reduced-motion accessibility');

for(const marker of ['/api/orchestrate','/api/generate','stableCreateRequestId','CREATE_REQUEST_KEY']) assert.ok(home.includes(marker),`Real generation/recovery marker missing after UI work: ${marker}`);
assert.match(editor,/\/api\/modify/,'Page 13 must retain the real AI modify API');
assert.match(editor,/Create a new version|new version/i,'Page 13 must preserve version-before-change behavior');
assert.match(operations,/assessBuildQuality/,'Page 17 must retain real quality assessment');
assert.match(operations,/owner_id/,'Page 17 must remain owner-scoped');
assert.match(publish,/\/api\/publish\/request/,'Page 18 must retain real publish-request API');
assert.match(publish,/Nothing has been submitted to the store yet/i,'Page 18 must retain truthful store evidence wording');
assert.match(publish,/customer_approved_at/,'Page 18 must retain customer approval gating');

assert.doesNotMatch(css,/display:\s*none[^}]*\.error/i,'LIUI must not hide error states');
assert.doesNotMatch(coordinator,/fetch\(/,'Navigation coordinator must not add network calls or spend');

console.log('✓ LIUI runtime coordinator is mounted on real priority routes');
console.log('✓ Canonical mobile navigation is Home / Create / Creations / Templates / More');
console.log('✓ Main prompt is warm/light and Create/Design image entries are below it');
console.log('✓ Editor, Quality and Publish keep their real APIs, ownership and evidence boundaries');
console.log('✓ Cinematic glass UI and reduced-motion accessibility are enforced without replacing engines');
