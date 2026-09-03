import { createHash } from "node:crypto";
import { isApprovedImageOutputUrl } from "./image-generation-gateway.js";

const MAX_IMAGE_BYTES=8*1024*1024;
const SIGNED_URL_TTL_SECONDS=60*60;
const MIME_EXT=new Map([["image/png","png"],["image/jpeg","jpg"],["image/webp","webp"]]);

export class DurableImageOutputError extends Error{
  constructor(message,code="IMAGE_DURABLE_OUTPUT_FAILED"){super(message);this.name="DurableImageOutputError";this.code=code;}
}

function signatureMatches(mime,buffer){
  if(!Buffer.isBuffer(buffer)||!buffer.length)return false;
  if(mime==="image/png")return buffer.length>=8&&buffer.subarray(0,8).toString("hex")==="89504e470d0a1a0a";
  if(mime==="image/jpeg")return buffer.length>=3&&buffer[0]===0xff&&buffer[1]===0xd8&&buffer[2]===0xff;
  if(mime==="image/webp")return buffer.length>=12&&buffer.subarray(0,4).toString("ascii")==="RIFF"&&buffer.subarray(8,12).toString("ascii")==="WEBP";
  return false;
}

function parseDataImage(raw){
  const match=String(raw||"").match(/^data:(image\/(?:png|jpeg|webp))(?:;charset=[^;,]+)?;base64,(.*)$/is);
  if(!match)return null;
  const mime=match[1].toLowerCase();
  const buffer=Buffer.from(match[2],"base64");
  if(!buffer.length||buffer.length>MAX_IMAGE_BYTES||!signatureMatches(mime,buffer))throw new DurableImageOutputError("Provider image bytes are invalid.","IMAGE_DURABLE_BYTES_INVALID");
  return{mime,buffer};
}

async function fetchRemoteImage(raw){
  if(!isApprovedImageOutputUrl(raw))throw new DurableImageOutputError("Provider output host is not approved.","IMAGE_DURABLE_HOST_NOT_ALLOWED");
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetch(String(raw),{cache:"no-store",redirect:"error",signal:controller.signal,headers:{Accept:"image/png,image/jpeg,image/webp"}});
    if(!response.ok)throw new DurableImageOutputError("Provider image could not be captured.","IMAGE_DURABLE_FETCH_FAILED");
    const mime=String(response.headers.get("content-type")||"").split(";")[0].toLowerCase();
    if(!MIME_EXT.has(mime))throw new DurableImageOutputError("Provider image type is not supported.","IMAGE_DURABLE_TYPE_INVALID");
    const length=Number(response.headers.get("content-length")||0);if(length>MAX_IMAGE_BYTES)throw new DurableImageOutputError("Provider image is too large.","IMAGE_DURABLE_TOO_LARGE");
    const buffer=Buffer.from(await response.arrayBuffer());
    if(!buffer.length||buffer.length>MAX_IMAGE_BYTES||!signatureMatches(mime,buffer))throw new DurableImageOutputError("Provider image bytes are invalid.","IMAGE_DURABLE_BYTES_INVALID");
    return{mime,buffer};
  }catch(error){
    if(error?.name==="AbortError")throw new DurableImageOutputError("Provider image capture timed out.","IMAGE_DURABLE_FETCH_TIMEOUT");
    throw error;
  }finally{clearTimeout(timer);}
}

async function decodeImage(image){
  const data=parseDataImage(image);if(data)return data;
  if(/^https:\/\//i.test(String(image||"")))return fetchRemoteImage(image);
  throw new DurableImageOutputError("Provider returned an unsupported image format.","IMAGE_DURABLE_FORMAT_INVALID");
}

async function signAsset(admin,asset){
  const{data,error}=await admin.storage.from("user-assets").createSignedUrl(asset.storage_path,SIGNED_URL_TTL_SECONDS);
  if(error||!data?.signedUrl)throw new DurableImageOutputError("Private generated image could not be signed.","IMAGE_DURABLE_SIGN_FAILED");
  return data.signedUrl;
}

async function findExisting(admin,userId,fingerprint){
  const{data,error}=await admin.from("asset_library").select("id,storage_path,mime_type,file_size").eq("user_id",userId).eq("content_fingerprint",fingerprint).maybeSingle();
  if(error)throw new DurableImageOutputError("Generated image lookup failed.","IMAGE_DURABLE_LOOKUP_FAILED");
  return data||null;
}

async function rollbackCreated(admin,created){
  if(!created.length)return;
  const paths=created.map(item=>item.storagePath).filter(Boolean);const ids=created.map(item=>item.id).filter(Boolean);
  try{if(paths.length)await admin.storage.from("user-assets").remove(paths);}catch{}
  try{if(ids.length)await admin.from("asset_library").delete().in("id",ids);}catch{}
}

export async function persistGeneratedImages({admin,userId,requestId,items,mode,style,palette,placement}){
  const durable=[];const created=[];
  try{
    for(let index=0;index<items.length;index++){
      const item=items[index];const parsed=await decodeImage(item?.image);const fingerprint=createHash("sha256").update(parsed.buffer).digest("hex");
      let asset=await findExisting(admin,userId,fingerprint);
      if(!asset){
        const ext=MIME_EXT.get(parsed.mime)||"bin";const safeRequest=String(requestId||"image").replace(/[^a-zA-Z0-9._-]/g,"-").slice(0,70);const fileName=`LANERIQ-provider-${safeRequest}-${index+1}.${ext}`.slice(0,180);const storagePath=`${userId}/generated/${crypto.randomUUID()}-${fileName}`;
        const{error:uploadError}=await admin.storage.from("user-assets").upload(storagePath,parsed.buffer,{contentType:parsed.mime,upsert:false,cacheControl:"3600"});
        if(uploadError)throw new DurableImageOutputError("Generated image private upload failed.","IMAGE_DURABLE_UPLOAD_FAILED");
        const intelligence={purpose:"image_studio_generated",generated:true,mode,style,providerOutput:true,generationRequestId:requestId,reusableAcrossUsers:false,rawPrivateAssetsReusableAcrossCustomers:false,privateCustomerAsset:true,source:"model"};
        const{data:inserted,error:dbError}=await admin.from("asset_library").insert({user_id:userId,file_name:fileName,storage_path:storagePath,mime_type:parsed.mime,file_size:parsed.buffer.length,category:"image",alt_text:`Generated ${mode} visual`,intelligence,content_fingerprint:fingerprint}).select("id,storage_path,mime_type,file_size").single();
        if(dbError){
          await admin.storage.from("user-assets").remove([storagePath]);
          if(String(dbError.code||"")==="23505")asset=await findExisting(admin,userId,fingerprint);
          if(!asset)throw new DurableImageOutputError("Generated image metadata save failed.","IMAGE_DURABLE_METADATA_FAILED");
        }else{asset=inserted;created.push({id:asset.id,storagePath});}
      }
      const signedUrl=await signAsset(admin,asset);
      durable.push({id:item?.id||`generated-${index+1}`,assetId:asset.id,image:signedUrl,width:item?.width||null,height:item?.height||null,mode,style,palette,source:"model",placement,persisted:true});
    }
    return durable;
  }catch(error){await rollbackCreated(admin,created);throw error;}
}

export async function replayPersistedImages({admin,userId,assetIds,mode,style,palette,placement}){
  const ids=Array.isArray(assetIds)?assetIds.filter(Boolean).slice(0,4):[];if(!ids.length)return[];
  const{data,error}=await admin.from("asset_library").select("id,storage_path,mime_type,file_size").eq("user_id",userId).in("id",ids);
  if(error)throw new DurableImageOutputError("Generated image replay lookup failed.","IMAGE_DURABLE_REPLAY_LOOKUP_FAILED");
  const byId=new Map((data||[]).map(asset=>[asset.id,asset]));const output=[];
  for(const id of ids){const asset=byId.get(id);if(!asset)throw new DurableImageOutputError("Generated image replay asset is missing.","IMAGE_DURABLE_REPLAY_MISSING");output.push({id:`replay-${id}`,assetId:id,image:await signAsset(admin,asset),mode,style,palette,source:"model",placement,persisted:true});}
  return output;
}
