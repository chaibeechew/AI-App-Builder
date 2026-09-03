import { NextResponse } from "next/server";
import {
  LANERIQ_18_PAGE_SPEC_VERSION,
  LANERIQ_18_PAGES,
  LANERIQ_GLOBAL_NAV,
  LANERIQ_CORE_CREATION_CHAIN,
  LANERIQ_POWER_WORKSPACE_CHAIN,
  LANERIQ_REAL_EXECUTION_CHAIN,
  LANERIQ_18_PAGE_AI_RULES,
  LANERIQ_18_PAGE_DESIGN_RULES,
} from "../../../../lib/product/laneriq-18-page-master.js";

export const dynamic = "force-dynamic";

export async function GET(){
  const pages=LANERIQ_18_PAGES.map(page=>({
    id:page.id,
    slug:page.slug,
    name:page.name,
    route:page.route,
    risk:page.risk,
    humanApproval:page.humanApproval,
    evidence:page.evidence,
  }));

  return NextResponse.json({
    success:true,
    product:"LANERIQ AI",
    surface:"18-page-master-product",
    version:LANERIQ_18_PAGE_SPEC_VERSION,
    pageCount:pages.length,
    pages,
    navigation:LANERIQ_GLOBAL_NAV,
    flows:{
      coreCreation:LANERIQ_CORE_CREATION_CHAIN,
      powerWorkspace:LANERIQ_POWER_WORKSPACE_CHAIN,
      realExecution:LANERIQ_REAL_EXECUTION_CHAIN,
    },
    governance:{
      intentFirst:LANERIQ_18_PAGE_AI_RULES.intentFirst,
      humanInControl:LANERIQ_18_PAGE_AI_RULES.humanInControl,
      neverFakeCompletion:LANERIQ_18_PAGE_AI_RULES.neverFakeCompletion,
      neverFakeLiveProvider:LANERIQ_18_PAGE_AI_RULES.neverFakeLiveProvider,
      neverFakeStoreApproval:LANERIQ_18_PAGE_AI_RULES.neverFakeStoreApproval,
      neverInventAnalytics:LANERIQ_18_PAGE_AI_RULES.neverInventAnalytics,
      preserveOwnershipAndRls:LANERIQ_18_PAGE_AI_RULES.preserveOwnershipAndRls,
      selfHealMayNotLowerQualityGates:LANERIQ_18_PAGE_AI_RULES.selfHealMayNotLowerQualityGates,
      secretsStayServerSide:LANERIQ_18_PAGE_AI_RULES.secretsStayServerSide,
      smsOnHold:LANERIQ_18_PAGE_AI_RULES.smsOnHold,
    },
    design:{
      standard:LANERIQ_18_PAGE_DESIGN_RULES.standard,
      intentFirst:LANERIQ_18_PAGE_DESIGN_RULES.intentFirst,
      contextAdaptive:LANERIQ_18_PAGE_DESIGN_RULES.contextAdaptive,
      liquidIntelligenceGlass:LANERIQ_18_PAGE_DESIGN_RULES.liquidIntelligenceGlass,
      longPromptBehavior:LANERIQ_18_PAGE_DESIGN_RULES.longPromptBehavior,
      primaryPromptSurface:LANERIQ_18_PAGE_DESIGN_RULES.primaryPromptSurface,
    },
    evidence:{
      level:"CODE_CI_PRODUCT_SURFACE_CONTRACT",
      productionRuntimeVerified:false,
      browserVerified:false,
      externalProviderLiveVerified:false,
      physicalDeviceVerified:false,
      storeVerified:false,
      note:"This endpoint exposes product-surface structure and governance only. Stronger evidence labels are verified independently after merge and deployment.",
    },
  },{
    headers:{
      "Cache-Control":"no-store, max-age=0",
      "Pragma":"no-cache",
      "X-Content-Type-Options":"nosniff",
    },
  });
}
