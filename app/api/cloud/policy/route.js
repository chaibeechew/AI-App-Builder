import { NextResponse } from "next/server";
import { publicCloudContract } from "../../../../lib/cloud/contracts.js";
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
    router: publicResourceRouterPolicy(),
    serverEconomics: publicServerEconomicsPolicy(),
    evidence: {
      cloudDomainBoundaryInCode: true,
      projectReadAdapterMigrated: true,
      legacyDirectProviderRouteBudget: 77,
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
