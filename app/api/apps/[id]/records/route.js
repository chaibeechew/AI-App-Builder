import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server.js";

const MAX_RECORDS = 100;
const MAX_FIELDS = 24;
const MAX_VALUE = 2000;

function fieldName(value){
  const raw = typeof value === "string" ? value : value?.name;
  return String(raw || "").split(":")[0].trim().replace(/[^a-zA-Z0-9_ -]/g,"").slice(0,80);
}
function entityMap(specification){
  const out = new Map();
  if(specification?.data && typeof specification.data === "object" && !Array.isArray(specification.data)){
    for(const [name,definition] of Object.entries(specification.data)){
      const fields = (Array.isArray(definition?.fields)?definition.fields:[]).map(fieldName).filter(Boolean).slice(0,MAX_FIELDS);
      out.set(String(name).slice(0,120), fields.length?fields:["name","details"]);
    }
  }
  if(Array.isArray(specification?.dataModels)){
    for(const model of specification.dataModels){
      const name=String(model?.name||model?.entity||"").trim().slice(0,120);if(!name||out.has(name))continue;
      const fields=(Array.isArray(model?.fields)?model.fields:[]).map(fieldName).filter(Boolean).slice(0,MAX_FIELDS);
      out.set(name,fields.length?fields:["name","details"]);
    }
  }
  if(!out.size)out.set("App Data",["name","details"]);
  return out;
}
function cleanValue(value){
  if(typeof value === "boolean")return value;
  if(typeof value === "number" && Number.isFinite(value))return value;
  return String(value??"").trim().slice(0,MAX_VALUE);
}
function cleanRecord(input,allowed){
  const source=input&&typeof input==="object"&&!Array.isArray(input)?input:{};const record={};
  for(const key of allowed){if(Object.prototype.hasOwnProperty.call(source,key))record[key]=cleanValue(source[key]);}
  if(!Object.keys(record).length)throw new Error("Record has no supported fields.");
  return record;
}
async function context(id){
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user)return {error:NextResponse.json({error:"Authentication required."},{status:401})};
  const {data:app,error:appError}=await supabase.from("apps").select("id,owner_id,current_version_id").eq("id",id).eq("owner_id",user.id).maybeSingle();
  if(appError||!app)return {error:NextResponse.json({error:"Project not found or access denied."},{status:404})};
  let specification={};
  if(app.current_version_id){const {data:version}=await supabase.from("app_versions").select("specification").eq("id",app.current_version_id).eq("app_id",id).maybeSingle();specification=version?.specification||{};}
  return {supabase,user,app,entities:entityMap(specification)};
}
function resolveEntity(entities,value){
  const requested=String(value||"").trim();if(requested&&entities.has(requested))return requested;
  const normalized=[...entities.keys()].find(key=>key.toLowerCase()===requested.toLowerCase());return normalized||[...entities.keys()][0];
}

export async function GET(request,{params}){
  try{
    const {id}=await params;const ctx=await context(id);if(ctx.error)return ctx.error;
    const url=new URL(request.url);const entity=resolveEntity(ctx.entities,url.searchParams.get("entity"));const q=String(url.searchParams.get("q")||"").trim().toLowerCase().slice(0,200);const limit=Math.min(MAX_RECORDS,Math.max(1,Number(url.searchParams.get("limit"))||50));
    const {data,error}=await ctx.supabase.from("app_data_records").select("id,entity_name,record_json,created_at,updated_at").eq("app_id",id).eq("owner_id",ctx.user.id).eq("entity_name",entity).order("created_at",{ascending:false}).limit(MAX_RECORDS);
    if(error)throw error;let rows=data||[];if(q)rows=rows.filter(row=>JSON.stringify(row.record_json||{}).toLowerCase().includes(q));rows=rows.slice(0,limit);
    return NextResponse.json({success:true,entity,fields:ctx.entities.get(entity)||[],records:rows.map(row=>({id:row.id,data:row.record_json,createdAt:row.created_at,updatedAt:row.updated_at}))});
  }catch(error){console.error("APP_RECORDS_GET_ERROR",error);return NextResponse.json({error:"Unable to load project records."},{status:500});}
}

export async function POST(request,{params}){
  try{
    const {id}=await params;const ctx=await context(id);if(ctx.error)return ctx.error;const body=await request.json().catch(()=>({}));const entity=resolveEntity(ctx.entities,body?.entity);const allowed=ctx.entities.get(entity)||[];let record;
    try{record=cleanRecord(body?.record,allowed);}catch(error){return NextResponse.json({error:error.message},{status:400});}
    const {data,error}=await ctx.supabase.from("app_data_records").insert({app_id:id,owner_id:ctx.user.id,entity_name:entity,record_json:record}).select("id,entity_name,record_json,created_at,updated_at").single();if(error)throw error;
    return NextResponse.json({success:true,record:{id:data.id,data:data.record_json,createdAt:data.created_at,updatedAt:data.updated_at}},{status:201});
  }catch(error){console.error("APP_RECORDS_POST_ERROR",error);return NextResponse.json({error:"Unable to save project record."},{status:500});}
}

export async function DELETE(request,{params}){
  try{
    const {id}=await params;const ctx=await context(id);if(ctx.error)return ctx.error;const body=await request.json().catch(()=>({}));const recordId=String(body?.recordId||"").trim();if(!/^[0-9a-f-]{36}$/i.test(recordId))return NextResponse.json({error:"Valid record id required."},{status:400});
    const {error}=await ctx.supabase.from("app_data_records").delete().eq("id",recordId).eq("app_id",id).eq("owner_id",ctx.user.id);if(error)throw error;return NextResponse.json({success:true});
  }catch(error){console.error("APP_RECORDS_DELETE_ERROR",error);return NextResponse.json({error:"Unable to delete project record."},{status:500});}
}
