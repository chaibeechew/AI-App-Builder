import assert from "node:assert/strict";
import fs from "node:fs";
import { getTemplateCatalog } from "../lib/templateCatalog.js";
import { resolveTemplateGenerationGuidance, templatePlanningBrief } from "../lib/build/template-generation-guidance.js";

const catalog=getTemplateCatalog();
assert.equal(catalog.length,3000,"Canonical template catalog must remain exactly 3,000 entries.");
const template=catalog.find(item=>Array.isArray(item.pages)&&item.pages.length>=4&&Array.isArray(item.features)&&item.features.length>=4);
assert.ok(template,"A canonical template fixture is required.");

const idea=[
  `Create an original ${template.industry} ${template.archetype} App and customer Website.`,
  `Use this LANERIQ AI template only as inspiration: ${template.title}.`,
  `Visual direction: ${template.style}.`,
  `Useful page ideas: ${template.pages.join(", ")}.`,
  `Useful capabilities: ${template.features.join(", ")}.`,
  "Reimagine this for my own product and do not copy third-party branding."
].join("\n");

const guidance=resolveTemplateGenerationGuidance(idea);
assert.ok(guidance,"Template flow must resolve a canonical server-side template context.");
assert.equal(guidance.id,template.id);
assert.equal(guidance.canonicalCatalogVerified,true);
assert.equal(guidance.generationRole,"active-structural-guidance");
assert.equal(guidance.directCopyAllowed,false);
assert.equal(guidance.preserveThirdPartyBranding,false);
assert.deepEqual(guidance.pages,template.pages.slice(0,8));
assert.deepEqual(guidance.features,template.features.slice(0,8));

const brief=templatePlanningBrief(guidance);
assert.match(brief,/LANERIQ ACTIVE TEMPLATE GUIDANCE/);
assert.match(brief,new RegExp(template.id.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
assert.match(brief,/active planning constraints/i);
assert.match(brief,/Do not copy third-party brand identity/i);
for(const page of guidance.pages)assert.ok(brief.includes(page),`Missing canonical page guidance: ${page}`);
for(const feature of guidance.features)assert.ok(brief.includes(feature),`Missing canonical capability guidance: ${feature}`);

assert.equal(resolveTemplateGenerationGuidance(`Build a ${template.industry} app called ${template.title}.`),null,"A title mention without an inspiration/template cue must not activate canonical template guidance.");
assert.equal(resolveTemplateGenerationGuidance(`Use template inspiration for ${template.title} but build another industry.`),null,"Incomplete canonical identity must fail closed.");

const route=fs.readFileSync("app/api/orchestrate/route.js","utf8");
assert.match(route,/resolveTemplateGenerationGuidance/);
assert.match(route,/templatePlanningBrief/);
assert.match(route,/const planning=buildIdeaPlan\(idea\)/,"Idea readiness must remain before autonomous planning.");
assert.match(route,/const orchestrationIdea=/);
assert.match(route,/const plan=buildAutonomousPlan\(\{idea:orchestrationIdea/);
assert.match(route,/templateGuidance\?\{\.\.\.plan,templateGuidance\}:plan/);
assert.match(route,/plan:resolvedPlan/);

const detail=fs.readFileSync("app/templates/[id]/page.js","utf8");
const list=fs.readFileSync("app/templates/page.js","utf8");
for(const source of [detail,list]){
  assert.match(source,/template\.industry/);
  assert.match(source,/template\.archetype/);
  assert.match(source,/template\.style/);
  assert.match(source,/template\.pages/);
  assert.match(source,/template\.features/);
  assert.match(source,/Do not copy third-party brand identity/);
}

console.log("✓ App Builder resolves template selections back to the canonical 3,000-template catalog server-side");
console.log("✓ Canonical pages/features/style become active autonomous-planning guidance instead of client-only decoration");
console.log("✓ Originality stays fail-closed: no third-party branding, proprietary copy, source or distinctive trade dress copying");
