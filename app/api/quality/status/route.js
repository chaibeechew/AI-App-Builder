import { NextResponse } from "next/server";
import { buildReleaseQualityStatus, RELEASE_QUALITY_INTELLIGENCE_POLICY } from "../../../../lib/ai/release-quality-intelligence.js";
import { GENERATION_QUALITY_JUDGE_POLICY } from "../../../../lib/ai/generation-quality-judge.js";
import { GENERATION_CANDIDATE_ORCHESTRATOR_POLICY } from "../../../../lib/ai/generation-candidate-orchestrator.js";
import { OUTCOME_LEARNING_LEDGER_POLICY, OUTCOME_LEARNING_COMPARISON_POLICY } from "../../../../lib/ai/outcome-learning-ledger.js";

export async function GET(){
  const payload={
    success:true,
    status:buildReleaseQualityStatus(),
    judge:GENERATION_QUALITY_JUDGE_POLICY,
    candidateOrchestrator:GENERATION_CANDIDATE_ORCHESTRATOR_POLICY,
    outcomeLearning:{
      enabled:true,
      mode:"privacy-safe-synthetic-release-comparison",
      policy:OUTCOME_LEARNING_LEDGER_POLICY,
      comparisonPolicy:OUTCOME_LEARNING_COMPARISON_POLICY,
      baselineGovernance:"reviewed-pull-request-only",
    },
    evidence:{
      level:"CODE_CI_CAPABILITY",
      productionRuntimeVerified:false,
      externalProviderLiveVerified:false,
      physicalDeviceVerified:false,
      storeVerified:false,
      note:"This endpoint exposes aggregate quality-control and privacy-safe synthetic release-learning policy only. Independent deployment/browser/device/store evidence is required before stronger labels are used.",
    },
  };
  return NextResponse.json(payload,{headers:{"Cache-Control":"no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});
}
