import assert from "node:assert/strict";
import fs from "node:fs";
import { applyGeneratedExperienceStandard, GENERATED_EXPERIENCE_STANDARD_ID, GENERATED_APP_VISUAL_RULES, GENERATED_PAGE_STYLE_RULES, GENERATED_DISTRIBUTION_STANDARD, PROPERTY_CRM_GOLDEN_REFERENCE } from "../lib/design/generated-experience-standard.js";
import { INDUSTRY_VISUAL_PROFILES, createIndustryMediaPlan, detectIndustryFromText, resolveIndustryVisualProfile } from "../lib/design/industry-visual-system.js";
import { SOOLEN_APP_GENERATION_LESSONS, SOOLEN_FAST_BUILD_SEQUENCE, PROPERTY_SERVICE_VISUAL_SEMANTICS } from "../lib/soolen/app-generation-lessons.js";
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
assert.equal(property.designSystem.industryProfileId,"property");
assert.equal(property.pages[0].name,"Dashboard");
assert.match(property.pages[0].description,/Property Command Center/i);
assert.ok(property.pages.some(page=>page.name==="Properties"));
assert.ok(property.pages.some(page=>page.name==="Clients"));
assert.ok(property.pages.some(page=>page.name==="Viewings"));
assert.ok(property.features.some(feature=>feature?.name==="AI Follow-Up Suggestions"));
assert.match(property.designSystem.pageConsistency,/typography/i);
assert.match(property.designSystem.stateSystem,/loading/i);
assert.match(property.designSystem.visualComposition,/industry-relevant media/i);
assert.equal(property.designSystem.designTokens.tapTarget,44);
assert.equal(property.designSystem.typographyGuard.mobileHeroMax,40);
assert.equal(property.distributionPlan.share.enabled,true);
assert.equal(property.distributionPlan.install.pwa,true);
assert.equal(property.distributionPlan.stores.humanApprovalRequired,true);
assert.equal(property.industryVisualProfile.id,"property");
assert.equal(property.industryMediaPlan.industry,"property");
assert.equal(property.industryMediaPlan.pages.length,property.pages.length);
assert.equal(new Set(property.industryMediaPlan.pages.map(item=>item.id)).size,property.industryMediaPlan.pages.length);
assert.ok(property.industryMediaPlan.pages.every(item=>/no repeated composition/i.test(item.prompt)));

const custom=applyGeneratedExperienceStandard({specification:{...propertyInput,designSystem:{themeMode:"custom",primaryColor:"#112233",accentColor:"#445566",backgroundColor:"#778899",surfaceColor:"#ffffff",textColor:"#000000"}}}).specification;
assert.equal(custom.designSystem.primaryColor,"#112233","Customer custom palette must not be replaced by Property CRM defaults.");
assert.equal(custom.designSystem.accentColor,"#445566");
assert.equal(custom.designSystem.backgroundColor,"#778899");

const education=normalizeAppSpec({name:"Tutor Studio",description:"Education course and student app",designSystem:{themeMode:"auto",primaryColor:"#7048e8"},pages:[{id:"home",name:"Home",route:"/"}]});
assert.equal(education.designSystem.visualStandard,GENERATED_EXPERIENCE_STANDARD_ID);
assert.equal(education.designSystem.industryProfileId,"education");
assert.equal(education.designSystem.primaryColor,"#7048e8","Existing generated/customer color choices must be preserved.");
assert.equal(education.designSystem.accentColor,INDUSTRY_VISUAL_PROFILES.education.palette.accentColor,"Missing colors receive an industry-appropriate Auto Theme value.");
assert.notEqual(education.pages[0].name,"Dashboard","The Property CRM golden reference must not overwrite unrelated industries.");
assert.equal(education.distributionPlan.install.pwa,true,"All generated Apps inherit the distribution readiness path.");
assert.equal(education.industryVisualProfile.label,"Education");

const restaurant=normalizeAppSpec({name:"Table & Flame",description:"Restaurant menu and reservation app",designSystem:{themeMode:"auto"},pages:[{id:"home",name:"Home",route:"/"},{id:"menu",name:"Menu",route:"/menu"}]});
assert.equal(restaurant.designSystem.industryProfileId,"hospitality");
assert.equal(restaurant.designSystem.primaryColor,INDUSTRY_VISUAL_PROFILES.hospitality.palette.primaryColor);
assert.notEqual(restaurant.designSystem.primaryColor,education.designSystem.primaryColor,"Industries must not collapse to one automatic palette.");
assert.match(restaurant.industryMediaPlan.hero.prompt,/Restaurant|Hospitality/i);

const travel=normalizeAppSpec({name:"Island Route",description:"Travel itinerary and hotel booking app",designSystem:{themeMode:"auto"},pages:[{id:"home",name:"Discover",route:"/"},{id:"trips",name:"Trips",route:"/trips"}]});
assert.equal(travel.designSystem.industryProfileId,"travel");
assert.notEqual(travel.designSystem.backgroundColor,restaurant.designSystem.backgroundColor);
assert.ok(travel.industryMediaPlan.pages.some(item=>/traveler|destination|hotel/i.test(item.prompt)));

assert.ok(Object.keys(INDUSTRY_VISUAL_PROFILES).length>=14,"System should cover a broad set of industries plus general fallback.");
assert.equal(detectIndustryFromText("premium property viewing and listing CRM"),"property");
assert.equal(detectIndustryFromText("restaurant menu and table reservation"),"hospitality");
assert.equal(detectIndustryFromText("doctor patient clinic appointment"),"health");
assert.equal(detectIndustryFromText("investment portfolio and wealth dashboard"),"finance");
assert.equal(detectIndustryFromText("multiplayer RPG quest game"),"game");
assert.ok(resolveIndustryVisualProfile("beauty").primarySubjects.some(item=>/beauty|skincare|salon/i.test(item)));
const mediaPlan=createIndustryMediaPlan({industry:"commerce",pages:[{name:"Home",route:"/"},{name:"Catalog",route:"/catalog"},{name:"Orders",route:"/orders"}],seed:"shop-1"});
assert.equal(mediaPlan.pages.length,3);
assert.equal(new Set(mediaPlan.pages.map(item=>item.id)).size,3);
assert.ok(new Set(mediaPlan.pages.map(item=>item.prompt)).size===3,"Major visual scene prompts should be distinct.");

assert.ok(GENERATED_APP_VISUAL_RULES.length>=14);
assert.ok(GENERATED_APP_VISUAL_RULES.some(rule=>/industry/i.test(rule)&&/text alone|text-only/i.test(rule)));
assert.ok(GENERATED_APP_VISUAL_RULES.some(rule=>/repeat/i.test(rule)&&/image|hero|scene/i.test(rule)));
assert.ok(GENERATED_APP_VISUAL_RULES.some(rule=>/Auto Theme/i.test(rule)&&/industry/i.test(rule)));
assert.equal(GENERATED_PAGE_STYLE_RULES.minimums.tapTarget,44);
assert.equal(GENERATED_PAGE_STYLE_RULES.typography.mobileHeroMax,40);
assert.equal(GENERATED_PAGE_STYLE_RULES.visualComposition.avoidTextOnlyHero,true);
assert.equal(GENERATED_PAGE_STYLE_RULES.visualComposition.foregroundCopyConcise,true);
assert.ok(GENERATED_PAGE_STYLE_RULES.requiredStates.includes("error"));
assert.ok(GENERATED_PAGE_STYLE_RULES.forbidden.some(rule=>/browser-default/i.test(rule)));
assert.equal(GENERATED_DISTRIBUTION_STANDARD.stores.evidenceRequiredBeforeClaimingPublished,true);

assert.ok(SOOLEN_APP_GENERATION_LESSONS.industryVisualSemantics.some(rule=>/real-estate|Property/i.test(rule)));
assert.ok(SOOLEN_APP_GENERATION_LESSONS.multiIndustryAdaptation.some(rule=>/Auto Theme/i.test(rule)));
assert.ok(SOOLEN_APP_GENERATION_LESSONS.imageOriginality.some(rule=>/reuse|repeat/i.test(rule)));
assert.ok(SOOLEN_APP_GENERATION_LESSONS.fastBuild.some(rule=>/one-pass/i.test(rule)));
assert.equal(SOOLEN_FAST_BUILD_SEQUENCE[0],"understand-idea");
assert.ok(SOOLEN_FAST_BUILD_SEQUENCE.includes("plan-distinct-visual-scenes"));
assert.equal(SOOLEN_FAST_BUILD_SEQUENCE.at(-1),"prepare-share-install-store-paths");
assert.ok(PROPERTY_SERVICE_VISUAL_SEMANTICS.primarySubjects.includes("apartments"));
assert.ok(PROPERTY_SERVICE_VISUAL_SEMANTICS.serviceActions.some(item=>/phone|tablet|laptop/i.test(item)));

const premiumPolicy=fs.readFileSync("lib/ai/premium-visual-policy.js","utf8");
const runtimePage=fs.readFileSync("app/a/[id]/page.js","utf8");
const runtimeCss=fs.readFileSync("app/generated-app-premium.css","utf8");
const industryCss=fs.readFileSync("app/generated-industry-visual-v2.css","utf8");
const propertyCss=fs.readFileSync("app/property-crm-golden-reference.css","utf8");
const layout=fs.readFileSync("app/layout.js","utf8");
const docs=fs.readFileSync("docs/generated-experience-standard.md","utf8");
const lessons=fs.readFileSync("lib/soolen/app-generation-lessons.js","utf8");
const industrySystem=fs.readFileSync("lib/design/industry-visual-system.js","utf8");
assert.match(premiumPolicy,/GENERATED_EXPERIENCE_AI_INSTRUCTION/);
assert.match(premiumPolicy,/SOOLEN_APP_GENERATION_AI_INSTRUCTION/);
assert.match(premiumPolicy,/INDUSTRY VISUAL MEANING/);
assert.match(premiumPolicy,/IMAGE UNIQUENESS/);
assert.match(runtimePage,/applyGeneratedExperienceStandard/);
assert.match(runtimePage,/generatedExperience--/);
assert.match(runtimeCss,/laneriq-future-city-people\.webp/);
assert.match(runtimeCss,/position:fixed!important/);
assert.match(runtimeCss,/min-height:44px/);
assert.match(industryCss,/font-size:clamp\(28px,5\.2vw,44px\)/);
assert.match(industryCss,/generatedExperience--hospitality/);
assert.match(industryCss,/generatedExperience--finance/);
assert.match(propertyCss,/appHeader::before/);
assert.match(propertyCss,/laneriq-future-city-people\.webp/);
assert.match(propertyCss,/font-size:clamp\(27px,7\.7vw,32px\)/);
assert.match(layout,/generated-app-premium\.css/);
assert.match(layout,/property-crm-golden-reference\.css/);
assert.match(layout,/generated-industry-visual-v2\.css/);
assert.match(docs,/Quality DNA VS CUSTOMER IDENTITY|quality remains consistent/i);
assert.match(lessons,/INDUSTRY DIFFERENTIATION/);
assert.match(lessons,/FAST BUILD/);
assert.match(lessons,/DISTRIBUTION READY/);
assert.match(industrySystem,/INDUSTRY_VISUAL_PROFILES/);
assert.match(industrySystem,/createIndustryMediaPlan/);

console.log("LANERIQ Generated Experience Standard v2 industry visual contract passed.");
