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
  "release_readiness"
]);

function list(value){return Array.isArray(value)?value:[];}
function nameOf(value,fallback=""){return typeof value==="string"?value:String(value?.name||value?.label||value?.title||fallback);}

export function inspectProjectSpecification(specification={}){
  const issues=[];const pages=list(specification.pages);const features=list(specification.features);const actions=list(specification.actions);const navigation=list(specification.navigation);
  if(!pages.length)issues.push({code:"empty_pages",severity:"error",message:"Project has no customer page."});
  pages.forEach((page,index)=>{
    const pageName=nameOf(page,`Page ${index+1}`);const components=list(page?.components);
    if(!String(page?.name||"").trim())issues.push({code:"page_name",severity:"warning",page:index,message:`${pageName} needs a stable page name.`});
    if(!components.length&&!String(page?.description||page?.purpose||"").trim())issues.push({code:"empty_page",severity:"warning",page:index,message:`${pageName} has no meaningful content.`});
    if(!String(page?.route||"").startsWith("/"))issues.push({code:"missing_route",severity:"error",page:index,message:`${pageName} needs a valid route.`});
  });
  const routes=new Set(pages.map(page=>String(page?.route||"")));navigation.forEach((item,index)=>{const route=String(item?.route||"");if(route&&!routes.has(route))issues.push({code:"navigation_route",severity:"error",navigation:index,message:`Navigation points to missing route ${route}.`})});
  if(!features.length)issues.push({code:"feature_depth",severity:"warning",message:"Project has no explicit customer feature plan."});
  if(!actions.length)issues.push({code:"action_depth",severity:"info",message:"Project has no explicit customer action plan."});
  const design=specification?.designSystem||{};if(!design.primaryColor||!design.backgroundColor)issues.push({code:"design_system",severity:"warning",message:"Project visual system is incomplete."});
  return {checks:REQUIRED_CHECKS,issues,passed:!issues.some(issue=>issue.severity==="error"),score:Math.max(0,100-issues.reduce((sum,issue)=>sum+(issue.severity==="error"?15:issue.severity==="warning"?5:1),0))};
}

export function buildSelfHealInstruction({specification={},runtimeFindings=[]}={}){
  const staticReport=inspectProjectSpecification(specification);const findings=[...staticReport.issues,...list(runtimeFindings)].slice(0,40);
  return [
    "AI PROJECT SELF-CHECK + SELF-HEAL CONTRACT:",
    "Inspect the generated App + Website before presenting it as ready.",
    `Required checks: ${REQUIRED_CHECKS.join(", ")}.`,
    "Fix only verified problems. Never claim a provider, upload, database mutation, payment, message delivery, store submission, video render or external API succeeded unless runtime evidence confirms it.",
    "Preserve customer content, ownership boundaries, RLS/permission intent, working workflows, visual identity and unrelated pages.",
    "For mobile, prevent horizontal overflow, clipped controls, unsafe fixed overlays and inaccessible tap targets. Preserve iPhone safe-area behavior and Android responsiveness.",
    "For broken actions/routes, repair the target or remove misleading UI rather than leaving a dead control.",
    "For data/security failures, fail closed. Never weaken ownership or expose secrets to make a test pass.",
    "Create a new recoverable version. If the repaired candidate fails validation, keep the previous known-good version active.",
    findings.length?`VERIFIED FINDINGS TO ADDRESS:\n${findings.map((item,index)=>`${index+1}. [${item.severity||"warning"}] ${item.message||item.code||"issue"}`).join("\n")}`:"VERIFIED FINDINGS: none from static inspection; perform runtime checks before making unnecessary changes."
  ].join("\n");
}
