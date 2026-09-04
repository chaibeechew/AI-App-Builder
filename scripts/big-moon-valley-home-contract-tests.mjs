import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const layout=read('app/layout.js');
const finalHomeCss=read('app/home-signature-mobile-final.css');
const liuiCss=read('app/liui-real-product-surface.css');
const liuiHome=read('app/home-liui-v5.css');
const engine=read('app/components/AdaptiveWallpaperEngine.js');
const coordinator=read('app/components/LIUIRealProductSurface.js');
const home=read('app/page.js');
const futureCity=fs.readFileSync(path.join(root,'public/laneriq-future-city-people.webp'));

// LIUI-2026.2 is the active visual authority. Historical Big Moon styles may remain in the
// repository for compatibility, but they must load before and yield to the current LIUI layers.
const legacyIndex=layout.indexOf('big-moon-valley-journey.css');
const liuiIndex=layout.indexOf('liui-real-product-surface.css');
const homeLiuiIndex=layout.indexOf('home-liui-v5.css');
assert.ok(legacyIndex>=0,'Historical compatibility layer may remain available');
assert.ok(liuiIndex>legacyIndex,'LIUI product surface must load after historical Big Moon compatibility CSS');
assert.ok(homeLiuiIndex>liuiIndex,'Home LIUI v5 must remain the final homepage presentation authority');

assert.match(layout,/href="\/laneriq-future-city-people\.webp"/,'Approved Future City artwork must be the homepage first-paint preload');
assert.match(finalHomeCss,/url\('\/laneriq-future-city-people\.webp'\)/,'Current homepage authority must use the approved Future City + People artwork');
assert.equal(futureCity.subarray(0,4).toString('ascii'),'RIFF','Future-city asset must have a valid WebP RIFF header');
assert.equal(futureCity.subarray(8,12).toString('ascii'),'WEBP','Future-city asset must be a valid WebP image');
assert.ok(futureCity.length>10000,'Future-city homepage artwork must contain a real image payload');

// Approved Page 1 structure: Hero → Intent Composer → creator shortcuts → Style → Templates → Build CTA.
assert.match(liuiCss,/\.premiumHome \.heroCopy\{order:2\}/,'Hero must remain ahead of the intent surface');
assert.match(liuiCss,/\.premiumHome \.promptCard\{order:3\}/,'Intent Composer must be the first interactive creation surface');
assert.match(liuiCss,/\.premiumHome \.featureCards\{order:4\}/,'Create Image / Design UI shortcuts must follow the intent composer');
assert.match(liuiCss,/\.premiumHome \.choiceCard:not\(\.templateCard\)\{order:5\}/,'Style controls must follow creator shortcuts');
assert.match(liuiCss,/\.premiumHome \.templateCard\{order:6\}/,'Template strip must follow style controls');
assert.match(liuiCss,/\.premiumHome \.buildCta\{order:7\}/,'Primary Build CTA must remain the dominant final action in the home stack');
assert.match(liuiHome,/Tell LANERIQ AI what you want to build/,'Intent Composer copy must remain intent-first');
assert.match(liuiHome,/Create Image/,'Create Image shortcut must remain visible');
assert.match(liuiHome,/Design UI/,'Design UI shortcut must remain visible');
assert.match(liuiHome,/BUILD APP • GAME • WEB/,'Primary build CTA must preserve the approved product scope');

// Canonical primary navigation is the approved five-item LIUI information architecture.
const expectedNav=['Home','Projects','Create','Templates','More'];
let cursor=-1;
for(const label of expectedNav){const next=coordinator.indexOf(`label: "${label}"`,cursor+1);assert.ok(next>cursor,`Canonical navigation must preserve ${expectedNav.join(' / ')} order`);cursor=next;}

// Big Moon Valley is retired from the active shell. Old saved moon choices migrate to LIUI fallback,
// the current wallpaper picker hides the retired preset, and Page 1 cannot be overwritten by the engine.
assert.match(engine,/RETIRED_BIG_MOON_PRESET="moon-city"/,'Historical moon preset must be explicitly marked retired');
assert.match(engine,/LIUI_FALLBACK_PRESET="neon-skyline"/,'Retired moon preferences must migrate to a non-moon LIUI fallback');
assert.match(engine,/if\(hidden\|\|homeSignatureSurface\(\)\)return/,'Wallpaper engine must not override the approved homepage visual authority');
assert.match(engine,/filter\(item=>item\.id!==RETIRED_BIG_MOON_PRESET\)/,'Current wallpaper picker must hide the retired Big Moon preset');
assert.doesNotMatch(engine,/Big Moon Valley at home/,'Retired Big Moon homepage wording must not return');

// Creation journey remains real and connected; the visual change must not remove Plan/Preview state.
assert.match(home,/screen==="plan"&&<section className="journeyPanel"/,'Plan state must remain connected to the real creation journey');
assert.match(home,/screen==="preview"&&<section className="journeyPanel"/,'Preview state must remain connected to the real creation journey');
assert.match(home,/\/api\/orchestrate/,'Homepage journey must retain the real orchestrate path');
assert.match(home,/\/api\/generate/,'Homepage journey must retain the real generate path');

console.log('✓ LIUI-2026.2 is locked as the active LANERIQ AI visual authority');
console.log('✓ Future City + People remains Page 1 first paint; Big Moon is retired from the active shell');
console.log('✓ Home stack is Hero → Intent Composer → Create Image/Design UI → Style → Templates → Build CTA');
console.log('✓ Canonical navigation is Home / Projects / Create / Templates / More');
console.log('✓ Real Plan/Build/Preview generation paths remain connected');
