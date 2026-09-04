import { NextResponse } from 'next/server';
import { getImageGenerationConfig } from '../../../../lib/ai/image-generation-gateway.js';
import { getVideoRendererConfig } from '../../../../lib/video/render-gateway.js';
import { buildCreativeMediaReadinessMatrix } from '../../../../lib/ai/creative-media-readiness-matrix.js';

const csv=value=>String(value||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
const nonEmpty=value=>Boolean(String(value||'').trim());

export function getCreativeMediaRuntimeProviderSnapshot(){
  const image=getImageGenerationConfig();
  const renderer=getVideoRendererConfig();
  const videoGenerationConfigured=nonEmpty(process.env.VIDEO_GENERATION_PROVIDER)&&nonEmpty(process.env.VIDEO_GENERATION_ENDPOINT);
  return {
    image:{configured:image.configured,connected:image.connected,blockedByCostPolicy:image.blockedByCostPolicy,capabilities:csv(process.env.IMAGE_GENERATION_CAPABILITIES)},
    videoGeneration:{configured:videoGenerationConfigured,connected:videoGenerationConfigured&&!renderer.blockedByCostPolicy,blockedByCostPolicy:renderer.blockedByCostPolicy,capabilities:csv(process.env.VIDEO_GENERATION_CAPABILITIES)},
    videoRenderer:{configured:renderer.configured,connected:renderer.connected,blockedByCostPolicy:renderer.blockedByCostPolicy,capabilities:renderer.configured?['timeline-render']:[]},
  };
}

export async function GET(){
  const matrix=buildCreativeMediaReadinessMatrix({providers:getCreativeMediaRuntimeProviderSnapshot(),outputEvidence:[],ciVerified:false});
  return NextResponse.json({ok:true,...matrix,evidenceSource:'No runtime LIVE evidence is accepted from environment flags. Verified Production output evidence must be supplied by an evidence-backed integration.'},{headers:{'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','X-Content-Type-Options':'nosniff'}});
}
