import { NextResponse } from "next/server";
import { createClient } from "../../../../../../../../lib/supabase/server.js";

function cleanPayload(value){
  if(!value||typeof value!=="object"||Array.isArray(value))return {};
  const out={};
  for(const [key,val] of Object.entries(value).slice(0,80)){
    if(typeof val==="string")out[String(key).slice(0,80)]=val.slice(0,4000);
    else if(typeof val==="number"||typeof val==="boolean"||val===null)out[String(key).slice(0,80)]=val;
  }
  return out;
}

async function runInternalAction(supabase,{action,appId,userId,payload}){
  if(action.type==="save_crm"||action.type==="save_order"){
    const recordType=action.type==="save_crm"?"crm_contact":"order";
    const {data,error}=await supabase.from("workflow_records").insert({app_id:appId,owner_id:userId,record_type:recordType,payload}).select("id,record_type,created_at").single();
    if(error)throw error;
    return {type:action.type,status:"completed",record:data};
  }
  if(action.type==="notify_team"){
    return {type:action.type,status:"completed",channel:"in_app",message:"Team notification recorded for the project workspace."};
  }
  if(["send_email","send_sms","calendar"].includes(action.type)){
    return {type:action.type,status:"integration_required",message:`${action.label||action.type} needs a connected delivery integration before it can send externally.`};
  }
  return {type:action.type||"unknown",status:"skipped",message:"Unsupported workflow action."};
}

export async function POST(request,{params}){
  let runId=null;
  try{
    const {id,workflowId}=await params;
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"Authentication required."},{status:401});
    const {data:app}=await supabase.from("apps").select("id,owner_id").eq("id",id).eq("owner_id",user.id).single();
    if(!app)return NextResponse.json({error:"Project not found."},{status:404});
    const {data:workflow}=await supabase.from("app_workflows").select("id,name,trigger_type,actions,enabled").eq("id",workflowId).eq("app_id",id).eq("owner_id",user.id).single();
    if(!workflow)return NextResponse.json({error:"Workflow not found."},{status:404});
    if(!workflow.enabled)return NextResponse.json({error:"Workflow is paused."},{status:409});
    const body=await request.json().catch(()=>({}));
    const payload=cleanPayload(body?.payload||{});
    const {data:run,error:runError}=await supabase.from("workflow_runs").insert({app_id:id,workflow_id:workflowId,owner_id:user.id,trigger_payload:payload,status:"started"}).select("id").single();
    if(runError)throw runError;
    runId=run.id;
    const results=[];
    for(const action of Array.isArray(workflow.actions)?workflow.actions.slice(0,12):[]){
      try{results.push(await runInternalAction(supabase,{action,appId:id,userId:user.id,payload}));}
      catch(error){results.push({type:action?.type||"unknown",status:"failed",message:error?.message||"Action failed."});}
    }
    const failed=results.filter(x=>x.status==="failed").length;
    const pending=results.filter(x=>x.status==="integration_required").length;
    const status=failed?"partial":pending?"partial":"completed";
    const {error:updateError}=await supabase.from("workflow_runs").update({action_results:results,status,completed_at:new Date().toISOString()}).eq("id",runId).eq("owner_id",user.id);
    if(updateError)throw updateError;
    return NextResponse.json({success:true,run:{id:runId,status},workflow:{id:workflow.id,name:workflow.name,triggerType:workflow.trigger_type},results,note:pending?"Internal actions ran. External email/SMS/calendar actions stay blocked until a delivery integration is connected.":"Workflow completed."});
  }catch(error){
    console.error("WORKFLOW_RUN_ERROR",error);
    return NextResponse.json({error:error?.message||"Unable to run workflow.",runId},{status:500});
  }
}
