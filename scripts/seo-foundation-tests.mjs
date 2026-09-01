import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const seo = read("lib/seo-foundation.js");
const layout = read("app/layout.js");
const sitemap = read("app/sitemap.js");
const robots = read("app/robots.js");
const component = read("app/components/SeoLandingPage.js");
const brand = read("lib/product-brand.js");

const slugs = [
  "ai-app-game-website-builder",
  "ai-app-builder",
  "ai-game-builder",
  "ai-website-builder",
  "create-app-with-ai",
  "create-game-with-ai",
  "mobile-app-builder",
  "no-code-ai-builder",
];

assert.match(brand, /name: "LANERIQ AI"/);
assert.match(brand, /productLine: "Build App Web & Game"/);
assert.match(layout, /discoveryTitle = `\$\{PRODUCT_BRAND\.name\} — AI App, Game & Website Builder`/);
assert.match(layout, /SEO_CORE_KEYWORDS/);
assert.match(layout, /NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION/);
assert.match(layout, /buildSoftwareJsonLd/);
assert.match(layout, /application\/ld\+json/);
assert.match(seo, /SoftwareApplication/);
assert.match(seo, /const brand = PRODUCT_BRAND\.name/);
console.log("✓ Root metadata targets AI app, game and website discovery using LANERIQ AI");

for (const keyword of ["AI app builder", "AI game builder", "AI website builder", "create app with AI", "create game with AI", "no code AI app builder", "AI mobile app builder", "AI app game website builder"]) {
  assert.ok(seo.includes(`\"${keyword}\"`), `Missing SEO keyword: ${keyword}`);
}
for (const slug of slugs) {
  const file = `app/${slug}/page.js`;
  assert.equal(fs.existsSync(path.join(root, file)), true, `Missing SEO landing page: ${file}`);
  const source = read(file);
  assert.ok(source.includes(`buildSeoMetadata(\"${slug}\")`), `Missing page metadata for ${slug}`);
  assert.ok(source.includes(`slug=\"${slug}\"`), `Missing server-rendered SEO page content for ${slug}`);
}
assert.match(component, /<h1>\{page\.heading\}<\/h1>/);
assert.match(component, /Common questions/);
assert.match(component, /Truth boundary/);
assert.match(component, /PRODUCT_BRAND\.name/);
console.log("✓ Eight differentiated, server-rendered SEO landing pages cover high-intent discovery queries");

assert.match(robots, /SEO_INDEXING_ENABLED/);
assert.match(robots, /disallow: "\/"/);
assert.match(robots, /\/api\//);
assert.match(robots, /\/a\//);
assert.match(sitemap, /SEO_INDEXING_ENABLED/);
assert.match(sitemap, /SEO_SITEMAP_PATHS/);
assert.match(seo, /NEXT_PUBLIC_SITE_URL/);
assert.match(seo, /NEXT_PUBLIC_SEO_INDEXING_ENABLED/);
console.log("✓ Search indexing fails closed until a real HTTPS site URL and explicit indexing flag are configured");

assert.match(seo, /Organization/);
assert.match(seo, /SoftwareApplication/);
assert.doesNotMatch(seo, /aggregateRating|reviewCount|priceCurrency/);
console.log("✓ Schema markup describes real platform capabilities without invented ratings, reviews or pricing");

console.log("LANERIQ AI SEO foundation gate passed");
