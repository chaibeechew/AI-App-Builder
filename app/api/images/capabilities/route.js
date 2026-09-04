import { NextResponse } from 'next/server';
import { buildCreativeMediaReadinessMatrix, filterCreativeMediaReadiness } from '../../../../lib/ai/creative-media-readiness-matrix.js';
import { getCreativeMediaRuntimeProviderSnapshot } from '../../media/readiness-matrix/route.js';

export async function GET(){
  const matrix=filterCreativeMediaReadiness(buildCreativeMediaReadinessMatrix({providers:getCreativeMediaRuntimeProviderSnapshot(),outputEvidence:[],ciVerified:false}),{surface:'image'});
  return NextResponse.json({ok:true,surface:'image',...matrix},{headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff'}});
}
