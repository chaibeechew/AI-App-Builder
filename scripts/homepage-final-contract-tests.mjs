import fs from "node:fs";

const languageRuntime = fs.readFileSync("app/components/LanguageRuntime.js", "utf8");
const mobileCss = fs.readFileSync("app/home-signature-mobile-final.css", "utf8");
const layout = fs.readFileSync("app/layout.js", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

const must = (condition, message) => {
  if (!condition) throw new Error(message);
};

must(languageRuntime.includes('.premiumHome .bottomNav'), "Language selector must target homepage bottom navigation.");
must(languageRuntime.includes('mounted && buttonTarget ? createPortal'), "Language selector must avoid pre-hydration floating output.");
must(mobileCss.includes('grid-template-columns:repeat(6'), "Homepage bottom navigation must reserve a language slot.");
must(mobileCss.includes("url('/laneriq-future-city-people.webp')"), "Future city artwork must be the final homepage background.");
must(mobileCss.includes('white-space:nowrap!important'), "LANERIQ AI wordmark must stay on one mobile line.");
must(layout.includes('home-signature-mobile-final.css'), "Final mobile homepage CSS must be imported.");
must(layout.includes('/laneriq-future-city-people.webp'), "Future city artwork must be preloaded.");
must(packageJson.scripts?.prebuild === 'node scripts/prepare-home-background.mjs', "Homepage artwork must be prepared before build.");

console.log("LANERIQ homepage final contract: PASS");
