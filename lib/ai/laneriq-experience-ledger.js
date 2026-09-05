import {createHash} from "node:crypto";

const SECRET_PATTERN=/(api[_-]?key|authorization|bearer|password|passwd|secret|token|private[_-]?key|service[_-]?role)/i;
const ALLOWED_KINDS=new Set(["incident","benchmark","contract","runtime","physical_device","production_exact_sha","manual_review"]);
function clean(value,max=1200){return String(value||"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,max);}
function redact(value){const text=clean(value);return text.split(/\s+/).map(part=>SECRET_PATTERN.test(part)?"[REDACTED]":part).join(" ").replace(/(?:sk|key|tok)_[A-Za-z0-9_-]{12,}/g,"[REDACTED]");}
function compactEvidence(value){return (Array.isArray(value)?value:[]).slice(0,12).map(item=>({kind:ALLOWED_KINDS.has(clean(item?.kind,32))?clean(item.kind,32):"contract",ref:redact(item?.ref||"",180),passed:item?.passed===true,exactSha:item?.exactSha===true,independent:item?.independent===true}));}
function fingerprint(input){return createHash("sha256").update(JSON.stringify(input)).digest("hex");}

export function createExperienceCandidate({domain="architecture",title="",lesson="",source="contract",evidence=[],risk="normal",createdBy="laneriq-system"}={}){
  const safe={domain:clean(domain,48)||"architecture",title:redact(title).slice(0,160),lesson:redact(lesson).slice(0,1000),source:clean(source,32)||"contract",risk:["low","normal","high","critical"].includes(clean(risk,16).toLowerCase())?clean(risk,16).toLowerCase():"normal",createdBy:clean(createdBy,64)||"laneriq-system",evidence:compactEvidence(evidence)};
  if(!safe.lesson)throw new Error("EXPERIENCE_LESSON_REQUIRED");
  return{contract:"laneriq-experience-candidate-v1",id:fingerprint(safe).slice(0,32),status:"candidate",...safe,containsRawSecrets:false,autoPromotable:false};
}

export function summarizeExperienceCandidate(candidate={}){
  return{contract:"laneriq-experience-summary-v1",id:clean(candidate.id,40),domain:clean(candidate.domain,48),title:redact(candidate.title).slice(0,160),status:clean(candidate.status,24)||"candidate",risk:clean(candidate.risk,16)||"normal",evidenceCount:Array.isArray(candidate.evidence)?candidate.evidence.length:0,autoPromotable:false};
}

export function evidenceKinds(candidate={}){
  return [...new Set((Array.isArray(candidate.evidence)?candidate.evidence:[]).filter(item=>item?.passed===true).map(item=>clean(item.kind,32)).filter(Boolean))];
}
