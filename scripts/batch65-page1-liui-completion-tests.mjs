import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LANERIQ_GLOBAL_NAV,
  LANERIQ_APPROVED_HOME_STACK,
  LANERIQ_APPROVED_CREATION_JOURNEY,
  LANERIQ_18_PAGE_DESIGN_RULES,
} from '../lib/product/laneriq-18-page-master.js';

const home=fs.readFileSync('app/page.js','utf8');
const finalCss=fs.readFileSync('app/home-liui-v5.css','utf8');
const wallpaper=fs.readFileSync('app/components/AdaptiveWallpaperEngine.js','utf8');
const generatedStandard=fs.readFileSync('lib/design/generated-experience-standard.js','utf8');
const coordinator=fs.readFileSync('app/components/LIUIRealProductSurface.js','utf8');
const layout=fs.readFileSync('app/layout.js','utf8');
const doc=fs.readFileSync('docs/LANERIQ_AI_18_PAGE_MASTER_PRODUCT_SPEC.md','utf8');

// Real Page 1 engine is preserved.
for(const marker of ['/api/orchestrate','/api/generate','stableCreateRequestId','CREATE_REQUEST_KEY']) {
  assert.ok(home.includes(marker),`Page 1 real generation/recovery marker missing: ${marker}`);
}

// Page 1 is natively LIUI in the DOM, not an old page hidden under CSS pseudo-copy.
for(const marker of ['<span>LANERIQ AI</span>','<strong>LIVING INTELLIGENCE</strong>','Build App • Game • Web','Tell LANERIQ AI what you want to create.','<b>Create Image</b>','<b>Design UI</b>','BUILD APP • GAME • WEB']){
  assert.ok(home.includes(marker),`Native LIUI Page 1 copy missing: ${marker}`);
}
assert.ok(home.indexOf('className="promptCard"')<home.indexOf('className="featureCards"'),'Intent Composer must precede creator tools in the real DOM');
for(const label of ['Home','Projects','Create','Templates','More']) assert.ok(home.includes(`<span>${label}</span>`),`Native Page 1 nav missing ${label}`);
assert.doesNotMatch(home,/AI BUILD<|APP & WEB<|Create Images<|Design Images</,'Retired Page 1 copy must not remain in the active DOM');
assert.doesNotMatch(home,/moon-city/i,'Retired wallpaper preset must not remain in Page 1 runtime');

// Approved first paint is the current LIUI artwork.
assert.match(finalCss,/url\('\/laneriq-future-city-people\.webp'\)!important/,'Final homepage CSS must own Future City + People first paint');
assert.match(layout,/preload[^>]+laneriq-future-city-people\.webp/,'Future City + People artwork must remain preloaded');
assert.doesNotMatch(finalCss,/min-height:\s*(470|500)px/,'Mobile hero must not consume most of the first viewport');
assert.match(finalCss,/min-height:clamp\(250px,34svh,330px\)!important/,'Mobile hero must use bounded intent-first height');
assert.doesNotMatch(finalCss,/content:\s*['"](?:LANERIQ AI|LIVING INTELLIGENCE|Create Image|Design UI|BUILD APP)/i,'LIUI copy must render directly rather than through pseudo-element overlays');

// Final visual order stays Intent-first as a regression guard even though DOM order is now native.
assert.match(finalCss,/\.promptCard\{order:2\}/,'Intent Composer must come immediately after Hero');
assert.match(finalCss,/\.featureCards\{order:3\}/,'Create Image / Design UI must follow Intent Composer');
assert.match(finalCss,/\.choiceCard:not\(\.templateCard\)\{order:4\}/,'Style must follow creator tools');
assert.match(finalCss,/\.templateCard\{order:5\}/,'Templates must follow Style');
assert.match(finalCss,/:where\(\.buildCta,\.buildProgress\)\{order:6\}/,'Build CTA/progress must remain the final primary action');

// LIUI-only rule: Page 1 cannot be replaced by the adaptive wallpaper runtime or generation fallback.
assert.match(wallpaper,/if\(hidden\|\|homeSurface\(\)\)return/,'Wallpaper runtime must never replace Page 1 first paint');
assert.doesNotMatch(wallpaper,/big-moon-valley|moon-city/i,'Legacy Page 1 design identifiers must not remain in the wallpaper runtime');
assert.doesNotMatch(generatedStandard,/moon-city/i,'Retired wallpaper fallback must not remain in generated-experience standard');
assert.match(generatedStandard,/wallpaperPreset:profile\.wallpaperCycle\?\.\[0\]\|\|"golden-valley"/,'Generated experience fallback must use an active LIUI-era preset');

// LIUI-2026.2 global IA and Page 1 product contract.
assert.deepEqual(LANERIQ_GLOBAL_NAV.map(item=>item.label),['Home','Projects','Create','Templates','More']);
assert.deepEqual(LANERIQ_APPROVED_HOME_STACK,['Hero','Intent Composer','Create Image / Design UI','Style','Templates','Build CTA']);
assert.deepEqual(LANERIQ_APPROVED_CREATION_JOURNEY,['Idea','Plan','Build','Preview','Launch','Manage']);
assert.equal(LANERIQ_18_PAGE_DESIGN_RULES.legacyDesignCompatibility,false);
assert.equal(LANERIQ_18_PAGE_DESIGN_RULES.homeFirstPaint,'Future City + People');
for(const label of ['Home','Projects','Create','Templates','More']) assert.ok(coordinator.includes(`label: "${label}"`),`Canonical nav missing ${label}`);
assert.match(doc,/Home \/ Projects \/ Create \/ Templates \/ More/);
assert.match(doc,/Hero → Intent Composer → Create Image \/ Design UI → Style → Templates → Build CTA/);
assert.match(doc,/LIUI-2026\.2 is the only active LANERIQ AI design authority/i);

// Fixed navigation must not cover the final CTA at the bottom of mobile Page 1.
assert.match(finalCss,/padding-bottom:max\(184px,calc\(154px \+ env\(safe-area-inset-bottom\)\)\)!important/,'Mobile Page 1 must reserve space for canonical bottom navigation');

console.log('✓ Batch 65 Page 1 LIUI-only completion contract passed');
console.log('✓ Page 1 DOM itself is LIUI-2026.2; no legacy copy is hidden under pseudo-elements');
console.log('✓ Future City + People owns homepage first paint with no retired wallpaper fallback');
console.log('✓ Intent Composer precedes creator tools, Style, Templates and Build CTA');
console.log('✓ Canonical navigation is Home / Projects / Create / Templates / More');
console.log('✓ Real generate/orchestrate/recovery behavior remains intact');
