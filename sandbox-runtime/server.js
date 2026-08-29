// Soolen isolated Sandbox Runtime service.
// Deploy this as a SEPARATE locked-down service/container, never inside the main web process.
import http from "node:http";
import crypto from "node:crypto";

const PORT=Number(process.env.PORT||8787);const TOKEN=String(process.env.SOOLEN_SANDBOX_RUNTIME_TOKEN||"");
const workspaces=new Map();
function send(res,status,data){const body=JSON.stringify(data);res.writeHead(status,{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"});res.end(body);}
function auth(req){if(!TOKEN)return false;return req.headers.authorization===`Bearer ${TOKEN}`;}
async function body(req){let raw="";for await(const c of req){raw+=c;if(raw.length>2_000_000)throw new Error("BODY_TOO_LARGE");}return JSON.parse(raw||"{}");}
function safePolicy(p={}){return {network:"deny",filesystem:"ephemeral-workspace-only",secrets:"none",maxBuildMs:Math.min(Number(p.maxBuildMs)||120000,120000),maxTestMs:Math.min(Number(p.maxTestMs)||60000,60000),maxMemoryMB:Math.min(Number(p.maxMemoryMB)||768,1024)};}

const server=http.createServer(async(req,res)=>{try{
 if(!auth(req))return send(res,401,{error:"UNAUTHORIZED"});if(req.method!=="POST")return send(res,405,{error:"POST_ONLY"});const b=await body(req);
 if(req.url==="/v1/workspaces"){const id=crypto.randomUUID();workspaces.set(id,{id,specification:b.specification||{},policy:safePolicy(b.policy),createdAt:Date.now()});return send(res,200,{id,specification:b.specification||{}});}
 const ws=workspaces.get(String(b.workspaceId||""));if(!ws)return send(res,404,{error:"WORKSPACE_NOT_FOUND"});
 if(req.url==="/v1/build")return send(res,200,{passed:null,status:"executor-not-connected",errors:["Isolated container executor is not connected yet."]});
 if(req.url==="/v1/test")return send(res,200,{passed:null,status:"executor-not-connected",errors:["Browser/runtime test executor is not connected yet."],plan:b.plan||{}});
 if(req.url==="/v1/cleanup"){workspaces.delete(ws.id);return send(res,200,{cleaned:true});}
 return send(res,404,{error:"NOT_FOUND"});
}catch(e){return send(res,500,{error:String(e?.message||"SANDBOX_ERROR").slice(0,300)});}});
server.listen(PORT,()=>console.log(`Soolen Sandbox Runtime listening on ${PORT}`));
