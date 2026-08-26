import { normalizeAppSpec, safeArray, safeObject, safeText } from "../lib/generator/runtime-guard.js";

function slugify(value="page"){return safeText(value,"page").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"page";}
function createPage(page,index){const p=safeObject(page);const components=safeArray(p.components);return{id:`${slugify(p.name)}-${index+1}`,name:safeText(p.name,`Page ${index+1}`),purpose:safeText(p.purpose||p.description),route:p.route||`/${slugify(p.name)}`,components:components.length?components:[{type:"header",title:safeText(p.name,`Page ${index+1}`)},{type:"content",description:safeText(p.purpose||p.description)}]};}
function createFeature(feature,index){const f=typeof feature==="string"?{name:feature}:safeObject(feature);return{id:`${slugify(f.name||f.title)}-${index+1}`,name:safeText(f.name||f.title,`Feature ${index+1}`),description:safeText(f.description),enabled:true};}
function createDataModel(data,index){const d=safeObject(data);return{id:`${slugify(d.name)}-${index+1}`,name:safeText(d.name,`Data ${index+1}`),fields:safeArray(d.fields)};}
function createAction(action,index){const a=typeof action==="string"?{name:action}:safeObject(action);return{id:`${slugify(a.name||a.label)}-${index+1}`,name:safeText(a.name||a.label,`Action ${index+1}`),description:safeText(a.description)};}

export async function createPreview({idea,specification}){
  const normalized=normalizeAppSpec(specification||{});
  const pages=normalized.pages.map(createPage);
  const features=normalized.features.map(createFeature);
  const data=safeArray(normalized.data).map(createDataModel);
  const actions=normalized.actions.map(createAction);
  const appName=safeText(normalized.name,idea||"AI Generated App");
  return {id:`app-${Date.now()}`,name:appName,description:safeText(normalized.description),idea,status:"preview",pages,features,data,actions,navigation:pages.map(p=>({id:p.id,label:p.name,route:p.route})),createdAt:new Date().toISOString(),metadata:{generatedBy:"Autonomous AI Engine",version:"2.0",runtimeGuarded:true},runtime:{crashSafe:true,fallbackPage:true,interactiveActions:true}};
}
