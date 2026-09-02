import assert from "node:assert/strict";
import fs from "node:fs";
import { applyGeneratedExperienceStandard, GENERATED_EXPERIENCE_STANDARD_ID, GENERATED_APP_VISUAL_RULES, GENERATED_PAGE_STYLE_RULES, PROPERTY_CRM_GOLDEN_REFERENCE } from "../lib/design/generated-experience-standard.js";
import { normalizeAppSpec } from "../lib/generator/runtime-guard.js";

const propertyInput={
  name:"LANERIQ Property CRM",
  description:"Real estate CRM for properties, clients, leads and viewings",
  designSystem:{themeMode:"auto"},
  pages:[{id:"home",name:"Home",route:"/",description:"Basic dashboard",components:["Summary"]}],
  features:[{name:"Contacts",description:"Manage clients"}],
  qualityPlan:{beauty:["Original visual hierarchy"],comfort:["Responsive layout"]},
  data:{Lead:{fields:["name","phone","status"]}}
};
const property=normalizeAppSpec(propertyInput);
assert.equal(property.designSystem.visualStandard,GENERATED_EXPERIENCE_STANDARD_ID);
assert.equal(property.designSystem.backgroundColor,PROPERTY_CRM_GOLDEN_REFERENCE.palette.backgroundColor);
assert.equal(property.designSystem.accentColor,PROPERTY_CRM_GOLDEN_REFERENCE.palette.accentColor);
assert.equal(property.pages[0].name,"Dashboard");
assert.match(property.pages[0].description,/Property Command Center/i);
assert.ok(property.pages.some(page=>page.name==="Properties"));
assert.ok(property.pages.some(page=>page.name==="Clients"));
assert.ok(property.pages.some(page=>page.name==="Viewings"));
assert.ok(property.features.some(feature=>feature?.name==="AI Follow-Up Suggestions"));
assert.match(property.designSystem.pageConsistency,/typography/i);
assert.match(property.designSystem.stateSystem,/loading/i);
assert.equal(property.designSystem.designTokens.tapTarget,44);

const custom=applyGeneratedExperienceStandard({specification:{...propertyInput,designSystem:{themeMode:"custom",primaryColor:"#112233",accentColor:"#445566",backgroundColor:"#778899",surfaceColor:"#ffffff",textColor:"#000000"}}}).specification;
assert.equal(custom.designSystem.primaryColor,"#112233","Customer custom palette must not be replaced by Property CRM defaults.");
assert.equal(custom.designSystem.accentColor,"#445566");
assert.equal(custom.designSystem.backgroundColor,"#778899");

const education=normalizeAppSpec({name:"Tutor Studio",description:"Education course and student app",designSystem:{themeMode:"auto",primaryColor:"#7048e8"},pages:[{id:"home",name:"Home",route:"/"}]});
assert.equal(education.designSystem.visualStandard,GENERATED_EXPERIENCE_STANDARD_ID);
assert.equal(education.designSystem.primaryColor,"#7048e8","Non-property products must keep their own generated/customer visual identity.");
assert.notEqual(education.pages[0].name,"Dashboard","The Property CRM golden reference must not overwrite unrelated industries.");

assert.ok(GENERATED_APP_VISUAL_RULES.length>=10);
assert.equal(GENERATED_PAGE_STYLE_RULES.minimums.tapTarget,44);
assert.ok(GENERATED_PAGE_STYLE_RULES.requiredStates.includes("error"));
assert.ok(GENERATED_PAGE_STYLE_RULES.forbidden.some(rule=>/browser-default/i.test(rule)));

const premiumPolicy=fs.readFileSync("lib/ai/premium-visual-policy.js","utf8");
const runtimePage=fs.readFileSync("app/a/[id]/page.js","utf8");
const runtimeCss=fs.readFileSync("app/generated-app-premium.css","utf8");
const layout=fs.readFileSync("app/layout.js","utf8");
const docs=fs.readFileSync("docs/generated-experience-standard.md","utf8");
assert.match(premiumPolicy,/GENERATED_EXPERIENCE_AI_INSTRUCTION/);
assert.match(premiumPolicy,/LANERIQ AI PREMIUM VISUAL IDEAL/);
assert.match(runtimePage,/applyGeneratedExperienceStandard/);
assert.match(runtimePage,/generatedExperience--/);
assert.match(runtimeCss,/laneriq-future-city-people\.webp/);
assert.match(runtimeCss,/position:fixed!important/);
assert.match(runtimeCss,/min-height:44px/);
assert.match(layout,/generated-app-premium\.css/);
assert.match(docs,/Quality DNA VS CUSTOMER IDENTITY|quality remains consistent/i);

console.log("LANERIQ Generated Experience Standard v1 contract passed.");
