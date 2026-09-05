import { NextResponse } from 'next/server';
import { summarizeRealityIntelligenceFoundation } from '../../../../../lib/reality/reality-intelligence-contract.js';

export const dynamic='force-dynamic';

export async function GET(){
  const foundation=summarizeRealityIntelligenceFoundation();
  return NextResponse.json({
    ok:true,
    product:'LANERIQ AI',
    system:'Reality Intelligence Foundation',
    ...foundation,
    liveClaims:{realWorldPrediction:false,physicalAction:false,liveWorldModel:false},
  },{headers:{'Cache-Control':'no-store'}});
}
