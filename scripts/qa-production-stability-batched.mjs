import assert from "node:assert/strict";

const BASE_URL=(process.env.LANERIQ_PRODUCTION_URL||"https://laneriq-ai.vercel.app").replace(/\/+$/g,"");
const RUNS=Math.max(1,Math.min(1000,Number(process.env.LANERIQ_STABILITY_RUNS||1000)));
const TIMEOUT_MS=Math.max(1000,Math.min(30000,Number(process.env.LANERIQ_STABILITY_TIMEOUT_MS||8000)));
const CONCURRENCY=Math.max(1,Math.min(30,Number(process.env.LANERIQ_STABILITY_CONCURRENCY||30)));
const targets=[
  {path:"/",expect:[200],body:/LANERIQ AI/i},
  {path:"/auth",expect:[200],body:/LANERIQ AI/i},
  {path:"/api/templates?mode=meta",expect:[200],body:/total|industries|styles/i},
  {path:"/robots.txt",expect:[200],body:/user-agent/i},
  {path:"/sitemap.xml",expect:[200],body:/<urlset/i},
  {path:"/ai-app-game-website-builder",expect:[200],body:/LANERIQ AI/i},
];

async function request(item){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(new Error(`timeout after ${TIMEOUT_MS}ms`)),TIMEOUT_MS);
  const started=Date.now();
  try{
    const response=await fetch(`${BASE_URL}${item.target.path}`,{
      method:"GET",redirect:"manual",cache:"no-store",
      headers:{"User-Agent":"LANERIQ-AI-Production-Stability-1000-Batched/1.0","Cache-Control":"no-cache"},
      signal:controller.signal,
    });
    const elapsed=Date.now()-started;
    const text=await response.text();
    assert.ok(item.target.expect.includes(response.status),`run ${item.run} ${item.target.path}: expected ${item.target.expect.join("/")}, got ${response.status}`);
    assert.ok(response.status<500,`run ${item.run} ${item.target.path}: server returned ${response.status}`);
    if(item.target.body) assert.match(text,item.target.body,`run ${item.run} ${item.target.path}: body mismatch`);
    return {elapsed,status:response.status};
  } finally { clearTimeout(timeout); }
}

const work=[];
for(let run=1;run<=RUNS;run+=1) for(const target of targets) work.push({run,target});
const latencies=[]; const statusCounts=new Map(); let next=0;
async function worker(){
  while(true){
    const index=next++; if(index>=work.length) return;
    const result=await request(work[index]);
    latencies.push(result.elapsed);
    statusCounts.set(result.status,(statusCounts.get(result.status)||0)+1);
  }
}
await Promise.all(Array.from({length:Math.min(CONCURRENCY,work.length)},()=>worker()));
latencies.sort((a,b)=>a-b);
const percentile=(p)=>latencies[Math.min(latencies.length-1,Math.floor((latencies.length-1)*p))]||0;
const max=Math.max(...latencies);
const average=Math.round(latencies.reduce((sum,value)=>sum+value,0)/Math.max(1,latencies.length));
console.log(JSON.stringify({ok:true,baseUrl:BASE_URL,cycles:RUNS,surfaces:targets.map(t=>t.path),requests:work.length,concurrency:CONCURRENCY,crashCount:0,networkErrorCount:0,server5xxCount:0,statuses:Object.fromEntries([...statusCounts.entries()].sort((a,b)=>a[0]-b[0])),latencyMs:{average,p50:percentile(.5),p95:percentile(.95),p99:percentile(.99),max}},null,2));
console.log(`✓ LANERIQ AI Production passed ${RUNS} bounded-concurrency stability cycles across ${targets.length} surfaces with 0 detected crash/network/5xx failures`);
