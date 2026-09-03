import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl=String(process.env.LANERIQ_PRODUCTION_URL||"https://laneriq-ai.vercel.app").replace(/\/$/,"");
const expectedSha=String(process.env.LANERIQ_EXPECTED_SHA||"").trim();
const artifactDir=path.resolve("artifacts/production-mobile-browser-qa");
await fs.mkdir(artifactDir,{recursive:true});

async function requestJson(pathname,init={}){
  const response=await fetch(`${baseUrl}${pathname}`,{
    ...init,
    cache:"no-store",
    redirect:"manual",
    headers:{Accept:"application/json",Origin:baseUrl,"Cache-Control":"no-cache",...(init.headers||{})},
  });
  const text=await response.text();let body=null;try{body=JSON.parse(text);}catch{}
  return{response,text,body};
}

const build=await requestJson("/api/build-info");
assert.equal(build.response.status,200,"build-info must return 200");
assert.equal(build.body?.ok,true,"build-info must report ok=true");
if(expectedSha)assert.equal(build.body?.commitSha,expectedSha,`Production SHA ${build.body?.commitSha||"unknown"} must equal ${expectedSha}`);

const projectId="00000000-0000-4000-8000-000000000000";
const cases=[
  {id:"metadata-draft",method:"POST",pathname:"/api/store-metadata",body:{appName:"boundary-qa"}},
  {id:"metadata-save",method:"POST",pathname:"/api/store-metadata/save",body:{appId:projectId,versionId:projectId,apple:{name:"boundary-qa"},googlePlay:{title:"boundary-qa"},checklist:[]}},
  {id:"metadata-approve",method:"POST",pathname:"/api/store-metadata/approve",body:{listingId:projectId}},
  {id:"publishing-declarations-write",method:"POST",pathname:`/api/apps/${projectId}/publishing-agent`,body:{declarations:{termsChoice:"platform_default"}}},
  {id:"publishing-declarations-read",method:"GET",pathname:`/api/apps/${projectId}/publishing-agent`},
];

const results=[];
for(const testCase of cases){
  const init={method:testCase.method};
  if(testCase.body){init.headers={"Content-Type":"application/json"};init.body=JSON.stringify(testCase.body);}
  const result=await requestJson(testCase.pathname,init);
  assert.equal(result.response.status,401,`${testCase.pathname} signed-out ${testCase.method} must fail closed with 401, got ${result.response.status}: ${result.text.slice(0,180)}`);
  assert.match(String(result.response.headers.get("content-type")||""),/application\/json/i,`${testCase.pathname} must return JSON`);
  assert.match(String(result.response.headers.get("cache-control")||""),/private/i,`${testCase.pathname} must be private`);
  assert.match(String(result.response.headers.get("cache-control")||""),/no-store/i,`${testCase.pathname} must be no-store`);
  const responseText=JSON.stringify(result.body||result.text);
  assert.doesNotMatch(responseText,/officialSubmissionConfirmed\s*[:=]\s*true|readyForOfficialSubmission\s*[:=]\s*true|storeReviewVerified\s*[:=]\s*true/i,`${testCase.pathname} must never claim official-store success`);
  results.push({id:testCase.id,method:testCase.method,pathname:testCase.pathname,status:result.response.status,privateNoStore:true,passed:true});
  console.log(`✓ ${testCase.method} ${testCase.pathname}: signed-out Production request failed closed with private JSON 401`);
}

const evidence={
  evidenceVersion:1,
  evidenceLevel:"PRODUCTION_HTTP",
  productionUrl:baseUrl,
  expectedSha:expectedSha||null,
  actualSha:build.body?.commitSha||null,
  authenticatedPersistenceExercised:false,
  officialStoreVerified:false,
  appleStoreConnectVerified:false,
  googlePlayConsoleVerified:false,
  physicalDeviceVerified:false,
  generatedAt:new Date().toISOString(),
  results,
};
await fs.writeFile(path.join(artifactDir,"store-persistence-boundary-report.json"),`${JSON.stringify(evidence,null,2)}\n`,"utf8");
console.log(`✓ Production store-boundary QA passed ${results.length}/${cases.length} exact signed-out HTTP gates on SHA ${build.body?.commitSha||"unknown"}`);
console.log("✓ Evidence is PRODUCTION_HTTP access-control/cache proof only; authenticated persistence and OFFICIAL_STORE remain separately unverified");
