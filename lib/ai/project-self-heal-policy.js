import { assessBuildQuality } from "../buildStandards.js";
import { assessGenerationOutcome } from "./generation-outcome-intelligence.js";
import { assessGenerationQuality } from "./generation-quality-judge.js";

const REQUIRED_CHECKS = Object.freeze([
  "broken_actions",
  "empty_pages",
  "mobile_overflow",
  "data_contracts",
  "ownership_permissions",
  "missing_routes",
  "api_failures",
  "media_integrity",
  "accessibility_basics",
  "structural_originality",
  "release_readiness"
]);

const SECRET_FIELD=/(password|passwd|secret|token|api[_-]?key|credential|private[_-]?key|auth[_-]?key)/i;
// Exact LANERIQ-owned metadata labels that contain secret-like words but are not credentials.
// Trust only the label itself; nested fields are still inspected independently and fail closed.
const TRUSTED_NON_SECRET_METADATA_PATHS=new Set([
  "security.secrets",
  "security.logging.secretsRedacted",
  "security.logging.tokensRedacted",
  "designSystem.designTokens",
]);
function list(value){return Array.isArray(value)?value:[];}
function object(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
function nameOf(value,fallback=""){return typeof value==="string"?value:String(value?.name||value?.label||value?.title||fallback);}
function planEntries(specification,id){const value=specification?.qualityPlan?.[id];return Array.isArray(value)?value.map(v=>String(v||"").trim()).filter(Boolean):typeof value==="string"&&value.trim()?[value.trim()]:[];}
function walk(value,visit,path=[]){if(value==null)return;visit(value,path);if(Array.isArray(value))value.forEach((entry,index)=>walk(entry,visit,[...path,index]));else if(typeof value==="object")Object.entries(value).forEach(([key,entry])=>walk(entry,visit,[...path,key]));}
function explicitTargetRoute(action){const a=object(action);for(const key of ["route","targetRoute","href","navigateTo"]){const value=String(a[key]||"").trim();if(value.startsWith("/"))return value;}return "";}
function qualitySummary(quality){return (quality?.dimensions||[]).filter(item=>Number(item.score||0)<Number(item.target||100)).map(item=>`${item.name} ${item.score}/${item.target}`).join(", ");}
function isTrustedNonSecretMetadataPath(path){return TRUSTED_NON_SECRET_METADATA_PATHS.has(path.map(part=>String(part)).join("."));}

export function inspectProjectSpecification(specification={}){
  const spec=object(specification),issues=[];
  const pages=list(spec.pages),features=list(spec.features),actions=list(spec.actions),navigation=list(spec.navigation),visualAssets=list(spec.visualAssets),dataModels=list(spec.dataModels);
  const routes=new Set();
  const checkResults=Object.fromEntries(REQUIRED_CHECKS.map(id=>[id,{passed:true,issues:0}]));
  const add=(check,severity,message,extra={})=>{issues.push({code:check,severity,message,...extra});checkResults[check].issues+=1;if(severity==="error")checkResults[check].passed=false;};

  // empty_pages + missing_routes
  if(!pages.length)add("empty_pages","error","Project has no customer page.");
  pages.forEach((page,index)=>{
    const pageName=nameOf(page,`Page ${index+1}`),components=list(page?.components),route=String(page?.route||"").trim();
    if(!String(page?.name||"").trim())add("empty_pages","warning",`${pageName} needs a stable page name.`,{page:index});
    if(!components.length&&!String(page?.description||page?.purpose||"").trim())add("empty_pages","warning",`${pageName} has no meaningful content.`,{page:index});
    if(!route.startsWith("/"))add("missing_routes","error",`${pageName} needs a valid route.`,{page:index});
    if(route){if(routes.has(route))add("missing_routes","error",`${pageName} duplicates route ${route}.`,{page:index});routes.add(route);}
  });
  if(pages.length&&pages.every(page=>!list(page?.components).length&&!String(page?.description||page?.purpose||"").trim()))add("empty_pages","error","All project pages are empty after normalization; a default placeholder page is not a valid build.");
  if(pages.length&&!routes.has("/"))add("missing_routes","error","Project needs a Home route (/).");
  navigation.forEach((item,index)=>{const route=String(item?.route||"").trim();if(!route.startsWith("/"))add("missing_routes","error",`Navigation item ${index+1} needs a valid route.`,{navigation:index});else if(!routes.has(route))add("missing_routes","error",`Navigation points to missing route ${route}.`,{navigation:index});});

  // broken_actions
  actions.forEach((action,index)=>{
    const label=nameOf(action,"").trim();if(!label)add("broken_actions","warning",`Action ${index+1} has no customer-visible label.`,{action:index});
    const target=explicitTargetRoute(action);if(target&&!routes.has(target))add("broken_actions","error",`${label||`Action ${index+1}`} points to missing route ${target}.`,{action:index});
  });
  if(!actions.length)add("broken_actions","info","Project has no explicit customer action plan.");

  // mobile_overflow: reject explicit impossible fixed dimensions; require responsive evidence as a warning.
  walk(spec,(value,path)=>{
    if(value&&typeof value==="object"&&!Array.isArray(value)){
      for(const key of ["minWidth","width"]){const raw=value[key];const numeric=typeof raw==="number"?raw:Number(String(raw||"").match(/^(\d+(?:\.\d+)?)px$/i)?.[1]);if(Number.isFinite(numeric)&&((key==="minWidth"&&numeric>768)||(key==="width"&&numeric>1600)))add("mobile_overflow","error",`Explicit ${key} ${numeric}px can break phone layouts.`,{path:path.join(".")});}
    }
    if(typeof value==="string"){
      for(const match of value.matchAll(/min-width\s*:\s*(\d+)px/gi))if(Number(match[1])>768)add("mobile_overflow","error",`CSS min-width ${match[1]}px can force horizontal phone overflow.`,{path:path.join(".")});
    }
  });
  const comfortText=planEntries(spec,"comfort").join(" ").toLowerCase();
  if(!/(mobile|responsive|safe-area|tap|overflow)/.test(comfortText))add("mobile_overflow","warning","Comfort plan should explicitly describe mobile/responsive overflow prevention.");

  // data_contracts
  dataModels.forEach((model,index)=>{const m=object(model),name=String(m.name||m.entity||"").trim(),fields=list(m.fields);if(!name)add("data_contracts","error",`Data model ${index+1} has no stable name.`,{dataModel:index});if(!fields.length)add("data_contracts","error",`${name||`Data model ${index+1}`} has no field contract.`,{dataModel:index});});
  for(const [entity,definition] of Object.entries(object(spec.data))){const d=object(definition);if(!entity.trim())add("data_contracts","error","Data entity has an empty name.");if("fields" in d&&!Array.isArray(d.fields))add("data_contracts","error",`${entity}.fields must be an array.`);if(Array.isArray(d.fields)&&!d.fields.length)add("data_contracts","warning",`${entity} has an empty field list.`);}
  if(features.length&&!Object.keys(object(spec.data)).length&&!dataModels.length)add("data_contracts","warning","Feature plan has no explicit data contract.");

  // ownership_permissions: generated business/schema keys remain fail-closed for credentials.
  // A few canonical LANERIQ metadata labels intentionally contain secret-like words (for example
  // MAX redaction metadata and designTokens). Allow only those exact paths, never their subtrees.
  walk(spec,(value,path)=>{const key=String(path[path.length-1]??"");if(key&&SECRET_FIELD.test(key)&&!isTrustedNonSecretMetadataPath(path))add("ownership_permissions","error",`Secret-like field/key ${key} must not be embedded in the generated specification.`,{path:path.join(".")});});
  for(const [entity,definition] of Object.entries(object(spec.data))){for(const field of list(object(definition).fields)){const fieldName=String(typeof field==="string"?field:field?.name||"").split(":")[0].trim();if(fieldName&&SECRET_FIELD.test(fieldName))add("ownership_permissions","error",`${entity}.${fieldName} looks like a credential field and must stay outside business data.`);}}
  dataModels.forEach((model,index)=>list(object(model).fields).forEach(field=>{const fieldName=String(typeof field==="string"?field:field?.name||"").split(":")[0].trim();if(fieldName&&SECRET_FIELD.test(fieldName))add("ownership_permissions","error",`Data model ${index+1}.${fieldName} looks like a credential field.`);}));

  // api_failures: external-capability plans must include explicit failure/recovery evidence.
  const projectText=JSON.stringify({features:spec.features,actions:spec.actions,data:spec.data}).toLowerCase();
  const externalIntent=/(api|webhook|payment|checkout|email|sms|whatsapp|calendar|external|upload|map|notification)/.test(projectText);
  const stabilityText=planEntries(spec,"stability").join(" ").toLowerCase();
  if(externalIntent&&!/(error|retry|timeout|fallback|fail|loading|offline|unavailable|recovery|recoverable)/.test(stabilityText))add("api_failures","warning","External-capability projects should explicitly define loading/error/timeout/retry, unavailable/offline handling, or a fallback/recovery behavior.");

  // media_integrity
  visualAssets.forEach((asset,index)=>{const a=object(asset),type=String(a.type||"").trim(),description=String(a.description||a.alt||"").trim(),url=String(a.url||a.src||"").trim();if(!type)add("media_integrity","warning",`Visual asset ${index+1} has no type.`,{asset:index});if(!description)add("media_integrity","warning",`Visual asset ${index+1} needs a meaningful description/alt direction.`,{asset:index});if(/^javascript:/i.test(url))add("media_integrity","error",`Visual asset ${index+1} uses an unsafe URL.`,{asset:index});if(/^http:\/\//i.test(url))add("media_integrity","error",`Visual asset ${index+1} must not use insecure HTTP media.`,{asset:index});});

  // accessibility_basics
  const accessibilityText=[comfortText,JSON.stringify(spec.designSystem||{}).toLowerCase(),pages.map(page=>`${page?.layout||""} ${page?.visualTreatment||""}`).join(" ").toLowerCase()].join(" ");
  if(!/(accessible|accessibility|contrast|tap|keyboard|screen reader|readable|aria|alt)/.test(accessibilityText))add("accessibility_basics","warning","Project should record explicit accessibility/readability/tap-target or contrast evidence.");
  walk(spec,(value,path)=>{if(value===false&&/^(accessible|accessibility|keyboardAccessible)$/i.test(String(path[path.length-1]||"")))add("accessibility_basics","error",`Accessibility is explicitly disabled at ${path.join(".")}.`);});

  // structural_originality: privacy-safe post-generation structure check.
  // This is an internal quality signal, not a legal originality/copyright clearance guarantee.
  const outcome=assessGenerationOutcome(spec);
  if(outcome.requiresReplan)add("structural_originality","error",`Generated structure is too close to a generic skeleton (${outcome.score}/${outcome.target}). Replan page architecture, navigation, composition and action distribution while preserving customer requirements, data/security boundaries and working functionality.`,{fingerprint:outcome.fingerprint,score:outcome.score});
  else if(outcome.genericSimilarity>=0.64)add("structural_originality","warning",`Generated structure has elevated generic-skeleton similarity (${outcome.score}/100). Prefer a more distinctive page/composition architecture when it fits the requested scope.`,{fingerprint:outcome.fingerprint,score:outcome.score});

  // Automatic Quality Judge: combines release-readiness, originality, LIUI, product completeness and security evidence.
  // For small legitimate projects, the judge can recommend optimization without forcing artificial page/feature padding.
  const judge=assessGenerationQuality(spec);
  const substantialScope=pages.length>=3||features.length>=3;
  if(judge.decision==="replan"&&substantialScope&&!outcome.requiresReplan)add("release_readiness","error",`Automatic Quality Judge requires a replan (${judge.score}/${judge.acceptScore}). Repair the weakest quality dimensions while preserving requirements, working features and security boundaries.`,{judgeScore:judge.score,judgeDecision:judge.decision});
  else if(judge.decision==="replan"&&!outcome.requiresReplan)add("release_readiness","warning",`Automatic Quality Judge recommends replan/repair (${judge.score}/${judge.acceptScore}) but the current project scope is small; improve quality without padding the product with unnecessary pages or features.`,{judgeScore:judge.score,judgeDecision:judge.decision});
  else if(judge.decision==="optimize")add("release_readiness","warning",`Automatic Quality Judge recommends optimization before release (${judge.score}/${judge.acceptScore}).`,{judgeScore:judge.score,judgeDecision:judge.decision});

  // release_readiness: deterministic score is evidence, but Production remains a separate gate.
  const quality=assessBuildQuality(spec);
  if(!quality.passed)add("release_readiness","warning",`Deterministic release quality is not yet 100: ${qualitySummary(quality)||`${quality.overall}/100`}.`);

  const errorCount=issues.filter(issue=>issue.severity==="error").length;
  const warningCount=issues.filter(issue=>issue.severity==="warning").length;
  const infoCount=issues.filter(issue=>issue.severity==="info").length;
  return {
    checks:REQUIRED_CHECKS,
    checkResults,
    issues,
    passed:errorCount===0,
    score:Math.max(0,100-(errorCount*15)-(warningCount*5)-infoCount),
    quality,
    outcome,
    judge,
  };
}

export function buildSelfHealInstruction({specification={},runtimeFindings=[]}={}){
  const staticReport=inspectProjectSpecification(specification);const findings=[...staticReport.issues,...list(runtimeFindings)].slice(0,40);
  const judgeDirectives=list(staticReport.judge?.directives);
  return [
    "AI PROJECT SELF-CHECK + SELF-HEAL CONTRACT:",
    "Inspect the generated App + Website before presenting it as ready.",
    `Required checks: ${REQUIRED_CHECKS.join(", ")}.`,
    "Fix every verified error. Address warnings when doing so does not invent functionality or weaken a working requirement.",
    `Deterministic release quality evidence: ${staticReport.quality?.overall??0}/100. A release score is evidence only; do not claim real providers/devices/stores passed without runtime proof.`,
    `Structural outcome evidence: ${staticReport.outcome?.fingerprint||"unavailable"}, score ${staticReport.outcome?.score??0}/100. This is a privacy-safe structural quality signal, not legal originality clearance.`,
    `Automatic Quality Judge: ${staticReport.judge?.score??0}/100, decision ${staticReport.judge?.decision||"unavailable"}. This is internal deterministic evidence, not Production/device/provider/store proof.`,
    staticReport.outcome?.requiresReplan?"STRUCTURAL REPLAN REQUIRED: preserve requirements, data models, security, user content and working features, but materially change page architecture, navigation model, composition patterns and action distribution. Changing only colors, copy, card radius or imagery is not sufficient.":"Structural replan is not required by the deterministic outcome gate; do not make unnecessary architecture changes.",
    staticReport.judge?.decision==="replan"?`QUALITY JUDGE REPLAN REQUIRED: ${judgeDirectives.join(" ")||"Improve the weakest quality dimensions without removing working requirements."}`:staticReport.judge?.decision==="optimize"?`QUALITY JUDGE OPTIMIZATION: ${judgeDirectives.join(" ")||"Improve quality without unnecessary architecture churn."}`:"QUALITY JUDGE: candidate is within the accept band; only fix verified issues.",
    "Fix only verified problems. Never claim a provider, upload, database mutation, payment, message delivery, store submission, video render or external API succeeded unless runtime evidence confirms it.",
    "Preserve customer content, ownership boundaries, RLS/permission intent, working workflows, visual identity and unrelated pages.",
    "For mobile, prevent horizontal overflow, clipped controls, unsafe fixed overlays and inaccessible tap targets. Preserve iPhone safe-area behavior and Android responsiveness.",
    "For broken actions/routes, repair the target or remove misleading UI rather than leaving a dead control.",
    "For data/security failures, fail closed. Never weaken ownership or expose secrets to make a test pass.",
    "Create a new recoverable version. If the repaired candidate fails validation, keep the previous known-good version active.",
    findings.length?`VERIFIED FINDINGS TO ADDRESS:\n${findings.map((item,index)=>`${index+1}. [${item.severity||"warning"}] ${item.message||item.code||"issue"}`).join("\n")}`:"VERIFIED FINDINGS: none from static inspection; perform runtime checks before making unnecessary changes."
  ].join("\n");
}
