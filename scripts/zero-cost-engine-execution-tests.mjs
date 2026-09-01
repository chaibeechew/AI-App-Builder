import assert from "node:assert/strict";

process.env.SOOLEN_COST_MODE="zero";
process.env.SOOLEN_ZERO_COST_PROVIDERS="mystery-cloud,openai,gemini,soolen-local";
process.env.OPENAI_API_KEY="configured-but-must-not-run";
process.env.GEMINI_API_KEY="configured-but-must-not-run";
delete process.env.OLLAMA_BASE_URL;

const { generateWithFallback, getProviderRuntimeHealth } = await import("../engine/ai-provider.js");

function buildPrompt(idea){
  return `Build a real mobile-first app and customer website from the user's idea.\nUSER IDEA:\n"${idea}"\n\nVOICE INPUT:\n""\n\nREFERENCE IMAGE REFERENCES:\n[]`;
}

function parseGenerated(result,label){
  assert.equal(result.provider,"soolen-local",`${label}: zero-cost routing must execute through soolen-local`);
  assert.equal(result.attempts,1,`${label}: metered/unknown providers must be filtered before execution`);
  assert.deepEqual(result.errors,[],`${label}: zero-cost execution must not attempt blocked providers`);
  const spec=JSON.parse(result.result);
  assert.ok(spec?.name,`${label}: generated specification requires a name`);
  assert.ok(Array.isArray(spec?.pages)&&spec.pages.length>=5,`${label}: generated specification requires a complete page set`);
  assert.ok(Array.isArray(spec?.features)&&spec.features.length>=5,`${label}: generated specification requires usable features`);
  assert.ok(Array.isArray(spec?.navigation)&&spec.navigation.length===spec.pages.length,`${label}: navigation must cover generated pages`);
  assert.ok(Array.isArray(spec?.visualAssets)&&spec.visualAssets.some(item=>item.type==="app_icon")&&spec.visualAssets.some(item=>item.type==="hero"),`${label}: generated specification requires original icon and hero visual directions`);
  assert.ok(spec?.designSystem?.primaryColor&&spec?.designSystem?.accentColor,`${label}: generated specification requires a design system`);
  assert.ok(spec.pages[0]?.components?.includes("customer website call-to-action"),`${label}: App generation must preserve the customer Website path`);
  const routes=spec.pages.map(page=>page.route);
  assert.equal(new Set(routes).size,routes.length,`${label}: generated routes must be unique`);
  assert.equal(routes[0],"/",`${label}: first generated page must be Home`);
  return spec;
}

const cases=[
  {
    label:"real-estate-zh",
    idea:"制作一个房地产 CRM App & Website，管理房源、客户、预约和跟进，使用深绿金色高级风格",
    industry:"Real Estate",
    language:"zh-CN",
    requiredPages:["Properties","Clients","Appointments"],
  },
  {
    label:"restaurant-ms",
    idea:"Saya mahu aplikasi restaurant untuk menu, order, reservation dan pelanggan",
    industry:"Food & Beverage",
    language:"ms",
    requiredPages:["Menu","Orders","Reservations"],
  },
  {
    label:"education-en",
    idea:"Create a school learning app with courses, lessons, assignments and student progress",
    industry:"Education",
    language:"en",
    requiredPages:["Courses","Lessons","Progress"],
  },
  {
    label:"commerce-en",
    idea:"Create an online shop app and website for products, orders, customers and inventory",
    industry:"Commerce",
    language:"en",
    requiredPages:["Products","Orders","Customers"],
  },
  {
    label:"health-en",
    idea:"Create a clinic app for patient appointments, services, reminders and records",
    industry:"Health Services",
    language:"en",
    requiredPages:["Appointments","Patients","Services"],
  },
  {
    label:"custom-en",
    idea:"Create a field service workspace for teams, records, search, status tracking and reports",
    industry:"Custom Business",
    language:"en",
    requiredPages:["Workspace","Records","Reports"],
  },
];

const generated=[];
for(const testCase of cases){
  const result=await generateWithFallback(buildPrompt(testCase.idea),{providers:["openai","gemini","mystery-cloud","soolen-local"]});
  const spec=parseGenerated(result,testCase.label);
  assert.equal(spec.industry?.name,testCase.industry,`${testCase.label}: industry intelligence mismatch`);
  assert.equal(spec.language?.default,testCase.language,`${testCase.label}: language detection mismatch`);
  for(const page of testCase.requiredPages){
    assert.ok(spec.pages.some(item=>item.name===page),`${testCase.label}: missing ${page} page`);
  }
  generated.push(spec);
}

const baseSpec=generated[0];
const modifyInstruction="Add a calendar page and payment flow";
const modifyPrompt=`You are the Soolen AI modification engine.\ninstruction:\n"${modifyInstruction}"\nCurrent specification:\n${JSON.stringify(baseSpec)}`;
const modifiedResult=await generateWithFallback(modifyPrompt,{providers:["openai","gemini","soolen-local"]});
assert.equal(modifiedResult.provider,"soolen-local");
assert.equal(modifiedResult.attempts,1);
assert.deepEqual(modifiedResult.errors,[]);
const modified=JSON.parse(modifiedResult.result);
assert.ok(modified.pages.length===baseSpec.pages.length+1,"Modify must add the requested page without dropping existing pages");
assert.ok(modified.pages.some(page=>/calendar/i.test(page.name)||/calendar/i.test(page.route)),"Modify must create the requested Calendar page");
assert.ok(modified.features.length===baseSpec.features.length+1,"Modify must preserve old features and append the requested capability");
assert.equal(modified.designSystem?.primaryColor,baseSpec.designSystem?.primaryColor,"Modify must preserve the existing design system unless asked to replace it");
for(const page of baseSpec.pages){
  assert.ok(modified.pages.some(item=>item.route===page.route),`Modify dropped existing route ${page.route}`);
}

const chatResult=await generateWithFallback("USER: 我想做一个客户管理系统，但先帮我整理需求。\nSOOLEN:",{providers:["openai","gemini","soolen-local"]});
assert.equal(chatResult.provider,"soolen-local");
assert.match(chatResult.result,/0 成本/);
assert.match(chatResult.result,/App \+ Website/);

const health=getProviderRuntimeHealth();
const localHealth=health.find(item=>item.provider==="soolen-local");
assert.ok(localHealth?.successes>=cases.length+2,"Soolen local runtime must record successful dynamic executions");
for(const provider of ["openai","gemini"]){
  const item=health.find(entry=>entry.provider===provider);
  assert.equal(item?.successes,0,`${provider} must never execute in zero mode`);
  assert.equal(item?.failures,0,`${provider} must be filtered before any zero-mode attempt`);
}

console.log(`✓ Zero-cost router dynamically generated ${cases.length} industry App + Website specifications through soolen-local only`);
console.log("✓ Chinese/Malay/English, industry pages, navigation, visuals and design-system output survived real engine execution");
console.log("✓ Dynamic Modify preserved the existing project while adding the requested Calendar/payment capability");
console.log("✓ Metered and unknown providers were filtered before execution; no paid-provider attempts occurred");
