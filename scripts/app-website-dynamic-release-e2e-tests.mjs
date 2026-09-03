import assert from "node:assert/strict";

process.env.SOOLEN_COST_MODE="zero";
process.env.SOOLEN_ZERO_COST_PROVIDERS="soolen-local";
delete process.env.OLLAMA_BASE_URL;

const { generateWithFallback } = await import("../engine/ai-provider.js");
const { normalizeAppSpec } = await import("../lib/generator/runtime-guard.js");
const { selfTestGeneratedApp } = await import("../lib/generator/self-test.js");
const { verifyGeneratedAppExecution } = await import("../lib/generator/execution-verifier.js");
const { inspectProjectSpecification } = await import("../lib/ai/project-self-heal-policy.js");
const { assessBuildQuality } = await import("../lib/buildStandards.js");
const { evaluateReleaseReadiness } = await import("../lib/release-readiness.js");

function buildPrompt(idea,language){
  return `Build a real mobile-first App and customer Website from the user's idea.\nUSER IDEA:\n"${idea}"\n\nREQUESTED LANGUAGE:\n"${language}"\n\nVOICE INPUT:\n""\n\nREFERENCE IMAGE REFERENCES:\n[]`;
}
function selfHealSummary(report){
  return (report?.issues||[]).map(issue=>`[${issue.severity||"unknown"}] ${issue.code||"issue"}${issue.path?` @ ${issue.path}`:""}: ${issue.message||""}`).join(" | ")||"no issues reported";
}

const cases=[
  {label:"property-zh",idea:"制作一个房地产 CRM App 和客户 Website，管理房源、客户、预约、跟进和销售报告，手机优先，高级深绿金色",language:"zh-CN"},
  {label:"restaurant-ms",idea:"Bina App dan Website restoran untuk menu, tempahan meja, pesanan, pelanggan dan laporan jualan, mobile-first",language:"ms"},
  {label:"commerce-en",idea:"Create a premium mobile-first commerce App and customer Website with products, orders, customers, inventory, search and clear contact actions",language:"en"},
  {label:"service-en",idea:"Create a field-service App and Website for jobs, customers, records, status tracking, search, reports and follow-up workflows",language:"en"},
];

for(const testCase of cases){
  const generated=await generateWithFallback(buildPrompt(testCase.idea,testCase.language),{providers:["soolen-local"]});
  assert.equal(generated?.provider,"soolen-local",`${testCase.label}: dynamic generation must stay on zero-cost soolen-local`);
  assert.equal(generated?.attempts,1,`${testCase.label}: zero-cost generation must execute exactly one allowed provider attempt`);
  assert.deepEqual(generated?.errors||[],[],`${testCase.label}: zero-cost generation must not record blocked-provider errors`);
  const raw=JSON.parse(String(generated?.result||"{}"));
  assert.ok(raw&&typeof raw==="object"&&!Array.isArray(raw),`${testCase.label}: provider router must return a specification object`);

  const normalized=normalizeAppSpec(raw);
  assert.equal(normalized.productType,"app_website",`${testCase.label}: normal creation must remain one App + Website product`);
  for(const platform of ["ios","android","web"])assert.ok(normalized.platforms.includes(platform),`${testCase.label}: missing ${platform} platform`);
  assert.ok(Array.isArray(normalized.pages)&&normalized.pages.length>=5,`${testCase.label}: insufficient generated pages`);
  assert.ok(normalized.pages.some(page=>page.route==="/"),`${testCase.label}: App/Website product requires a Home route`);
  const routes=normalized.pages.map(page=>page.route);
  assert.equal(new Set(routes).size,routes.length,`${testCase.label}: duplicate routes break App/Website simultaneous preview`);
  assert.ok(Array.isArray(normalized.navigation)&&normalized.navigation.length>=3,`${testCase.label}: generated product requires a usable primary navigation`);
  assert.ok(normalized.navigation.some(item=>item?.route==="/"),`${testCase.label}: primary navigation must include Home`);
  for(const item of normalized.navigation){
    assert.ok(routes.includes(item?.route),`${testCase.label}: navigation route ${item?.route||"<missing>"} must resolve to a generated page`);
  }
  assert.ok(Array.isArray(normalized.visualAssets)&&normalized.visualAssets.length>=2,`${testCase.label}: visual direction must survive normalization`);

  const selfTest=selfTestGeneratedApp(normalized);
  assert.equal(selfTest.ok,true,`${testCase.label}: self-test failed: ${(selfTest.errors||[]).join("; ")}`);
  const execution=verifyGeneratedAppExecution(selfTest.normalizedSpec);
  assert.equal(execution.ok,true,`${testCase.label}: execution verification failed: ${(execution.errors||[]).join("; ")}`);
  assert.equal(execution.checks?.runtimeRoutesValid,true,`${testCase.label}: every primary-navigation route must resolve safely`);
  const selfHeal=inspectProjectSpecification(execution.normalizedSpec);
  assert.equal(selfHeal.passed,true,`${testCase.label}: self-heal inspection failed: ${selfHealSummary(selfHeal)}`);

  const quality=assessBuildQuality(execution.normalizedSpec);
  const readiness=evaluateReleaseReadiness(quality);
  assert.equal(quality.security?.passed,true,`${testCase.label}: Secure-by-Default MAX manifest must pass`);
  assert.equal(quality.overall,100,`${testCase.label}: generated product must reach deterministic 100 overall`);
  for(const dimension of quality.dimensions){
    assert.equal(dimension.score,100,`${testCase.label}: ${dimension.id} must reach 100, got ${dimension.score}`);
    assert.ok(dimension.evidenceCount>=3,`${testCase.label}: ${dimension.id} requires >=3 implementation-evidence entries`);
  }
  assert.equal(readiness.releaseReady,true,`${testCase.label}: generated current version must be eligible for the Web Publish gate`);

  assert.equal(normalized.security?.release?.defaultVisibility,"private",`${testCase.label}: generated product must start private`);
  assert.equal(normalized.security?.release?.defaultPublishStatus,"draft",`${testCase.label}: generated product must start draft`);
}

console.log(`✓ Zero-cost generation pipeline produced ${cases.length} real App + Website specifications through soolen-local only`);
console.log("✓ Every generated product passed normalization, usable navigation, self-test, execution verification, self-heal and Secure-by-Default MAX");
console.log("✓ Stability, security, privacy, comfort, beauty and naturalness each reached deterministic 100 with >=3 implementation-evidence entries");
console.log("✓ The exact normalized output is Release-Gate ready while external provider, authenticated Production and real-device evidence remain separate truth levels");
