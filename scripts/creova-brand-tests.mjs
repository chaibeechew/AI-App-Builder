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

assert(brand.includes('name: "CREOVA AI"'),"CREOVA AI must be the customer-facing master brand.");
assert(brand.includes('capabilities: "APPS • GAMES • WEB"'),"The three core creation categories must be explicit.");
assert(brand.includes('descriptor: "3-in-1 AI Creation Platform"'),"3-in-1 positioning is missing.");
assert(brand.includes('tagline: "Create Anything. From One Idea."'),"Canonical CREOVA AI tagline is missing.");
pass("CREOVA AI canonical identity is defined in one shared brand contract");

assert(layout.includes('../lib/product-brand.js'),"Root metadata must use the shared CREOVA AI brand contract.");
assert(layout.includes('PRODUCT_BRAND.capabilities')&&layout.includes('PRODUCT_BRAND.tagline'),"Root metadata must expose the new capabilities and tagline.");
pass("Page metadata uses CREOVA AI · APPS • GAMES • WEB");

assert(copy.includes('AI BUILD APP')&&copy.includes('PRODUCT_BRAND.name'),"Legacy customer brand migration must remain supported.");
assert(copy.includes('PRODUCT_BRAND.capabilities')&&copy.includes('PRODUCT_BRAND.descriptor'),"Homepage hero must be migrated to the new 3-in-1 identity.");
assert(copy.includes('CREATE APP • GAME • WEB'),"Primary creation CTA must cover all three product types.");
pass("Legacy visible copy migrates to CREOVA AI without changing internal technical IDs");

assert(account.includes('PRODUCT_BRAND.name')&&account.includes('PRODUCT_BRAND.capabilities'),"Account navigation must show CREOVA AI.");
assert(capability.includes('PRODUCT_BRAND.descriptor')&&capability.includes('App</b>, <b>Game</b> or <b>Website'),"Homepage capability banner must present the 3-in-1 product clearly.");
pass("Primary customer-facing navigation and capability surfaces use CREOVA AI");

console.log("CREOVA AI brand gate passed: CREOVA AI · APPS • GAMES • WEB · Create Anything. From One Idea.");
