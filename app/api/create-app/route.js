import { createServerClient } from "../../../lib/supabase/server.js";
import { runAutonomousEngine } from "../../../engine/autonomous-engine.js";
import { buildGenerationCandidateBudget, evaluateGenerationCandidatePool } from "../../../lib/ai/generation-candidate-orchestrator.js";
import { expandZeroCostIndustrySpecification } from "../../../lib/ai/zero-cost-industry-expander.js";
import {
  HIGH_RISK_API_LIMITS,
  boundaryResponse,
  isVerifiedUser,
  privateJson,
  readBoundedJson,
} from "../../../lib/security/high-risk-api-boundary.js";

function applyOutcomeIntelligence(result,prompt){
  if(!result?.specification||result?.specification?.productType==="mobile_game"||result?.specification?.game?.enabled===true)return result;
  const budget=buildGenerationCandidateBudget({costMode:"free",requestedCandidates:3});
  const primary=result.specification;
  const candidates=[
    {id:"primary",provider:result.aiProvider||"unknown",sourceKind:"primary-provider",specification:primary},
    {id:"local-structural-shadow-1",provider:"laneriq-local-transform",sourceKind:"zero-cost-structural-shadow",specification:expandZeroCostIndustrySpecification(primary,prompt,{variationIndex:1})},
    {id:"local-structural-shadow-2",provider:"laneriq-local-transform",sourceKind:"zero-cost-structural-shadow",specification:expandZeroCostIndustrySpecification(primary,prompt,{variationIndex:2})},
  ].slice(0,budget.targetCandidates);
  const pool=evaluateGenerationCandidatePool(candidates);
  return {
    ...result,
    specification:pool.selectedSpecification,
    intelligence:{
      ...(result.intelligence||{}),
      qualityCandidates:{
        enabled:true,
        mode:"primary-plus-zero-cost-local-structural-shadows",
        candidateCount:pool.candidateCount,
        uniqueCandidateCount:pool.uniqueCandidateCount,
        selectedCandidateId:pool.selectedCandidateId,
        selectedQualityScore:pool.selectedQualityScore,
        selectedDecision:pool.selectedDecision,
        requiresSelfHeal:pool.requiresSelfHeal,
        maxMeteredRemoteCalls:budget.maxMeteredRemoteCalls,
        paidShadowCalls:0,
        ranking:pool.ranking.map(item=>({id:item.id,sourceKind:item.sourceKind,qualityScore:item.qualityScore,decision:item.decision,rankingScore:item.rankingScore,duplicatePenalty:item.duplicatePenalty,hardBlockers:item.hardBlockers})),
        evidenceBoundary:"Runtime generation outcome ranking only. External-provider LIVE, Production deployment, browser, physical-device and store evidence remain separate.",
      },
    },
  };
}

export async function POST(request) {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return privateJson({ success: false, error: "Authentication required." }, 401);
    }
    if (!isVerifiedUser(user)) {
      return privateJson({ success: false, error: "Account verification is required." }, 403);
    }

    const body = await readBoundedJson(request, HIGH_RISK_API_LIMITS.createAppBytes);
    const prompt = String(body?.prompt || body?.idea || "").trim();

    if (!prompt) {
      return privateJson({ success: false, error: "Please describe the app you want to build." }, 400);
    }
    if (prompt.length > HIGH_RISK_API_LIMITS.createAppPromptChars) {
      return privateJson({ success: false, error: "App description is too long." }, 413);
    }

    const generated = await runAutonomousEngine(prompt);
    const result = applyOutcomeIntelligence(generated,prompt);

    return privateJson({
      success: true,
      ...result,
      userId: user.id,
      permissions: {
        create: true,
        preview: true,
        test: true,
        securityScan: true,
        publish: false,
        humanApprovalRequired: true,
      },
      message: "App created successfully. Human approval is required before publishing.",
    });
  } catch (error) {
    console.error("CREATE_APP_ERROR:", error?.name || "Error");
    return boundaryResponse(error, "LANERIQ AI build failed.");
  }
}
