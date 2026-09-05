import { createClient } from "../../../../lib/supabase/server.js";
import {
  RequestBoundaryError,
  boundaryResponse,
  privateJson,
  readBoundedJson,
} from "../../../../lib/security/high-risk-api-boundary.js";
import {
  startProductionEvidenceRun,
  checkpointProductionEvidenceRun,
  failProductionEvidenceRun,
  completeProductionEvidenceRun,
} from "../../../../lib/production-e2e/evidence-ledger.js";

const MAX_BYTES=128*1024;

function sameOrigin(request){
  try{
    const origin=request.headers.get("origin");if(!origin)return false;
    const originHost=new URL(origin).host;
    const expectedHost=request.headers.get("x-forwarded-host")||request.headers.get("host")||request.nextUrl.host;
    const fetchSite=String(request.headers.get("sec-fetch-site")||"").toLowerCase();
    return originHost===expectedHost&&fetchSite!=="cross-site";
  }catch{return false;}
}

async function authenticatedUser(){
  const supabase=await createClient();const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user?.id)return null;return user;
}

export async function POST(request){
  try{
    if(!sameOrigin(request))throw new RequestBoundaryError("Same-origin request required.",403,"ORIGIN_REQUIRED");
    const user=await authenticatedUser();if(!user)return privateJson({success:false,authenticated:false,code:"AUTH_REQUIRED"},401);
    const body=await readBoundedJson(request,MAX_BYTES);const action=String(body?.action||"").trim().toLowerCase();
    if(action==="start")return privateJson(await startProductionEvidenceRun(user.id));
    if(action==="checkpoint")return privateJson(await checkpointProductionEvidenceRun({runId:body?.runId,stage:body?.stage,input:body?.input||{},userId:user.id}));
    if(action==="fail")return privateJson(await failProductionEvidenceRun({runId:body?.runId,userId:user.id,stage:body?.stage,code:body?.code,message:body?.message}));
    if(action==="complete")return privateJson(await completeProductionEvidenceRun({runId:body?.runId,userId:user.id,report:body?.report||{}}));
    throw new RequestBoundaryError("Unsupported Production evidence action.",400,"INVALID_ACTION");
  }catch(error){return boundaryResponse(error,"Unable to record authenticated Production evidence safely.");}
}
