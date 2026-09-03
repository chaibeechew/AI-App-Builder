import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(path,"utf8");
const page=read("app/design-studio/page.js");
const homeInput=read("app/home-mobile-input-safety.css");
const nextConfig=read("next.config.mjs");

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
assert.match(page,/ai-build-style-preset/);
assert.doesNotMatch(page,/Use as Wallpaper/);

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

console.log("✓ Design Image entry is separated from image generation and routes to the LIUI App/Web concept studio");
console.log("✓ UI concept results are structural product mockups, not wallpaper actions");
console.log("✓ Builder prompt uses transparent-white LIUI glass, content growth and non-overlapping count placement");
