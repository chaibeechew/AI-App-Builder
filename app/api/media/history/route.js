import { NextResponse } from 'next/server';
import { createCreativeMediaLifecycleAdapter } from '../../../../lib/ai/creative-media-lifecycle-adapter.js';

function noStore(payload,status=200){return NextResponse.json(payload,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff'}});}

export async function GET(request){
  try{
    const url=new URL(request.url);const limit=Math.max(1,Math.min(100,Number(url.searchParams.get('limit'))||50));const category=String(url.searchParams.get('category')||'').trim().slice(0,60)||null;const adapter=createCreativeMediaLifecycleAdapter();const result=await adapter.loadOwnerHistory({limit,category});if(!result.ok){const status=result.code==='AUTHENTICATION_REQUIRED'?401:result.code==='ACCOUNT_VERIFICATION_REQUIRED'?403:500;return noStore({ok:false,code:result.code},status);}return noStore({ok:true,assets:result.assets,privacy:{rawPromptReturned:false,signedUrlReturned:false,reusableAcrossUsers:false}});
  }catch{return noStore({ok:false,code:'MEDIA_HISTORY_UNAVAILABLE'},500);}
}
