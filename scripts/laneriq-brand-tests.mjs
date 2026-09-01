import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const brand=read("lib/product-brand.js");
const layout=read("app/layout.js");
const copy=read("app/components/ProductCopyFix.js");
const account=read("app/components/AccountNav.js");
const capability=read("app/components/CreationCapabilityBanner.js");

function assert(condition,message){if(!condition)throw new Error(message);}
function pass(message){console.log(`✓ ${message}`);}

assert(brand.includes('name: "LANERIQ AI"'),"LANERIQ AI must be the customer-facing master brand.");
assert(brand.includes('capabilities: "APPS • GAMES • WEB"'),"The three core creation categories must be explicit.");
assert(brand.includes('descriptor: "3-in-1 AI Creation Platform"'),"3-in-1 positioning is missing.");
assert(brand.includes('tagline: "Create Anything. From One Idea."'),"Canonical LANERIQ AI tagline is missing.");
assert(brand.includes('chineseCapabilities: "APP • 游戏 • WEB"'),"Chinese capability lockup is missing.");
assert(brand.includes('chineseTagline: "一个想法，创造一切。"'),"Chinese LANERIQ AI tagline is missing.");
assert(brand.includes('"CREOVA AI"'),"CREOVA AI must remain a migration-only legacy alias.");
pass("LANERIQ AI canonical English and Chinese identity is defined in one shared brand contract");

assert(layout.includes('../lib/product-brand.js'),"Root metadata must use the shared LANERIQ AI brand contract.");
assert(layout.includes('PRODUCT_BRAND.capabilities')&&layout.includes('PRODUCT_BRAND.tagline'),"Root metadata must expose the new capabilities and tagline.");
pass("Page metadata resolves to LANERIQ AI · APPS • GAMES • WEB");

assert(copy.includes('CREOVA AI')&&copy.includes('AI BUILD APP')&&copy.includes('PRODUCT_BRAND.name'),"Legacy customer brand migration must remain supported.");
assert(copy.includes('PRODUCT_BRAND.capabilities')&&copy.includes('PRODUCT_BRAND.descriptor'),"Homepage hero must resolve to the new 3-in-1 identity.");
assert(copy.includes('CREATE APP • GAME • WEB'),"Primary creation CTA must cover all three product types.");
assert(copy.includes('laneriqBrand'),"Runtime brand hydration must use LANERIQ identity markers.");
pass("Legacy visible copy migrates to LANERIQ AI without changing internal technical IDs");

assert(account.includes('PRODUCT_BRAND.name')&&account.includes('PRODUCT_BRAND.capabilities'),"Account navigation must show LANERIQ AI.");
assert(capability.includes('PRODUCT_BRAND.descriptor')&&capability.includes('App</b>, <b>Website</b> or <b>Mobile Game'),"Homepage capability banner must present apps, websites and mobile games clearly.");
pass("Primary customer-facing navigation and capability surfaces use LANERIQ AI");

console.log("LANERIQ AI brand gate passed: LANERIQ AI · APPS • GAMES • WEB · Create Anything. From One Idea.");
