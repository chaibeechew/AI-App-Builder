import { selectIndustryTemplateBlend } from "../industryIntelligence.js";

export const ZERO_COST_INDUSTRY_EXPANDER_VERSION=1;

function list(value){return Array.isArray(value)?value:[];}
function object(value){return value&&typeof value==="object"&&!Array.isArray(value)?value:{};}
function clean(value,max=140){return String(value||"").replace(/\s+/g," ").trim().slice(0,max);}
function slug(value,fallback="workspace"){const s=clean(value,80).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");return s||fallback;}
function title(value){return clean(value,80).replace(/(^|[\s_-])\S/g,letter=>letter.toUpperCase());}
function unique(values){return [...new Set(list(values).map(value=>clean(value,120)).filter(Boolean))];}
function normalizePage(page,index){
  const item=object(page),name=clean(item.name||`Workspace ${index+1}`,80),route=clean(item.route||(index===0?"/":`/${slug(name)}`),100);
  return {...item,id:clean(item.id||slug(name,`page-${index+1}`),80),name,route:index===0?"/":route.startsWith("/")?route:`/${slug(route)}`,purpose:clean(item.purpose||item.description||`${name} workflow`,180),description:clean(item.description||item.purpose||`${name} workflow`,220),components:list(item.components).length?item.components:["search","context actions","living cards","status and recovery"],layout:clean(item.layout||"mobile-first adaptive workspace",160),visualTreatment:clean(item.visualTreatment||"original industry-native Living Intelligence UI",180),backgroundTreatment:clean(item.backgroundTreatment||"layered accessible industry-relevant background with readable surfaces",180)};
}
function qualityPlan(existing,industry,workflow){
  const current=object(existing),flow=unique(workflow).slice(0,5).join(" → ")||"intent → action → confirmation → follow-up";
  const defaults={
    stability:["Loading, empty, error, timeout and retry states are explicit for every primary workflow.","Weak-network and interrupted mobile sessions preserve safe local progress and recover without duplicate submissions.","Validation and idempotent actions prevent accidental duplicate records while keeping the customer journey recoverable."],
    security:["Authentication, ownership, role authorization and server-side validation remain fail-closed for private data and mutations.","Secrets and service credentials stay server-only; browser-visible configuration is non-sensitive and least-privilege.","Rate limits, bounded inputs and audit-friendly action boundaries protect high-risk operations without inventing connected-provider success."],
    privacy:["Private business/customer records default to the minimum audience with explicit sharing controls.","Collect only data needed for the requested workflow, with clear purpose and deletion/export paths where applicable.","Camera, microphone, location, contacts and other sensitive permissions remain user-triggered and denial-safe."],
    comfort:["Mobile-first safe-area layouts, 44px+ touch targets and responsive information density support phones before desktop expansion.","Readable contrast, keyboard and screen-reader semantics, reduced-motion preferences and non-audio feedback are part of the default UI.","Primary actions stay context-local so users do not need to hunt through menus to complete common tasks."],
    beauty:[`Use an original ${industry} visual identity rather than a generic CRM skin or copied commercial interface.`,`Coordinate typography, imagery, cards, spacing, motion and backgrounds as one adaptive design system.`,`Use industry-relevant visual storytelling while keeping important data and calls to action readable on small screens.`],
    naturalness:[`Model the real ${industry} workflow as ${flow}.`,`Use human-readable domain terms and role-aware actions instead of generic placeholder labels.`,`Confirm consequential actions, surface the next useful step and preserve understandable recovery paths.`],
  };
  return Object.fromEntries(Object.entries(defaults).map(([key,values])=>[key,list(current[key]).length>=3?current[key]:values]));
}
function buildIndustryPages(existingPages,blend){
  const current=list(existingPages).map(normalizePage);
  const existingNames=new Set(current.map(page=>page.name.toLowerCase()));
  const candidates=[...unique(blend.entities).slice(0,4).map(title),...unique(blend.workflow).slice(0,3).map(step=>title(`${step} Flow`))];
  const additions=[];
  for(const name of candidates){if(!name||existingNames.has(name.toLowerCase()))continue;existingNames.add(name.toLowerCase());additions.push(normalizePage({name,purpose:`Manage ${name.toLowerCase()} for the ${blend.industry} workflow`,components:["search and filters","adaptive living cards","primary context action","loading empty error retry states"]},current.length+additions.length));if(current.length+additions.length>=7)break;}
  const rows=current.length?current:[normalizePage({name:"Home",route:"/",purpose:`${blend.industry} command centre`,components:["intent hero","priority actions","recent activity","adaptive recommendations"]},0)];
  const merged=[...rows,...additions].slice(0,8).map((page,index)=>normalizePage(page,index));
  if(!merged.some(page=>page.route==="/")){merged[0]={...merged[0],route:"/"};}
  return merged;
}
function buildIndustryFeatures(existing,blend){
  const rows=list(existing).map(item=>typeof item==="string"?{name:item,description:`${item} workflow`,uiPattern:"adaptive action flow"}:{...item});
  const names=new Set(rows.map(item=>clean(item.name,100).toLowerCase()));
  for(const step of unique(blend.workflow).slice(0,7)){
    const name=title(step);if(!name||names.has(name.toLowerCase()))continue;names.add(name.toLowerCase());rows.push({name,description:`Industry-native ${blend.industry} step: ${step}, with clear states, ownership and follow-up.`,uiPattern:"intent-first living workflow"});
  }
  for(const archetype of unique(blend.archetypeIds).slice(0,3)){
    const name=title(`${archetype} workspace`);if(names.has(name.toLowerCase()))continue;names.add(name.toLowerCase());rows.push({name,description:`${blend.industry} ${archetype} capability adapted to the customer's stated workflow.`,uiPattern:"adaptive bento workspace"});
  }
  return rows.slice(0,12);
}
function buildIndustryData(existing,entities){
  const data={...object(existing)};
  for(const entity of unique(entities).slice(0,6)){
    const key=title(entity).replace(/[^A-Za-z0-9]/g,"")||"Record";
    if(data[key])continue;
    data[key]={fields:["name","status","owner_id","notes","created_at","updated_at"]};
  }
  return data;
}
function buildActions(existing,workflow){
  const rows=list(existing).map(item=>typeof item==="string"?{name:item,description:item}:{...item});
  const names=new Set(rows.map(item=>clean(item.name,100).toLowerCase()));
  for(const step of unique(workflow).slice(0,5)){
    const name=title(step);if(!name||names.has(name.toLowerCase()))continue;names.add(name.toLowerCase());rows.push({name,description:`Start or continue the ${step} step with validation, confirmation and recovery.`});
  }
  return rows.slice(0,10);
}

export function expandZeroCostIndustrySpecification(specification={},idea="",options={}){
  const base=object(specification);
  const blend=selectIndustryTemplateBlend(idea,{limit:6,variantKey:`zero-cost-local-v1-${Math.max(0,Number(options.variationIndex)||0)}`});
  if(!blend.industry||blend.confidence<=0)return {...base,zeroCostIndustryIntelligence:{version:ZERO_COST_INDUSTRY_EXPANDER_VERSION,matched:false}};
  const pages=buildIndustryPages(base.pages,blend);
  const features=buildIndustryFeatures(base.features,blend);
  const data=buildIndustryData(base.data,blend.entities);
  const actions=buildActions(base.actions,blend.workflow);
  const design=object(base.designSystem);
  const templateSignals=blend.templates.map(item=>`${item.archetype}/${item.style}`).slice(0,6);
  return {
    ...base,
    industry:{...object(base.industry),name:blend.industry,category:blend.industry,confidence:Math.max(Number(base?.industry?.confidence)||0,blend.confidence)},
    designSystem:{...design,backgroundDirection:clean(design.backgroundDirection||`Original ${blend.industry} environment with adaptive depth and readable content surfaces`,200),heroDirection:clean(design.heroDirection||`Intent-first ${blend.industry} hero focused on the customer's highest-value workflow`,200),layoutSignature:clean(design.layoutSignature||`Adaptive Bento ${blend.archetypeIds.slice(0,2).join(" + ")||"service"} workspace`,160),cardStyle:clean(design.cardStyle||"Living Cards with context-local actions and restrained depth",160),imageStyle:clean(design.imageStyle||`Original ${blend.industry} people, places, products or service-action imagery`,160),motionDirection:clean(design.motionDirection||"Semantic motion with reduced-motion fallback and no decorative blocking transitions",160)},
    templateStrategy:{...object(base.templateStrategy),matchedPatterns:unique([...(list(base?.templateStrategy?.matchedPatterns)),...templateSignals]),innovation:clean(`Zero-cost LANERIQ Industry Intelligence adapts ${blend.industry} entities, workflow, archetypes and varied template inspiration into an original product structure; no source template is copied.`,320)},
    qualityPlan:qualityPlan(base.qualityPlan,blend.industry,blend.workflow),
    pages,
    features,
    data,
    actions,
    navigation:pages.map(page=>({label:page.name,route:page.route})),
    zeroCostIndustryIntelligence:{version:ZERO_COST_INDUSTRY_EXPANDER_VERSION,matched:true,industry:blend.industry,confidence:Number(blend.confidence.toFixed(2)),archetypes:blend.archetypeIds.slice(0,6),entityCount:blend.entities.length,workflowCount:blend.workflow.length,inspirationCount:blend.templates.length,originalityMode:"inspiration-only",directCopyAllowed:false},
  };
}

export const ZERO_COST_INDUSTRY_EXPANDER_POLICY=Object.freeze({version:ZERO_COST_INDUSTRY_EXPANDER_VERSION,catalogIndustries:50,usesExistingIndustryIntelligence:true,templateUse:"inspiration-only",directCopyAllowed:false,paidProviderRequired:false,paidEmbeddingRequired:false,vectorDatabaseRequired:false,dedicatedServerRequired:false});
