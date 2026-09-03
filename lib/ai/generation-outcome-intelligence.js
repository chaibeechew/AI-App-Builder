import crypto from "node:crypto";

const OUTCOME_SCHEMA_VERSION=1;
const REPLAN_SCORE=70;

const GENERIC_REFERENCE_TOKEN_SETS=Object.freeze([
  Object.freeze({
    id:"dashboard-crud",
    tokens:Object.freeze(["pages:medium","route:home","route:dashboard","route:list","route:detail","route:edit","component:card","component:table","component:form","action:create","action:update","action:delete","data:present","nav:medium"]),
  }),
  Object.freeze({
    id:"admin-saas",
    tokens:Object.freeze(["pages:medium","route:home","route:dashboard","route:list","route:settings","component:card","component:table","component:form","component:tabs","action:create","action:update","action:navigate","data:present","nav:medium"]),
  }),
  Object.freeze({
    id:"catalog-detail-form",
    tokens:Object.freeze(["pages:medium","route:home","route:list","route:detail","route:edit","component:card","component:list","component:form","action:create","action:update","action:navigate","data:present","nav:medium"]),
  }),
]);

function list(value){return Array.isArray(value)?value:[];}
function object(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
function countBy(values){const counts={};for(const value of values){const key=String(value||"other");counts[key]=(counts[key]||0)+1;}return Object.fromEntries(Object.entries(counts).sort(([a],[b])=>a.localeCompare(b)));}
function bucket(value,{small=2,medium=5}={}){const n=Number(value||0);return n<=small?"small":n<=medium?"medium":"large";}
function safeText(...values){return values.filter(value=>typeof value==="string"||typeof value==="number").map(value=>String(value)).join(" ").toLowerCase().slice(0,1200);}
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));return value;}
function stableJson(value){return JSON.stringify(stable(value));}
function sha256(value){return crypto.createHash("sha256").update(value).digest("hex");}

function classifyRoute(route){
  const value=String(route||"").trim().toLowerCase().split(/[?#]/)[0];
  if(value==="/"||value==="/home")return"home";
  if(/\/(login|signin|sign-in|signup|sign-up|auth|verify)(\/|$)/.test(value))return"auth";
  if(/\/(dashboard|overview|workspace|command)(\/|$)/.test(value))return"dashboard";
  if(/\/(analytics|reports?|insights|metrics)(\/|$)/.test(value))return"analytics";
  if(/\/(settings|preferences|account|profile)(\/|$)/.test(value))return"settings";
  if(/\/(calendar|schedule)(\/|$)/.test(value))return"calendar";
  if(/\/(book|booking|reservation|appointment)(\/|$)/.test(value))return"booking";
  if(/\/(community|feed|forum|members|social)(\/|$)/.test(value))return"community";
  if(/\/(search|discover|explore)(\/|$)/.test(value))return"search";
  if(/\/(checkout|cart|payment)(\/|$)/.test(value))return"checkout";
  if(/\/(new|create|add|edit|update)(\/|$)/.test(value))return"edit";
  const segments=value.split("/").filter(Boolean);
  if(segments.some(segment=>/^[:\[]/.test(segment)||/^(detail|view)$/.test(segment)))return"detail";
  if(segments.length>=2&&/^[0-9a-f-]{6,}$/i.test(segments.at(-1)||""))return"detail";
  if(segments.length===1)return"list";
  return"custom";
}

function classifyComponent(component){
  const c=object(component);
  const text=safeText(c.type,c.kind,c.role,c.pattern,c.component,c.layout,c.name);
  const rules=[
    ["hero",/hero|masthead|banner/],["command",/command|copilot|assistant|ai[- ]?input/],["chart",/chart|graph|metric|kpi|analytics/],["map",/map|location|geo/],["calendar",/calendar|schedule|date[- ]?picker/],["chat",/chat|message|conversation/],["search",/search|combobox/],["filter",/filter|facet/],["table",/table|data[- ]?grid/],["kanban",/kanban|board/],["timeline",/timeline|activity|history/],["gallery",/gallery|carousel|masonry/],["media",/video|audio|image|media/],["form",/form|input|editor|field/],["tabs",/tabs?|segmented/],["modal",/modal|dialog|sheet|drawer/],["list",/list|directory|results/],["card",/card|tile|panel|bento/],["auth",/login|signin|signup|auth/],
  ];
  for(const [id,pattern] of rules)if(pattern.test(text))return id;
  return"custom";
}

function classifyAction(action){
  const a=object(action);
  const text=typeof action==="string"?safeText(action):safeText(a.type,a.action,a.intent,a.name,a.label,a.description);
  const rules=[
    ["delete",/delete|remove|archive/],["create",/create|add|new|submit|save new/],["update",/update|edit|change|save|modify/],["search",/search|find|lookup/],["filter",/filter|sort|refine/],["book",/book|reserve|appointment|schedule/],["pay",/pay|checkout|purchase|subscribe/],["message",/message|chat|contact|send/],["upload",/upload|attach|import/],["share",/share|invite/],["export",/export|download/],["approve",/approve|review|accept|reject/],["navigate",/open|view|go|navigate|back|next/],
  ];
  for(const [id,pattern] of rules)if(pattern.test(text))return id;
  return"other";
}

function relationshipHint(field){
  const f=object(field);const text=typeof field==="string"?String(field).toLowerCase():safeText(f.type,f.kind,f.relation,f.reference,f.references);
  return /(relation|reference|foreign|belongs|hasmany|has_many|uuid.*id|_id\b)/.test(text);
}

export function buildGenerationOutcomeDescriptor(specification={}){
  const spec=object(specification),pages=list(spec.pages),actions=list(spec.actions),navigation=list(spec.navigation),dataModels=list(spec.dataModels);
  const fallbackData=Object.values(object(spec.data));
  const models=dataModels.length?dataModels:fallbackData;
  const pageProfiles=pages.map(page=>{
    const components=list(object(page).components).map(classifyComponent);
    return {routeClass:classifyRoute(object(page).route),componentCount:components.length,componentKinds:countBy(components)};
  });
  const routeClasses=pageProfiles.map(page=>page.routeClass);
  const componentKinds=pageProfiles.flatMap(page=>Object.entries(page.componentKinds).flatMap(([kind,count])=>Array(Number(count||0)).fill(kind)));
  const actionKinds=actions.map(classifyAction);
  const fieldCounts=models.map(model=>list(object(model).fields).length).sort((a,b)=>a-b);
  const relationshipHints=models.reduce((sum,model)=>sum+list(object(model).fields).filter(relationshipHint).length,0);
  const navRouteClasses=navigation.map(item=>classifyRoute(object(item).route));
  const liui=object(spec.liui),design=object(spec.designSystem);
  return stable({
    schemaVersion:OUTCOME_SCHEMA_VERSION,
    structure:{
      pageCount:pages.length,
      pageCountBucket:bucket(pages.length),
      routeClassCounts:countBy(routeClasses),
      routeClassSequence:routeClasses,
      uniqueRouteClasses:new Set(routeClasses).size,
      totalComponents:componentKinds.length,
      componentDensityBucket:bucket(pages.length?componentKinds.length/pages.length:0,{small:2,medium:5}),
      componentKindCounts:countBy(componentKinds),
      uniqueComponentKinds:new Set(componentKinds).size,
      actionKindCounts:countBy(actionKinds),
      uniqueActionKinds:new Set(actionKinds).size,
      navigationCount:navigation.length,
      navigationBucket:bucket(navigation.length),
      navigationRouteClassCounts:countBy(navRouteClasses),
    },
    data:{
      modelCount:models.length,
      modelCountBucket:bucket(models.length,{small:1,medium:4}),
      fieldCountProfile:fieldCounts,
      totalFields:fieldCounts.reduce((sum,value)=>sum+value,0),
      relationshipHintCount:relationshipHints,
      relationshipDensityBucket:bucket(relationshipHints,{small:0,medium:3}),
    },
    experience:{
      hasHero:componentKinds.includes("hero"),
      hasCommandLayer:componentKinds.includes("command"),
      hasAnalytics:componentKinds.includes("chart")||routeClasses.includes("analytics"),
      hasSpatial:componentKinds.includes("map"),
      hasConversation:componentKinds.includes("chat"),
      hasTemporal:componentKinds.includes("calendar")||routeClasses.includes("calendar"),
      liuiSignalCount:Object.keys(liui).length,
      designEvidenceCount:["backgroundDirection","heroDirection","layoutSignature","themeMode","cardStyle","imageStyle","wallpaperPreset"].filter(key=>String(design[key]||"").trim()).length,
    },
  });
}

export function buildGenerationOutcomeFingerprint(specificationOrDescriptor={}){
  const descriptor=specificationOrDescriptor?.schemaVersion===OUTCOME_SCHEMA_VERSION&&specificationOrDescriptor?.structure?stable(specificationOrDescriptor):buildGenerationOutcomeDescriptor(specificationOrDescriptor);
  return `gof1-${sha256(stableJson(descriptor)).slice(0,16)}`;
}

function descriptorTokens(descriptor){
  const d=descriptor?.structure?descriptor:buildGenerationOutcomeDescriptor(descriptor);
  const tokens=new Set();
  tokens.add(`pages:${d.structure.pageCountBucket}`);
  tokens.add(`nav:${d.structure.navigationBucket}`);
  if(d.data.modelCount>0)tokens.add("data:present");
  for(const key of Object.keys(d.structure.routeClassCounts||{}))tokens.add(`route:${key}`);
  for(const key of Object.keys(d.structure.componentKindCounts||{}))tokens.add(`component:${key}`);
  for(const key of Object.keys(d.structure.actionKindCounts||{}))tokens.add(`action:${key}`);
  if(d.experience.hasCommandLayer)tokens.add("experience:command");
  if(d.experience.hasSpatial)tokens.add("experience:spatial");
  if(d.experience.hasConversation)tokens.add("experience:conversation");
  if(d.experience.hasTemporal)tokens.add("experience:temporal");
  return tokens;
}
function jaccard(a,b){const union=new Set([...a,...b]);if(!union.size)return 0;let intersection=0;for(const value of a)if(b.has(value))intersection+=1;return intersection/union.size;}
function dominantShare(counts){const values=Object.values(counts||{}).map(Number);const total=values.reduce((sum,value)=>sum+value,0);return total?Math.max(...values)/total:0;}

export function assessGenerationOutcome(specification={},options={}){
  const descriptor=buildGenerationOutcomeDescriptor(specification),tokens=descriptorTokens(descriptor);
  const additional=list(options.referenceDescriptors).map((reference,index)=>({id:`local-reference-${index+1}`,tokens:[...descriptorTokens(reference)]}));
  const references=[...GENERIC_REFERENCE_TOKEN_SETS,...additional].map(reference=>({id:reference.id,similarity:jaccard(tokens,new Set(reference.tokens))})).sort((a,b)=>b.similarity-a.similarity||a.id.localeCompare(b.id));
  const closest=references[0]||{id:"none",similarity:0};
  const pageCount=descriptor.structure.pageCount,routeVariety=descriptor.structure.uniqueRouteClasses,componentVariety=descriptor.structure.uniqueComponentKinds,actionVariety=descriptor.structure.uniqueActionKinds;
  let penalty=Math.round(closest.similarity*52);
  const componentDominance=dominantShare(descriptor.structure.componentKindCounts);
  if(pageCount>=4&&routeVariety<=2)penalty+=10;
  if(descriptor.structure.totalComponents>=8&&componentDominance>=0.7)penalty+=10;
  if(pageCount>=4&&actionVariety<=1)penalty+=7;
  if(pageCount>=5&&componentVariety>=6&&routeVariety>=4)penalty-=8;
  if(descriptor.experience.hasCommandLayer||descriptor.experience.hasSpatial||descriptor.experience.hasConversation||descriptor.experience.hasTemporal)penalty-=4;
  const score=Math.max(0,Math.min(100,100-penalty));
  const requiresReplan=pageCount>=3&&closest.similarity>=0.68&&score<REPLAN_SCORE;
  const reasons=[];
  if(closest.similarity>=0.68)reasons.push(`High structural similarity to LANERIQ generic reference ${closest.id}.`);
  if(pageCount>=4&&routeVariety<=2)reasons.push("Page architecture has low route-role variety.");
  if(descriptor.structure.totalComponents>=8&&componentDominance>=0.7)reasons.push("One component family dominates the generated composition.");
  if(pageCount>=4&&actionVariety<=1)reasons.push("Customer action architecture has low variety.");
  if(!reasons.length)reasons.push("No strong generic-skeleton signal detected by the deterministic structural gate.");
  return Object.freeze({
    fingerprint:buildGenerationOutcomeFingerprint(descriptor),
    score,
    target:REPLAN_SCORE,
    passed:!requiresReplan,
    requiresReplan,
    closestGenericReference:closest.id,
    genericSimilarity:Number(closest.similarity.toFixed(3)),
    routeVariety,
    componentVariety,
    actionVariety,
    privacySafe:true,
    storesRawUserText:false,
    legalOriginalityGuarantee:false,
    methodology:"laneriq-structural-outcome-gate-v1-deterministic-no-embeddings",
    reasons:Object.freeze(reasons),
    descriptor,
  });
}

export const GENERATION_OUTCOME_INTELLIGENCE_POLICY=Object.freeze({
  schemaVersion:OUTCOME_SCHEMA_VERSION,
  replanScore:REPLAN_SCORE,
  zeroPaidEmbeddingDependency:true,
  privacySafeStructuralOnly:true,
  referenceMode:"laneriq-owned-generic-structural-skeletons",
  evidenceBoundary:"Structural originality risk score is an internal quality signal, not a copyright/trade-dress/legal clearance guarantee.",
});
