import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const catalogSource=read('lib/templateCatalog.js');
const catalog=await import(`data:text/javascript;base64,${Buffer.from(catalogSource).toString('base64')}`);
const api=read('app/api/templates/route.js');
const listPage=read('app/templates/page.js');
const detailPage=read('app/templates/[id]/page.js');
const home=read('app/page.js');

const {
  INDUSTRIES,ARCHETYPES,STYLES,TEMPLATE_SCHEMA_VERSION,TEMPLATE_CATALOG_STATS,
  getTemplateCatalog,getTrendingTemplates,findTemplateById,searchTemplates,
}=catalog;

assert.equal(TEMPLATE_SCHEMA_VERSION,2);
assert.equal(INDUSTRIES.length,50);
assert.equal(ARCHETYPES.length,12);
assert.equal(STYLES.length,5);
assert.equal(TEMPLATE_CATALOG_STATS.templates,3000);
assert.equal(TEMPLATE_CATALOG_STATS.industries,50);
assert.equal(TEMPLATE_CATALOG_STATS.archetypes,12);
assert.equal(TEMPLATE_CATALOG_STATS.styles,5);

const all=getTemplateCatalog();
assert.equal(all.length,3000);
assert.equal(new Set(all.map(t=>t.id)).size,3000,'Template IDs must be unique.');
for(const template of all){
  assert.match(template.id,/^tpl-\d{4}-[a-z0-9-]{3,100}$/);
  assert.equal(template.schemaVersion,2);
  assert.ok(INDUSTRIES.includes(template.industry));
  assert.ok(ARCHETYPES.some(a=>a.id===template.archetypeId&&a.name===template.archetype));
  assert.ok(STYLES.some(s=>s.id===template.styleId&&s.name===template.style));
  assert.ok(Array.isArray(template.pages)&&template.pages.length>=4&&template.pages.length<=8);
  assert.ok(Array.isArray(template.features)&&template.features.length>=4&&template.features.length<=8);
  assert.deepEqual(template.targets,['app','website']);
  assert.equal(template.responsive?.mobileFirst,true);
  assert.deepEqual(template.responsive?.breakpoints,['mobile','tablet','desktop']);
  assert.equal(template.application?.mode,'inspiration-only');
  assert.equal(template.application?.directCopyAllowed,false);
  assert.equal(template.application?.preserveThirdPartyBranding,false);
  assert.equal(template.source,'LANERIQ AI Template Engine');
}

const trending=getTrendingTemplates(100);
assert.equal(trending.length,100);
assert.equal(new Set(trending.map(t=>t.id)).size,100);
for(let i=1;i<trending.length;i++) assert.ok(trending[i-1].score>=trending[i].score);
assert.equal(getTrendingTemplates(999).length,100,'Trending must stay bounded to 100.');

const realEstate=searchTemplates({industry:'Real Estate',style:'glass',limit:100});
assert.equal(realEstate.total,12);
assert.equal(realEstate.templates.length,12);
assert.ok(realEstate.templates.every(t=>t.industry==='Real Estate'&&t.styleId==='glass'));
const crm=searchTemplates({q:'CRM',limit:100});
assert.ok(crm.total>0&&crm.templates.every(t=>/crm/i.test(`${t.title} ${t.description} ${t.archetype}`)));
const bounded=searchTemplates({limit:1000,offset:-50,q:'x'.repeat(500)});
assert.equal(bounded.limit,100);
assert.equal(bounded.offset,0);
const first=all[0];
assert.equal(findTemplateById(first.id)?.id,first.id);
assert.equal(findTemplateById('../package.json'),null);
assert.equal(findTemplateById('legacy-template'),null);

// API must expose the canonical catalog contract, not the retired 50-item engine list.
assert.match(api,/lib\/templateCatalog\.js/);
assert.doesNotMatch(api,/engine\/templates\.js/);
assert.match(api,/mode === "meta"/);
assert.match(api,/getTrendingTemplates/);
assert.match(api,/searchTemplates/);
assert.match(api,/findTemplateById/);
assert.match(api,/TEMPLATE_NOT_FOUND/);
assert.match(api,/Cache-Control/);
assert.match(api,/no-store/);
assert.match(api,/Math\.min\(Number\(url\.searchParams\.get\("limit"\)\) \|\| 24, 100\)/);

// List page consumes metadata/filter fields that the canonical API now provides and states inspiration-only semantics.
assert.match(listPage,/mode=meta/);
assert.match(listPage,/mode", "trending"/);
assert.match(listPage,/params\.set\("industry"/);
assert.match(listPage,/params\.set\("style"/);
assert.match(listPage,/Reference only/);
assert.match(listPage,/Do not copy third-party brand identity/);
assert.match(listPage,/sessionStorage\.setItem\("soolenInspirationTemplate"/);

// Detail must fetch by canonical ID and return through the normal homepage Planning gate instead of calling Generate directly.
assert.match(detailPage,/\/api\/templates\?id=/);
assert.match(detailPage,/encodeURIComponent\(templateId\)/);
assert.match(detailPage,/application: "inspiration-only"/);
assert.match(detailPage,/mobile-first and responsive across mobile, tablet and desktop/);
assert.match(detailPage,/normal AI Planning gate/);
assert.match(detailPage,/router\.push\("\/"\)/);
assert.doesNotMatch(detailPage,/fetch\("\/api\/generate"/);
assert.doesNotMatch(detailPage,/template\[1\]|template\[2\]/);

// Homepage still plans before generation, so templates cannot bypass Idea Planning after returning there.
const planningIndex=home.indexOf('fetch("/api/orchestrate"');
const generateIndex=home.indexOf('fetch("/api/generate"');
assert.ok(planningIndex>0&&generateIndex>planningIndex);

console.log('✓ Canonical Templates catalog is exactly 50 industries × 12 archetypes × 5 styles = 3,000 unique entries');
console.log('✓ Every template has bounded App + Website, mobile-first responsive and inspiration-only metadata');
console.log('✓ Meta, trending, search, filters, ID lookup and request bounds share the same canonical catalog');
console.log('✓ Template detail no longer uses legacy array indexing or bypasses AI Idea Planning');
console.log('✓ Third-party copying and branding preservation are explicitly disallowed by the template contract');
