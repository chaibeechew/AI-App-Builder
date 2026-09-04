import fs from "node:fs";
const runtime=fs.readFileSync("app/components/LanguageRuntime.js","utf8");
const liui=fs.readFileSync("app/home-liui-v5.css","utf8");
const inputSafety=fs.readFileSync("app/home-mobile-input-safety.css","utf8");
const layout=fs.readFileSync("app/layout.js","utf8");
const assert=(v,m)=>{if(!v)throw new Error(m)};

assert(runtime.includes('mounted && portalTarget ? createPortal'),"language must wait for mounted portal target");
assert(runtime.includes('mounted && !inHome ? button : null'),"homepage must not render a detached floating language pill");

assert(layout.includes('import "./home-liui-v5.css"'),"LIUI-2026.2 must be the final homepage visual authority");
for(const retired of ['home-water-premium.css','home-water-static.css','home-signature-mobile-final.css','home-big-moon-valley.css','local-first-cost-control.css']){
  assert(!layout.includes(retired),`retired homepage layer must not load: ${retired}`);
}
assert(layout.includes('href="/laneriq-future-city-people.webp"'),"Future City + People must remain the sole first-paint preload");
assert(liui.includes("url('/laneriq-future-city-people.webp')"),"LIUI homepage must own Future City + People artwork");
assert(!liui.includes('laneriq-water-home.svg'),"retired water artwork must not return through LIUI");
assert(!liui.includes('moon-city'),"retired moon-city preset must not return through LIUI");

assert(liui.includes('min-height:clamp(250px,34svh,330px)!important'),"mobile hero must stay bounded so intent is reachable quickly");
assert(!/min-height:\s*(470|500)px!important/.test(liui),"LIUI must not restore the oversized legacy mobile hero");
assert(liui.includes('padding-bottom:max(184px,calc(154px + env(safe-area-inset-bottom)))!important'),"mobile Page 1 must reserve safe space above fixed navigation");
assert(liui.includes('.promptCard{order:2}'),"Intent Composer must follow Hero");
assert(liui.includes('.featureCards{order:3}'),"creator tools must follow Intent Composer");
assert(liui.includes('.choiceCard:not(.templateCard){order:4}'),"Style must follow creator tools");
assert(liui.includes('.templateCard{order:5}'),"Templates must follow Style");
assert(liui.includes(':where(.buildCta,.buildProgress){order:6}'),"Build CTA/progress must remain the final primary action");

assert(/\.premiumHome \.promptCard textarea[\s\S]*font-size:max\(16px,1em\)!important/.test(liui),"LIUI prompt textarea must stay at least 16px on iPhone");
assert(/font-size:\s*16px\s*!important/.test(inputSafety),"mobile editable-control safety layer must force 16px controls");
assert(liui.includes('.premiumHome .topActions > a.credits'),"No-Credits launch policy must stay inside active LIUI");
assert(liui.includes('display:none!important'),"Credits must remain hidden from the primary launch journey");

console.log("✓ LANERIQ LIUI-2026.2 homepage mobile polish: PASS");
console.log("✓ Future City + People is the only Page 1 first-paint artwork");
console.log("✓ Retired water/moon/signature layers are absent from the runtime contract");
console.log("✓ Intent-first order, iPhone 16px input safety and bottom safe-area spacing are locked");
