import fs from "node:fs";

const runtime = fs.readFileSync("app/components/LanguageRuntime.js", "utf8");
const css = fs.readFileSync("app/home-signature-mobile-final.css", "utf8");
const layout = fs.readFileSync("app/layout.js", "utf8");

const assert = (value, message) => { if (!value) throw new Error(message); };

assert(runtime.includes('mounted && portalTarget ? createPortal'), "Language selector must render only after hydration when docked.");
assert(runtime.includes('mounted && !inHome ? button : null'), "Homepage must not show a temporary floating language pill.");
assert(css.includes('grid-template-columns:repeat(6'), "Bottom navigation must reserve six slots including language.");
assert(css.includes("url('/laneriq-future-city-people.webp')"), "Future city artwork must remain the homepage background.");
assert(css.includes('white-space:nowrap!important'), "LANERIQ AI signature must stay on one mobile line.");
assert(css.includes('content:"✦ 120 Credits"'), "Credits pill must use a single compact label.");
assert(layout.includes('home-signature-mobile-final.css'), "Final mobile authority stylesheet must be loaded.");
assert(layout.includes('/laneriq-future-city-people.webp'), "Future city artwork must be preloaded.");

console.log("LANERIQ homepage mobile polish contract: PASS");
