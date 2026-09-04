import { NextResponse } from 'next/server';
import { createCreativeMediaLifecycleAdapter } from '../../../../lib/ai/creative-media-lifecycle-adapter.js';

function noStore(payload,status=200){return NextResponse.json(payload,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff'}});}
function statusFor(code){if(code==='AUTHENTICATION_REQUIRED')return 401;if(code==='ACCOUNT_VERIFICATION_REQUIRED')return 403;if(code==='MEDIA_PROJECT_NOT_FOUND')return 404;if(/INVALID/.test(code||''))return 400;return 500;}

export async function GET(request){
  try{const url=new URL(request.url);const projectId=String(url.searchParams.get('projectId')||'').trim();const adapter=createCreativeMediaLifecycleAdapter();const result=await adapter.buildProjectExportManifest({projectId});if(!result.ok)return noStore({ok:false,code:result.code},statusFor(result.code));return noStore({ok:true,manifest:result.manifest,evidence:{durableAssetsOnly:true,signedUrlsExcluded:true,providerCredentialsExcluded:true,rawPromptsExcluded:true}});}catch{return noStore({ok:false,code:'MEDIA_EXPORT_MANIFEST_UNAVAILABLE'},500);}
}
