import { createHash } from "node:crypto";
import { getVideoRendererConfig, normalizeVideoOutputPath } from "./render-gateway.js";

const MAX_VIDEO_BYTES=64*1024*1024;
const FETCH_TIMEOUT_MS=30000;

export class DurableVideoOutputError extends Error{
  constructor(message,code="VIDEO_DURABLE_OUTPUT_FAILED",status=502){super(message);this.name="DurableVideoOutputError";this.code=code;this.status=status;}
}

function mp4Signature(buffer){return Buffer.isBuffer(buffer)&&buffer.length>=12&&buffer.subarray(4,8).toString("ascii")==="ftyp";}
function endpointHost(value){try{return new URL(String(value||"").replace("{jobId}","job")).hostname.toLowerCase()}catch{return"";}}
function outputUrl(raw){
  const normalized=normalizeVideoOutputPath(raw);if(!normalized)throw new DurableVideoOutputError("Renderer output path is not approved.","VIDEO_DURABLE_OUTPUT_NOT_ALLOWED");
  if(/^https:\/\//i.test(normalized))return new URL(normalized);
  const config=getVideoRendererConfig();const base=config.endpoint||config.statusEndpoint;if(!base)throw new DurableVideoOutputError("Renderer output cannot be resolved without a connected runtime.","VIDEO_DURABLE_OUTPUT_UNRESOLVED");
  let resolved;try{resolved=new URL(normalized,new URL(String(base).replace("{jobId}","job")))}catch{throw new DurableVideoOutputError("Renderer output path could not be resolved.","VIDEO_DURABLE_OUTPUT_UNRESOLVED");}
  if(!normalizeVideoOutputPath(resolved.toString()))throw new DurableVideoOutputError("Resolved renderer output host is not approved.","VIDEO_DURABLE_OUTPUT_NOT_ALLOWED");
  return resolved;
}
function outputHeaders(url){
  const headers={Accept:"video/mp4,application/octet-stream"};const config=getVideoRendererConfig();const trusted=new Set([endpointHost(config.endpoint),endpointHost(config.statusEndpoint)].filter(Boolean));const token=String(process.env.VIDEO_RENDER_TOKEN||"").trim();if(token&&trusted.has(url.hostname.toLowerCase()))headers.Authorization=`Bearer ${token}`;return headers;
}
async function fetchMp4(raw){
  const url=outputUrl(raw);const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),FETCH_TIMEOUT_MS);
  try{
    const response=await fetch(url,{method:"GET",headers:outputHeaders(url),cache:"no-store",redirect:"error",signal:controller.signal});
    if(!response.ok)throw new DurableVideoOutputError("Completed renderer output could not be captured.","VIDEO_DURABLE_FETCH_FAILED",response.status>=400&&response.status<600?response.status:502);
    const length=Number(response.headers.get("content-length")||0);if(length>MAX_VIDEO_BYTES)throw new DurableVideoOutputError("Completed video is larger than the durable capture limit.","VIDEO_DURABLE_TOO_LARGE",413);
    const mime=String(response.headers.get("content-type")||"").split(";")[0].toLowerCase();if(mime&&mime!=="video/mp4"&&mime!=="application/octet-stream")throw new DurableVideoOutputError("Renderer returned a non-MP4 output type.","VIDEO_DURABLE_TYPE_INVALID");
    const buffer=Buffer.from(await response.arrayBuffer());if(!buffer.length||buffer.length>MAX_VIDEO_BYTES||!mp4Signature(buffer))throw new DurableVideoOutputError("Renderer returned invalid MP4 bytes.","VIDEO_DURABLE_BYTES_INVALID");return buffer;
  }catch(error){if(error?.name==="AbortError")throw new DurableVideoOutputError("Completed video capture timed out.","VIDEO_DURABLE_FETCH_TIMEOUT",504);throw error;}finally{clearTimeout(timer);}
}
async function existingAsset(admin,userId,fingerprint){const{data,error}=await admin.from("asset_library").select("id,storage_path,file_name,mime_type,file_size").eq("user_id",userId).eq("content_fingerprint",fingerprint).maybeSingle();if(error)throw new DurableVideoOutputError("Durable video asset lookup failed.","VIDEO_DURABLE_LOOKUP_FAILED");return data||null;}

export async function persistRenderedVideo({admin,userId,projectId,versionId,requestId,outputPath}){
  const buffer=await fetchMp4(outputPath);const fingerprint=createHash("sha256").update(buffer).digest("hex");let asset=await existingAsset(admin,userId,fingerprint);let created=null;
  if(!asset){
    const fileName=`LANERIQ-video-${String(versionId||"render").slice(0,36)}.mp4`;const storagePath=`${userId}/video-render/${crypto.randomUUID()}-${fileName}`;
    const{error:uploadError}=await admin.storage.from("user-assets").upload(storagePath,buffer,{contentType:"video/mp4",upsert:false,cacheControl:"3600"});if(uploadError)throw new DurableVideoOutputError("Private final-video upload failed.","VIDEO_DURABLE_UPLOAD_FAILED");
    const intelligence={purpose:"video_render_output",generated:true,providerOutput:true,projectId,versionId,generationRequestId:requestId,reusableAcrossUsers:false,rawPrivateAssetsReusableAcrossCustomers:false,privateCustomerAsset:true,source:"renderer"};
    const{data:inserted,error:dbError}=await admin.from("asset_library").insert({user_id:userId,file_name:fileName,storage_path:storagePath,mime_type:"video/mp4",file_size:buffer.length,category:"video",alt_text:"LANERIQ AI rendered video",intelligence,content_fingerprint:fingerprint}).select("id,storage_path,file_name,mime_type,file_size").single();
    if(dbError){await admin.storage.from("user-assets").remove([storagePath]);if(String(dbError.code||"")==="23505")asset=await existingAsset(admin,userId,fingerprint);if(!asset)throw new DurableVideoOutputError("Final-video metadata save failed.","VIDEO_DURABLE_METADATA_FAILED");}else{asset=inserted;created={id:asset.id,storagePath};}
  }
  try{return{assetId:asset.id,storagePath:asset.storage_path,stablePath:`/api/video/assets/${asset.id}`,fileName:asset.file_name,fileSize:asset.file_size,fingerprint};}
  catch(error){if(created){try{await admin.storage.from("user-assets").remove([created.storagePath]);await admin.from("asset_library").delete().eq("id",created.id).eq("user_id",userId);}catch{}}throw error;}
}
