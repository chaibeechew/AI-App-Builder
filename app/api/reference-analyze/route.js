import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server.js";
import { REFERENCE_LIMITS, buildReferenceAssetIntelligence, buildReferenceBrief, sanitizeReferenceAnalysisInput } from "../../../lib/media/reference-policy.js";

function pngSize(buf){return buf.length>=24&&buf.slice(0,8).toString("hex")==="89504e470d0a1a0a"?{width:buf.readUInt32BE(16),height:buf.readUInt32BE(20)}:null;}
function jpegSize(buf){try{let i=2;while(i+9<buf.length){if(buf[i]!==0xff){i+=1;continue;}const marker=buf[i+1];if(marker===0xd8||marker===0xd9){i+=2;continue;}const len=buf.readUInt16BE(i+2);if(!Number.isFinite(len)||len<2)break;if(marker>=0xc0&&marker<=0xc3)return{height:buf.readUInt16BE(i+5),width:buf.readUInt16BE(i+7)};i+=2+len;}}catch{}return null;}
function dimensionsFromBase64(data){try{const buf=Buffer.from(data,"base64");if(buf.length>700_000)return null;return pngSize(buf)||jpegSize(buf)||null;}catch{return null;}}
function noStore(payload,status=200){const response=NextResponse.json(payload,{status});response.headers.set("Cache-Control","private, no-store, max-age=0");response.headers.set("Pragma","no-cache");return response;}

export async function POST(request){
  try{
    const contentLength=Number(request.headers.get("content-length")||0);
    if(contentLength>REFERENCE_LIMITS.maxRequestBytes)return noStore({error:"Reference analysis payload is too large."},413);

    const supabase=await createClient();
    const {data:{user},error:userError}=await supabase.auth.getUser();
    if(userError||!user)return noStore({error:"Authentication required."},401);

    const body=await request.json().catch(()=>null);
    if(!body)return noStore({error:"Invalid reference analysis request."},400);
    const serializedLength=Buffer.byteLength(JSON.stringify(body),"utf8");
    if(serializedLength>REFERENCE_LIMITS.maxRequestBytes)return noStore({error:"Reference analysis payload is too large."},413);

    const {references,totalBase64Chars}=sanitizeReferenceAnalysisInput(body.references);
    if(!references.length)return noStore({error:"No supported reference frames were supplied."},400);
    if(totalBase64Chars>REFERENCE_LIMITS.maxAnalysisBase64Chars)return noStore({error:"Reference analysis payload is too large."},413);

    const grouped=new Map();
    for(const reference of references){
      const key=reference.sourceName;
      if(!grouped.has(key))grouped.set(key,{sourceName:key,frames:0,dimensions:[]});
      const entry=grouped.get(key);entry.frames+=1;
      const dimensions=dimensionsFromBase64(reference.data);if(dimensions)entry.dimensions.push(dimensions);
    }
    const assets=[...grouped.values()].slice(0,REFERENCE_LIMITS.maxFiles).map(item=>buildReferenceAssetIntelligence(item.sourceName,item.frames,item.dimensions));
    const analysis=buildReferenceBrief(assets);

    return noStore({
      success:true,
      analysis,
      assets,
      privacy:{ownerId:user.id,rawBytesRetained:false,reusableAcrossUsers:false,mode:"private-project-reference"},
      compute:{tier:"Z0_DETERMINISTIC",externalProviderCalls:0,modelInferenceUsed:false,sourceFramesProcessed:references.length},
      engine:"LANERIQ Local Reference Intelligence",
    });
  }catch(error){
    console.error("REFERENCE_ANALYZE_ERROR",String(error?.message||"Reference analysis failed.").slice(0,240));
    return noStore({error:"Unable to analyze these references right now."},500);
  }
}
