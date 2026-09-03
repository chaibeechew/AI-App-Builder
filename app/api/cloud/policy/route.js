import { NextResponse } from "next/server";
import { publicCloudContract } from "../../../../lib/cloud/contracts.js";
import { publicCreatorOperationsCloudBoundary } from "../../../../lib/cloud/creator-operations.js";
import { publicEncryptionEnvelopePolicy } from "../../../../lib/cloud/encryption-envelope.js";
import { publicProjectCloudBoundary } from "../../../../lib/cloud/projects.js";
import { publicResourceRouterPolicy } from "../../../../lib/cloud/resource-router.js";
import { publicCloudSecurityPolicy } from "../../../../lib/cloud/security-policy.js";
import { publicServerEconomicsPolicy } from "../../../../lib/cloud/server-economics.js";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    success: true,
    product: "LANERIQ Cloud",
    stage: "embedded_separable_module",
    contract: publicCloudContract(),
    security: publicCloudSecurityPolicy(),
    encryptionEnvelope: publicEncryptionEnvelopePolicy(),
    projects: publicProjectCloudBoundary(),
    creatorOperations: publicCreatorOperationsCloudBoundary(),
    router: publicResourceRouterPolicy(),
    serverEconomics: publicServerEconomicsPolicy(),
    evidence: {
      cloudDomainBoundaryInCode: true,
      projectReadAdapterMigrated: true,
      creatorLifecycleAdapterMigrated: true,
      legacyDirectProviderRouteBudget: 73,
      clientSideEncryptionEnvelopeInCode: true,
      providerAdaptersFullyMigrated: false,
      clientSideEncryptionFullyLive: false,
      zeroKnowledgeNativeKeyCustodyLive: false,
      dedicatedLaneriqServerLive: false,
    },
  }, {
    headers: {
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
