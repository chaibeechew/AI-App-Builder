import { NextResponse } from 'next/server';
import { summarizeUnifiedIntelligenceCore } from '../../../../../lib/intelligence/unified-intelligence-contract.js';
import { summarizeRealityIntelligenceFoundation } from '../../../../../lib/reality/reality-intelligence-contract.js';
import { securityIntelligenceCloudStatus } from '../../../../../services/malware-defense/lib/security-intelligence-cloud.js';

export const dynamic='force-dynamic';

export async function GET(){
  const core=summarizeUnifiedIntelligenceCore();
  const reality=summarizeRealityIntelligenceFoundation();
  const security=securityIntelligenceCloudStatus();
  return NextResponse.json({
    ok:true,
    service:'LANERIQ Unified Intelligence Core',
    core,
    reality,
    security:{version:security.version,privacyPreserving:security.privacyPreserving,canAuthorizeClean:security.canAuthorizeClean},
    integration:{
      creativeMediaRuntimeDependency:'MAIN_PRODUCTION_VERIFIED',
      realityRuntimeDependency:'MAIN_PRODUCTION_VERIFIED',
      liuiBuilderRuntimeDependency:'MAIN_PRODUCTION_VERIFIED',
      unifiedCoreArtifact:'THIS_BUILD',
    },
    truth:'CODE_READY',
    statement:'Read-only capability status. CODE_READY is not a LIVE claim. Unified Core Production truth requires exact GitHub/Vercel/runtime SHA plus browser/runtime evidence; external world models, future prediction, premium providers and physical actions remain evidence-gated.',
  });
}
