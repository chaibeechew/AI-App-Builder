// Soolen Executor Backend service boundary.
// Deploy ONLY inside a hardened container/VM worker environment.
// This service intentionally refuses execution until a platform isolation driver is injected.
import http from "node:http";
const PORT=Number(process.env.PORT||8790),TOKEN=String(process.env.SOOLEN_EXECUTOR_BACKEND_TOKEN||"");
const driver=globalThis.__SOOLEN_PLATFORM_ISOLATION_DRIVER__;
function send(res,status,data){res.writeHead(status,{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff","content-security-policy":"default-src 'none'"});res.end(JSON.stringify(data));}
function auth(req){return Boolean(TOKEN)&&req.headers.authorization===`Bearer ${TOKEN}`;}
async function body(req){let raw="";for await(const c of req){raw+=c;if(raw.length>2_000_000)throw new Error("BODY_TOO_LARGE");}return JSON.parse(raw||"{}");}
function safePolicy(p={}){return {network:"deny",secrets:"none",readOnlyRoot:true,nonRoot:true,noHostMounts:true,noDockerSocket:true,maxMemoryMB:Math.min(Number(p.maxMemoryMB)||768,1024),maxCpu:Math.min(Number(p.maxCpu)||2,2),maxPids:Math.min(Number(p.maxPids)||128,128),timeoutMs:Math.min(Number(p.timeoutMs)||120000,180000)};}
async function execute(kind,b){if(!driver||typeof driver[kind]!=="function")return {passed:null,status:"platform-isolation-driver-not-connected",errors:["Platform isolation driver not connected"]};const request={workspaceId:String(b.workspaceId||"").slice(0,100),specification:b.specification||{},plan:b.plan||{},policy:safePolicy(b.policy)};return driver[kind](request);}
http.createServer(async(req,res)=>{try{if(!auth(req))return send(res,401,{error:"UNAUTHORIZED"});if(req.method!=="POST")return send(res,405,{error:"POST_ONLY"});const b=await body(req);if(req.url==="/v1/build")return send(res,200,await execute("build",b));if(req.url==="/v1/test")return send(res,200,await execute("test",b));return send(res,404,{error:"NOT_FOUND"});}catch(e){return send(res,500,{error:e?.message==="BODY_TOO_LARGE"?"BODY_TOO_LARGE":"EXECUTOR_ERROR"});}}).listen(PORT,()=>console.log(`Soolen Executor Backend listening on ${PORT}`));
