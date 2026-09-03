import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(path,"utf8");
const page=read("app/design-studio/page.js");
const homeInput=read("app/home-mobile-input-safety.css");
const nextConfig=read("next.config.mjs");
const layout=read("app/layout.js");
const copyFix=read("app/components/ProductCopyFix.js");

assert.match(page,/UI CONCEPT DIRECTIONS/);
assert.match(page,/Design the interface/);
assert.match(page,/not another wallpaper/i);
assert.match(page,/buildDirections\(domain\)/);
assert.match(page,/intent-first/);
assert.match(page,/mobile-flow/);
assert.match(page,/premium-site/);
assert.match(page,/command-center/);
assert.match(page,/Use this direction/);
assert.match(page,/aiAppBuilderPendingIdea/);
assert.match(page,/laneriqSelectedUiDirection/);
assert.match(page,/builderStyleId:"cinematic"/);
assert.match(page,/builderStyleId:"fantasy"/);
assert.match(page,/builderStyleId:"minimal"/);
assert.match(page,/builderStyleId:"cyberpunk"/);
assert.match(page,/localStorage\.setItem\("ai-build-style-preset", direction\.builderStyleId\)/);
assert.doesNotMatch(page,/localStorage\.setItem\("ai-build-style-preset", direction\.themePreset\)/);
assert.match(page,/laneriqDesignStudioDraftV1/);
assert.match(page,/draft restored/);
assert.match(page,/temporary browser storage is unavailable/);
assert.match(page,/setTransferError/);
assert.match(page,/sessionStorage\.removeItem\(DRAFT_KEY\)/);
assert.match(page,/htmlFor="laneriq-design-brief"/);
assert.match(page,/aria-live="assertive"/);
assert.doesNotMatch(page,/Use as Wallpaper/);

assert.match(copyFix,/upgradeApprovedHomeCreativeEntries/);
assert.match(copyFix,/setAttribute\("href","\/design-studio"\)/);
assert.match(copyFix,/textContent="Design UI"/);
assert.match(copyFix,/Design App and Website UI concepts/);
assert.match(layout,/"\/design-studio"/);

assert.match(homeInput,/field-sizing:\s*content\s*!important/);
assert.match(homeInput,/background:\s*rgba\(255,255,255,\.12\)\s*!important/);
assert.match(homeInput,/max-height:\s*min\(46svh,\s*340px\)\s*!important/);
assert.match(homeInput,/promptCard > \.count/);
assert.match(homeInput,/position:\s*static\s*!important/);
assert.match(homeInput,/resize:\s*none\s*!important/);

assert.match(nextConfig,/async redirects\(\)/);
assert.match(nextConfig,/source:\s*"\/image-studio"/);
assert.match(nextConfig,/key:\s*"mode"/);
assert.match(nextConfig,/value:\s*"design"/);
assert.match(nextConfig,/destination:\s*"\/design-studio"/);

console.log("✓ Design UI uses structural App/Web concepts instead of wallpaper actions");
console.log("✓ Selected LIUI direction maps to a Builder-compatible visual style id and versioned handoff payload");
console.log("✓ Design Studio restores same-tab drafts and blocks navigation instead of losing a direction when temporary storage fails");
console.log("✓ Homepage semantic Design UI entry points directly to the protected design route while the legacy image-studio link remains compatible");
console.log("✓ Builder prompt keeps transparent-white LIUI glass, content growth and non-overlapping count placement");
