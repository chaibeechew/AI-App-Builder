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
    ok:true,service:'LANERIQ Unified Intelligence Core',core,reality,
    security:{version:security.version,privacyPreserving:security.privacyPreserving,canAuthorizeClean:security.canAuthorizeClean},
    integration:{creativeMediaRuntimeDependency:'STACKED_PR_312_RUNTIME',realityRuntimeDependency:'MAIN_INTEGRATED_6df0f1d5',unifiedCoreProductionMerged:false},
    truth:'CODE_READY',
    statement:'Status is read-only. Reality Intelligence is now sourced from main. CODE_READY does not imply Creative Media #312, external world models, future prediction, premium providers or physical actions are LIVE.',
  });
}
