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

// Real Page 1 engine is preserved.
for(const marker of ['/api/orchestrate','/api/generate','stableCreateRequestId','CREATE_REQUEST_KEY']) assert.ok(home.includes(marker),`Page 1 real generation/recovery marker missing: ${marker}`);

// Native Page 1 content is preserved. Reference layout changes geometry, not the product engine.
for(const marker of ['<span>LANERIQ AI</span>','<strong>LIVING INTELLIGENCE</strong>','Build App • Game • Web','Tell LANERIQ AI what you want to create.','<b>Create Image</b>','<b>Design UI</b>','BUILD APP • GAME • WEB']) assert.ok(home.includes(marker),`Native Page 1 copy missing: ${marker}`);
assert.ok(home.indexOf('className="promptCard"')<home.indexOf('className="featureCards"'),'Intent Composer must precede creator tools in the real DOM');
for(const label of ['Home','Projects','Create','Templates','More']) assert.ok(home.includes(`<span>${label}</span>`),`Native Page 1 nav missing ${label}`);
assert.doesNotMatch(home,/AI BUILD<|APP & WEB<|Create Images<|Design Images</,'Retired Page 1 copy must not remain in the active DOM');
assert.doesNotMatch(home,/moon-city/i,'Retired wallpaper preset must not remain in Page 1 runtime');

// Approved first paint and user-approved visual geometry.
assert.match(finalCss,/url\('\/laneriq-future-city-people\.webp'\)!important/,'Reference homepage must retain Future City + People first paint');
assert.match(layout,/preload[^>]+laneriq-future-city-people\.webp/,'Future City + People artwork must remain preloaded');
assert.match(finalCss,/\.frame\{max-width:900px!important/,'Reference Page 1 must use the approved focused mobile-first content width');
assert.match(finalCss,/\.promptCard\{[\s\S]*border-radius:30px!important/,'Reference Page 1 must use the large glass intent composer');
assert.match(finalCss,/\.featureCards\{display:grid!important;grid-template-columns:1fr 1fr!important/,'Create Image / Design UI must use the approved two-card geometry');
assert.match(finalCss,/\.buildCta\{[\s\S]*min-height:82px!important/,'Golden BUILD APP • GAME • WEB action must stay visually dominant');
assert.match(finalCss,/padding-bottom:max\(/,'Page 1 must reserve safe-area space for fixed navigation');
assert.doesNotMatch(finalCss,/content:\s*['"](?:LANERIQ AI|LIVING INTELLIGENCE|Create Image|Design UI|BUILD APP)/i,'Reference copy must render directly rather than through pseudo-element overlays');

// Intent-first order remains locked.
assert.match(finalCss,/\.promptCard\{order:2\}/,'Intent Composer must come immediately after Hero');
assert.match(finalCss,/\.featureCards\{order:3\}/,'Create Image / Design UI must follow Intent Composer');
assert.match(finalCss,/\.choiceCard:not\(\.templateCard\)\{order:4\}/,'Style must follow creator tools');
assert.match(finalCss,/\.templateCard\{order:5\}/,'Templates must follow Style');
assert.match(finalCss,/:where\(\.buildCta,\.buildProgress\)\{order:6\}/,'Build CTA/progress must remain the final primary action');

// Wallpaper runtime cannot replace Page 1 first paint.
assert.match(wallpaper,/if\(hidden\|\|homeSurface\(\)\)return/,'Wallpaper runtime must never replace Page 1 first paint');
assert.doesNotMatch(wallpaper,/big-moon-valley|moon-city/i,'Legacy Page 1 design identifiers must not remain in the wallpaper runtime');
assert.doesNotMatch(generatedStandard,/moon-city/i,'Retired wallpaper fallback must not remain in generated-experience standard');

// Global IA and new reference-layout authority.
assert.deepEqual(LANERIQ_GLOBAL_NAV.map(item=>item.label),['Home','Projects','Create','Templates','More']);
assert.deepEqual(LANERIQ_APPROVED_HOME_STACK,['Hero','Intent Composer','Create Image / Design UI','Style','Templates','Build CTA']);
assert.deepEqual(LANERIQ_APPROVED_CREATION_JOURNEY,['Idea','Plan','Build','Preview','Launch','Manage']);
assert.equal(LANERIQ_18_PAGE_DESIGN_RULES.designAuthority,'USER_APPROVED_18_PAGE_REFERENCE_SET');
assert.equal(LANERIQ_18_PAGE_DESIGN_RULES.referenceLayoutExact,true);
assert.equal(LANERIQ_18_PAGE_DESIGN_RULES.visualSkeletonLocked,true);
assert.equal(LANERIQ_18_PAGE_DESIGN_RULES.noCreditsLaunch,true);
assert.equal(LANERIQ_18_PAGE_DESIGN_RULES.mobileCommunityCompute,false);
assert.equal(LANERIQ_18_PAGE_DESIGN_RULES.legacyDesignCompatibility,false);
for(const label of ['Home','Projects','Create','Templates','More']) assert.ok(coordinator.includes(`label: "${label}"`),`Canonical nav missing ${label}`);
assert.match(coordinator,/2026\.3-reference/,'Shared product shell must identify the approved reference generation');

console.log('✓ Page 1 preserves real generate/orchestrate/recovery behavior');
console.log('✓ User-approved reference geometry owns Page 1 visual layout');
console.log('✓ Future City + People remains Page 1 first paint');
console.log('✓ Intent Composer → creator tools → Style → Templates → Build CTA order is locked');
console.log('✓ Canonical navigation remains Home / Projects / Create / Templates / More');
console.log('✓ No-credits and mobile Community Compute boundaries remain enforced');
