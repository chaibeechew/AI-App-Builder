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
function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(path.join(root,dir),{withFileTypes:true})){
    const rel=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(rel));
    else if(/\.(?:js|jsx|mjs|ts|tsx|css|json)$/.test(entry.name))out.push(rel);
  }
  return out;
}

assert(brand.includes('name: "LANERIQ AI"'),"LANERIQ AI must be the canonical customer-facing brand.");
assert(brand.includes('chineseName: "AI制作APP&WEB"'),"Canonical Chinese brand name is missing.");
assert(brand.includes('capabilities: "APPS • GAMES • WEB"'),"The three core creation categories must be explicit.");
assert(brand.includes('descriptor: "3-in-1 AI Creation Platform"'),"3-in-1 positioning is missing.");
assert(brand.includes('tagline: "Create Anything. From One Idea."'),"Canonical tagline is missing.");
assert(brand.includes('"AI BUILD APP & WEB"')&&brand.includes('"AI APP BUILDER"')&&brand.includes('"CREOVA AI"'),"Previous customer names must remain migration-only aliases.");
pass("Canonical English and Chinese identity is locked in one shared brand contract");

assert(layout.includes('const discoveryTitle = `${PRODUCT_BRAND.name} — AI App, Game & Website Builder`'),"Root metadata must derive its title from the shared brand contract.");
assert(layout.includes('PRODUCT_BRAND.capabilities')&&layout.includes('PRODUCT_BRAND.tagline'),"Root metadata must expose the product capabilities and tagline.");
assert(!layout.includes('LANERIQ AI'),"Root metadata must resolve the canonical name from the shared brand contract.");
pass("Root metadata resolves from LANERIQ AI without a second customer-facing brand");

assert(copy.includes('AI BUILD APP')&&copy.includes('AI APP BUILDER')&&copy.includes('CREOVA AI')&&copy.includes('PRODUCT_BRAND.name'),"Legacy customer brand migration must remain supported.");
assert(copy.includes('PRODUCT_BRAND.capabilities')&&copy.includes('PRODUCT_BRAND.descriptor'),"Homepage hero must resolve from the shared brand contract.");
assert(copy.includes('productBrandReady')&&!copy.includes('laneriqBrand'),"Runtime brand hydration must use generic canonical brand markers.");
assert(copy.includes('CREATE APP • GAME • WEB'),"Primary creation CTA must cover all three product types.");
pass("Retired visible brands migrate to LANERIQ AI without changing internal technical IDs");

assert(!seo.includes('LANERIQ AI'),"SEO content must resolve LANERIQ AI from the shared brand contract.");
assert(!seoPage.includes('LANERIQ AI'),"SEO landing pages must resolve LANERIQ AI from the shared brand contract.");
assert(seo.includes('const brand = PRODUCT_BRAND.name'),"SEO copy must derive customer brand text from the shared brand contract.");
assert(seoPage.includes('{PRODUCT_BRAND.name}'),"SEO page chrome must render the shared brand contract.");
pass("SEO titles, landing pages and structured data resolve to the canonical brand");

const migrationOnly=new Set(["lib/product-brand.js","app/components/ProductCopyFix.js"]);
const leaks=[];
for(const file of [...walk("app"),...walk("lib")]){
  if(migrationOnly.has(file))continue;
  if(/AI BUILD APP\s*&\s*WEB|AI APP BUILDER/i.test(read(file)))leaks.push(file);
}
assert(leaks.length===0,`Retired customer brand leaked into: ${leaks.join(", ")}`);
pass("Customer-facing app/lib source has no retired brand leaks");

assert(account.includes('PRODUCT_BRAND.name')&&account.includes('PRODUCT_BRAND.capabilities'),"Account navigation must use the shared brand contract.");
assert(capability.includes('PRODUCT_BRAND.descriptor')&&capability.includes('App</b>, <b>Website</b> or <b>Mobile Game'),"Homepage capability banner must present apps, websites and mobile games clearly.");
pass("Primary customer-facing navigation and capability surfaces use LANERIQ AI");

console.log("LANERIQ AI brand gate passed: LANERIQ AI · APPS • GAMES • WEB · AI制作APP&WEB");
