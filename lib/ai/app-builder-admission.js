import { generateWithZeroCostAdmission } from "./zero-cost-admitted-generation.js";

const SAFE_STAGE=/^[a-z0-9_-]{1,80}$/i;

async function resolveRequestUserId(){
  try{
    const { createClient }=await import("../supabase/server.js");
    const supabase=await createClient();
    const { data:{ user } }=await supabase.auth.getUser();
    return user?.id?String(user.id):null;
  }catch{
    return null;
  }
}

function cleanStage(stage){
  const value=String(stage||"generation").trim().toLowerCase();
  return SAFE_STAGE.test(value)?value:"generation";
}

export async function generateAppBuilderWithAdmission(prompt,{
  userId=null,
  projectId=null,
  stage="generation",
  baseVersionId=null,
  attachmentCount=0,
  requestedAgents=1,
  reuseAllowed=true,
}={}){
  const resolvedUserId=userId?String(userId):await resolveRequestUserId();
  const scope=resolvedUserId
    ? projectId
      ? `user:${resolvedUserId}:project:${String(projectId)}`
      : `user:${resolvedUserId}:app-builder`
    : null;
  const purpose=`app-builder-${cleanStage(stage)}`;
  const variant=baseVersionId?String(baseVersionId):"new-project";
  const keyMaterial=`${variant}\n${String(prompt||"")}`;

  return generateWithZeroCostAdmission(prompt,{
    scope,
    purpose,
    reuseKeyMaterial:keyMaterial,
    reuseVariant:variant,
    reuseClass:"private_result",
    reuseAllowed:Boolean(scope&&reuseAllowed),
    allowApproximateReuse:false,
    interactive:true,
    queueAllowed:false,
    attachmentCount:Math.max(0,Number(attachmentCount||0)),
    requestedAgents:Math.max(1,Number(requestedAgents||1)),
    paidFallbackAllowed:false,
  });
}

export const APP_BUILDER_ADMISSION_POLICY=Object.freeze({
  localBeforeRemote:true,
  paidFallbackAllowed:false,
  privateReuseScopeRequired:true,
  crossUserPrivateReuseAllowed:false,
  approximatePrivateReuseAllowed:false,
  baseVersionBoundModifyReuse:true,
  unauthenticatedReuseAllowed:false,
});
