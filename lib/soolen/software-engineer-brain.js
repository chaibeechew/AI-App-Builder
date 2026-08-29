import {createCodeCreationPlan,validateCodeProposal,acceptanceGate} from "./code-creator.js";
// Orchestrates creation/review/verification without granting itself execution permissions.
export async function runSoftwareEngineerBrain(input={},handlers={}){
 const plan=createCodeCreationPlan(input);if(typeof handlers.create!=="function")throw new Error("SOOLEN_CODE_CREATOR_REQUIRED");let proposal=await handlers.create(plan);const history=[];const max=Math.max(0,Math.min(3,Number(input.maxRepairs??3)));
 for(let attempt=0;attempt<=max;attempt++){
  const proposalCheck=validateCodeProposal(proposal);const staticReview=proposalCheck.passed&&handlers.review?await handlers.review(proposal):{passed:proposalCheck.passed,errors:proposalCheck.errors};
  const sandbox=proposalCheck.passed&&staticReview.passed&&handlers.sandbox?await handlers.sandbox(proposal):{passed:false,status:"sandbox-required"};
  const security=handlers.security?await handlers.security(proposal):{passed:false,status:"security-review-required"};const privacy=handlers.privacy?await handlers.privacy(proposal):{passed:false,status:"privacy-review-required"};
  const gate=acceptanceGate({proposal,staticReview,sandbox,security,privacy});history.push({attempt,proposalCheck,staticReview,sandbox:{passed:sandbox?.passed,status:sandbox?.status},security,privacy,gate});if(gate.passed)return {status:"verified",proposal,plan,history};if(attempt===max||typeof handlers.repair!=="function")break;
  proposal=await handlers.repair({proposal,plan,attempt:attempt+1,failures:[...proposalCheck.errors,...(staticReview.errors||[]),...(sandbox.failures||sandbox.errors||[])]});
 }
 return {status:"needs-attention",proposal,plan,history};
}
