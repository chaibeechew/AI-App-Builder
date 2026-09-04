import { NextResponse } from 'next/server';
import { createCreativeMediaLifecycleAdapter } from '../../../../lib/ai/creative-media-lifecycle-adapter.js';

const MAX_REQUEST_BYTES=16*1024;
function noStore(payload,status=200){return NextResponse.json(payload,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff'}});}
function statusFor(code){if(code==='AUTHENTICATION_REQUIRED')return 401;if(code==='ACCOUNT_VERIFICATION_REQUIRED')return 403;if(code==='MEDIA_PROJECT_NOT_FOUND'||code==='MEDIA_ASSET_NOT_FOUND')return 404;if(/INVALID/.test(code||''))return 400;return 500;}

export async function GET(request){
  try{const url=new URL(request.url);const projectId=String(url.searchParams.get('projectId')||'').trim();const adapter=createCreativeMediaLifecycleAdapter();const result=await adapter.loadProjectMedia({projectId});if(!result.ok)return noStore({ok:false,code:result.code},statusFor(result.code));return noStore({ok:true,projectId:result.projectId,items:result.items,privacy:{signedUrlReturned:false,ownerScoped:true}});}catch{return noStore({ok:false,code:'MEDIA_PROJECT_ASSETS_UNAVAILABLE'},500);}
}

export async function POST(request){
  try{const length=Number(request.headers.get('content-length')||0);if(length>MAX_REQUEST_BYTES)return noStore({ok:false,code:'MEDIA_HANDOFF_REQUEST_TOO_LARGE'},413);const body=await request.json().catch(()=>null);if(!body||Buffer.byteLength(JSON.stringify(body),'utf8')>MAX_REQUEST_BYTES)return noStore({ok:false,code:'MEDIA_HANDOFF_REQUEST_INVALID'},400);const adapter=createCreativeMediaLifecycleAdapter();const result=await adapter.attachAssetToProject({projectId:body.projectId,assetId:body.assetId,suggestedPage:body.suggestedPage,suggestedRole:body.suggestedRole,placementReason:body.placementReason});if(!result.ok)return noStore({ok:false,code:result.code},statusFor(result.code));return noStore({ok:true,attached:true,asset:result.asset,contract:result.contract,evidence:{ownerValidated:true,durableAssetRequired:true,appBuilderCoreMutation:false}});
  }catch{return noStore({ok:false,code:'MEDIA_PROJECT_ATTACH_UNAVAILABLE'},500);}
}

export async function DELETE(request){
  try{const url=new URL(request.url);const projectId=String(url.searchParams.get('projectId')||'').trim();const assetId=String(url.searchParams.get('assetId')||'').trim();const adapter=createCreativeMediaLifecycleAdapter();const result=await adapter.detachAssetFromProject({projectId,assetId});if(!result.ok)return noStore({ok:false,code:result.code},statusFor(result.code));return noStore({ok:true,detached:true,projectId:result.projectId,assetId:result.assetId,destructiveAssetDelete:false});}catch{return noStore({ok:false,code:'MEDIA_PROJECT_DETACH_UNAVAILABLE'},500);}
}
