// Soolen isolated Sandbox Runtime. Deploy separately from AI App Builder.
import http from "node:http";import crypto from "node:crypto";import {createExecutor,dependencySecurity,productionGate} from "./executor.js";
const PORT=Number(process.env.PORT||8787),TOKEN=String(process.env.SOOLEN_SANDBOX_RUNTIME_TOKEN||"");const workspaces=new Map();
const executor=createExecutor(globalThis.__SOOLEN_ISOLATED_BACKEND__);
function send(res,status,data){res.writeHead(status,{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff","content-security-policy":"default-src 'none'"});res.end(JSON.stringify(data));}
function auth(req){return Boolean(TOKEN)&&req.headers.authorization===`Bearer ${TOKEN}`;}async function body(req){let raw="";for await(const c of req){raw+=c;if(raw.length>2_000_000)throw new Error("BODY_TOO_LARGE");}return JSON.parse(raw||"{}");}
function policy(p={}){return {network:"deny",filesystem:"ephemeral-workspace-only",secrets:"none",maxBuildMs:Math.min(+p.maxBuildMs||120000,120000),maxTestMs:Math.min(+p.maxTestMs||60000,60000),maxMemoryMB:Math.min(+p.maxMemoryMB||768,1024)};}
const server=http.createServer(async(req,res)=>{try{if(!auth(req))return send(res,401,{error:"UNAUTHORIZED"});if(req.method!=="POST")return send(res,405,{error:"POST_ONLY"});const b=await body(req);
 if(req.url==="/v1/workspaces"){const security=dependencySecurity(b.specification||{});if(!security.passed)return send(res,400,{error:"DEPENDENCY_SECURITY_BLOCK",blocked:security.blocked});const id=crypto.randomUUID();workspaces.set(id,{id,specification:b.specification||{},policy:policy(b.policy),createdAt:Date.now(),security});return send(res,200,{id,specification:b.specification||{}});}
 const ws=workspaces.get(String(b.workspaceId||""));if(!ws)return send(res,404,{error:"WORKSPACE_NOT_FOUND"});
 if(req.url==="/v1/build"){const result=await executor.build(ws);ws.build=result;return send(res,200,result);}
 if(req.url==="/v1/test"){const result=await executor.test(ws,b.plan||{});ws.runtime=result;const gate=productionGate({build:ws.build,runtime:result,security:ws.security,privacy:{passed:true}});return send(res,200,{...result,productionGate:gate});}
 if(req.url==="/v1/cleanup"){workspaces.delete(ws.id);return send(res,200,{cleaned:true});}return send(res,404,{error:"NOT_FOUND"});
}catch(e){return send(res,500,{error:String(e?.message||"SANDBOX_ERROR").slice(0,300)});}});server.listen(PORT,()=>console.log(`Soolen Sandbox Runtime listening on ${PORT}`));
