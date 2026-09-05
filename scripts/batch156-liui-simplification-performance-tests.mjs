import assert from "node:assert/strict";
import fs from "node:fs";

const layout = fs.readFileSync("app/layout.js", "utf8");
const css = fs.readFileSync("app/liui-simplification-performance.css", "utf8");
const adaptive = fs.readFileSync("app/components/LIUIAdaptiveExperienceLayer.js", "utf8");
const runtime = fs.readFileSync("app/components/LIUIRuntimeCapabilityLayer.js", "utf8");
const context = fs.readFileSync("app/components/LIUIContextIntelligence.js", "utf8");

assert.match(layout, /liui-simplification-performance\.css/);
assert.match(css, /content-visibility:auto/);
assert.match(css, /data-liui-keyboard=\"open\"/);
assert.match(css, /data-liui-decision-layer=\"present\"/);
assert.match(css, /prefers-reduced-transparency/);
assert.match(css, /prefers-reduced-motion/);
assert.match(adaptive, /visualViewport/);
assert.match(adaptive, /laneriq:intent-continuity/);
assert.match(adaptive, /laneriq:recovery-policy/);
assert.match(runtime, /decisionPresent/);
assert.match(runtime, /criticalStates/);
assert.match(context, /liuiContextDetails/);

// Subtraction must not delete safety/accessibility primitives.
assert.match(runtime, /liuiSkipLink/);
assert.match(runtime, /aria-live/);
assert.match(context, /Human approval required before consequential actions/);

console.log("Batch 156 LIUI simplification + performance contract passed");