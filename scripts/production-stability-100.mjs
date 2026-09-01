import assert from "node:assert/strict";

const BASE_URL=(process.env.LANERIQ_PRODUCTION_URL||"https://laneriq-ai.vercel.app").replace(/\/+$/g,"");
const RUNS=Math.max(1,Math.min(1000,Number(process.env.LANERIQ_STABILITY_RUNS||1000)));
const TIMEOUT_MS=Math.max(1000,Math.min(30000,Number(process.env.LANERIQ_STABILITY_TIMEOUT_MS||8000)));
const ZERO_COST_PROVIDER_ALLOWLIST=new Set(["ollama","soolen-local"]);
const FREE_READY_CAPABILITIES=[
  "multilingual-chat",
  "app-website-builder",
  "coding-agent",
  "visual-understanding",
  "local-image-creation",
  "browser-voice",
  "video-storyboard",
  "project-memory",
];

function validateCapabilityPayload(text,run){
  let payload;
  try{payload=JSON.parse(text);}catch(error){throw new Error(`run ${run} /api/soolenai/capabilities: invalid JSON: ${error.message}`);}
  assert.equal(payload?.success,true,`run ${run} capabilities: success must be true`);
  assert.equal(payload?.tier,"free",`run ${run} capabilities: signed-out discovery must resolve to free tier`);
  assert.equal(payload?.providers?.costMode,"zero",`run ${run} capabilities: Production cost mode must stay zero`);
  assert.equal(payload?.providers?.premiumRouting,false,`run ${run} capabilities: signed-out free tier must not use premium routing`);
  assert.ok(Array.isArray(payload?.providers?.text)&&payload.providers.text.length>0,`run ${run} capabilities: at least one zero-cost text path must be ready`);
  for(const provider of payload.providers.text){
    assert.ok(ZERO_COST_PROVIDER_ALLOWLIST.has(provider),`run ${run} capabilities: unapproved zero-cost provider ${provider}`);
  }
  assert.equal(payload?.policy?.failClosed,true,`run ${run} capabilities: provider policy must fail closed`);
  assert.equal(payload?.policy?.mode,"zero",`run ${run} capabilities: policy mode must stay zero`);
  assert.equal(payload?.policy?.meteredProvidersAllowed,false,`run ${run} capabilities: metered providers must remain blocked`);
  assert.equal(payload?.policy?.freeTierCloudAllowed,false,`run ${run} capabilities: free-tier cloud providers must remain blocked in zero mode`);
  assert.equal(payload?.policy?.cloudVideoAllowed,false,`run ${run} capabilities: cloud video must remain blocked in zero mode`);
  assert.equal(payload?.policy?.externalSpendCap,0,`run ${run} capabilities: external spend cap must remain zero`);
  assert.equal(payload?.policy?.deviceFirst,true,`run ${run} capabilities: device-first policy must remain enabled`);

  const byId=new Map((Array.isArray(payload?.capabilities)?payload.capabilities:[]).map(item=>[item.id,item]));
  for(const id of FREE_READY_CAPABILITIES){
    const capability=byId.get(id);
    assert.ok(capability,`run ${run} capabilities: missing ${id}`);
    assert.equal(capability.entitled,true,`run ${run} capabilities: ${id} must remain free-tier entitled`);
    assert.equal(capability.configured,true,`run ${run} capabilities: ${id} must retain a configured zero-cost path`);
    assert.equal(capability.status,"ready",`run ${run} capabilities: ${id} must remain ready`);
  }
  for(const capability of byId.values()){
    if(capability.minimumTier!=="free"){
      assert.equal(capability.entitled,false,`run ${run} capabilities: ${capability.id} must not become free-tier entitled`);
      assert.equal(capability.status,"professional_access_required",`run ${run} capabilities: ${capability.id} must fail closed behind Professional/Business access`);
    }
  }
}

const targets=[
  {path:"/",expect:[200],body:/LANERIQ AI/i},
  {path:"/auth",expect:[200],body:/LANERIQ AI/i},
  {path:"/api/templates?mode=meta",expect:[200],body:/total|industries|styles/i},
  {path:"/api/soolenai/capabilities",expect:[200],body:/"success"\s*:\s*true[\s\S]*"providers"/i,validate:validateCapabilityPayload},
  {path:"/api/apps",expect:[401],body:/"code"\s*:\s*"AUTHENTICATION_REQUIRED"/i},
  {path:"/mobile-readiness",expect:[200],body:/Mobile Readiness|REAL DEVICE EVIDENCE|LANERIQ AI/i},
  {path:"/robots.txt",expect:[200],body:/user-agent/i},
  {path:"/sitemap.xml",expect:[200],body:/<urlset/i},
  {path:"/ai-app-game-website-builder",expect:[200],body:/LANERIQ AI/i},
];

async function request(target,run){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(new Error(`timeout after ${TIMEOUT_MS}ms`)),TIMEOUT_MS);
  const started=Date.now();
  try{
    const response=await fetch(`${BASE_URL}${target.path}`,{
      method:"GET",
      redirect:"manual",
      cache:"no-store",
      headers:{"User-Agent":"LANERIQ-AI-Production-Stability-1000/1.0","Cache-Control":"no-cache"},
      signal:controller.signal,
    });
    const elapsed=Date.now()-started;
    const text=await response.text();
    assert.ok(target.expect.includes(response.status),`run ${run} ${target.path}: expected ${target.expect.join("/")}, got ${response.status}`);
    assert.ok(response.status<500,`run ${run} ${target.path}: server returned ${response.status}`);
    if(target.body)assert.match(text,target.body,`run ${run} ${target.path}: response body did not match expected production marker`);
    if(target.validate)target.validate(text,run);
    return {elapsed,status:response.status,bytes:Buffer.byteLength(text)};
  }catch(error){
    throw new Error(`run ${run} ${target.path}: ${error?.name||"Error"}: ${error?.message||error}`);
  }finally{clearTimeout(timeout);}
}

let preflight=null;
for(let attempt=1;attempt<=30;attempt+=1){
  try{preflight=await request(targets[0],`preflight-${attempt}`);break;}catch(error){
    if(attempt===30)throw error;
    await new Promise(resolve=>setTimeout(resolve,2000));
  }
}

const latencies=[];
const statusCounts=new Map();
let totalRequests=0;
for(let run=1;run<=RUNS;run+=1){
  for(const target of targets){
    const result=await request(target,run);
    totalRequests+=1;
    latencies.push(result.elapsed);
    statusCounts.set(result.status,(statusCounts.get(result.status)||0)+1);
  }
  if(run%25===0)console.log(`✓ production stability ${run}/${RUNS} cycles passed (${totalRequests} requests)`);
}

latencies.sort((a,b)=>a-b);
const percentile=(p)=>latencies[Math.min(latencies.length-1,Math.floor((latencies.length-1)*p))]||0;
const max=Math.max(...latencies);
const average=Math.round(latencies.reduce((sum,value)=>sum+value,0)/Math.max(1,latencies.length));
console.log(JSON.stringify({
  ok:true,
  baseUrl:BASE_URL,
  cycles:RUNS,
  surfaces:targets.map(target=>target.path),
  requests:totalRequests,
  crashCount:0,
  networkErrorCount:0,
  server5xxCount:0,
  statuses:Object.fromEntries([...statusCounts.entries()].sort((a,b)=>a[0]-b[0])),
  latencyMs:{average,p50:percentile(.5),p95:percentile(.95),p99:percentile(.99),max},
  preflight,
},null,2));
console.log(`✓ LANERIQ AI Production passed ${RUNS} stability cycles across ${targets.length} surfaces with semantic zero-cost capability validation and 0 detected crash/network/5xx failures`);