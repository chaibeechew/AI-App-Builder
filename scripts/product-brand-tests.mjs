import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const brand=read("lib/product-brand.js");
const layout=read("app/layout.js");
const copy=read("app/components/ProductCopyFix.js");
const seo=read("lib/seo-foundation.js");
const seoPage=read("app/components/SeoLandingPage.js");
const account=read("app/components/AccountNav.js");
const capability=read("app/components/CreationCapabilityBanner.js");

function assert(condition,message){if(!condition)throw new Error(message);}
function pass(message){console.log(`✓ ${message}`);}

assert(brand.includes('name: "LANERIQ AI"'),"LANERIQ AI must be the canonical customer-facing brand.");
assert(brand.includes('productLine: "Build App Web & Game"'),"Homepage product line is missing.");
assert(brand.includes('capabilities: "APPS • GAMES • WEB"'),"The three core creation categories must remain explicit.");
assert(brand.includes('descriptor: "3-in-1 AI Creation Platform"'),"3-in-1 positioning is missing.");
assert(brand.includes('tagline: "Create Anything. From One Idea."'),"Canonical tagline is missing.");
assert(brand.includes('"AI BUILD APP & WEB"')&&brand.includes('"CREOVA AI"'),"Previous names must remain migration-only aliases.");
pass("LANERIQ AI identity and homepage product line are locked in one shared brand contract");

assert(layout.includes('const discoveryTitle = `${PRODUCT_BRAND.name} — AI App, Game & Website Builder`'),"Root metadata must derive its title from the shared brand contract.");
assert(layout.includes('PRODUCT_BRAND.capabilities')&&layout.includes('PRODUCT_BRAND.tagline'),"Root metadata must expose capabilities and tagline.");
pass("Root metadata resolves from the shared LANERIQ AI brand contract");

assert(copy.includes('PRODUCT_BRAND.name')&&copy.includes('PRODUCT_BRAND.productLine'),"Homepage hero must resolve from the shared LANERIQ AI contract.");
assert(copy.includes('PRODUCT_BRAND.descriptor')&&copy.includes('PRODUCT_BRAND.tagline'),"Homepage descriptor and tagline must resolve from the shared contract.");
assert(copy.includes('BUILD APP + WEBSITE'),"Normal-mode primary CTA must remain App + Website only.");
assert(copy.includes('compactCreativeEntry'),"Create/Design image tools must remain secondary compact homepage entries.");
pass("Homepage keeps Game in the brand promise while normal creation remains App + Website");

assert(seo.includes('const brand = PRODUCT_BRAND.name'),"SEO copy must derive customer brand text from the shared brand contract.");
assert(seoPage.includes('{PRODUCT_BRAND.name}'),"SEO page chrome must render the shared brand contract.");
pass("SEO titles, landing pages and structured data resolve to LANERIQ AI");

assert(account.includes('PRODUCT_BRAND.name')&&account.includes('PRODUCT_BRAND.capabilities'),"Account navigation must use the shared brand contract.");
assert(capability.includes('PRODUCT_BRAND.productLine'),"Homepage capability area must use the shared product line.");
assert(capability.includes('Pro Game Creator')&&capability.includes('Become Pro'),"Game creation must remain clearly Pro-gated.");
pass("Primary customer-facing navigation and capability surfaces use LANERIQ AI");

console.log("LANERIQ AI brand gate passed: LANERIQ AI · Build App Web & Game · 3-in-1 AI Creation Platform · Create Anything. From One Idea.");
